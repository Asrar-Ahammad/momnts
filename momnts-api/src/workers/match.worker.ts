import { Worker, Job } from 'bullmq'
import { redis } from '../lib/redis.js'
import { prisma } from '../lib/prisma.js'
import { publishFaceMatched } from '../lib/publisher.js'

interface MatchJobData {
  userId: string
  eventId: string
  /**
   * ISO timestamp. When present (selfie UPDATE flow), only FaceProfiles
   * created AFTER this timestamp are considered for matching.
   * Already-claimed profiles are never touched regardless.
   */
  matchOnlyAfter?: string
}


/**
 * Background worker to match a specific user's selfie against
 * detected faces in an event.
 */
const matchWorker = new Worker(
  'face-matching',
  async (job: Job<MatchJobData>) => {
    const { userId, eventId, matchOnlyAfter } = job.data
    console.log(`[MATCH] Processing user ${userId} in event ${eventId}${matchOnlyAfter ? ` (after ${matchOnlyAfter})` : ''}`)

    try {
      // 1. Verify user has a selfie embedding
      const userCheck = await prisma.$queryRaw<any[]>`
        SELECT id FROM "User"
        WHERE id = ${userId} AND selfie_embedding IS NOT NULL
      `
      if (!userCheck.length) {
        console.log(`[MATCH] No selfie embedding for user ${userId}. Skipping.`)
        return
      }

      // 2. Use pgvector native <=> (cosine distance) to compare
      //    distance = 1 - similarity, so threshold 0.55 → max distance 0.45
      const MATCH_THRESHOLD = 0.55
      const MAX_DISTANCE = 1 - MATCH_THRESHOLD // 0.45

      // Fetch ALL unclaimed profiles with their distance to user's selfie
      // so we can log everything for debugging
      const candidates = matchOnlyAfter
        ? await prisma.$queryRaw<Array<{ id: string; distance: number }>>`
            SELECT fp.id,
                   fp.embedding_vector <=> (SELECT selfie_embedding FROM "User" WHERE id = ${userId}) AS distance
            FROM "FaceProfile" fp
            WHERE fp.event_id = ${eventId}
              AND fp.is_claimed = false
              AND fp.created_at > ${new Date(matchOnlyAfter)}
            ORDER BY distance ASC
          `
        : await prisma.$queryRaw<Array<{ id: string; distance: number }>>`
            SELECT fp.id,
                   fp.embedding_vector <=> (SELECT selfie_embedding FROM "User" WHERE id = ${userId}) AS distance
            FROM "FaceProfile" fp
            WHERE fp.event_id = ${eventId}
              AND fp.is_claimed = false
            ORDER BY distance ASC
          `

      console.log(`[MATCH] Found ${candidates.length} unclaimed profile(s) in event ${eventId}`)

      if (!candidates.length) {
        console.log(`[MATCH] No unclaimed profiles to match against.`)
        return
      }

      // Log ALL distances for debugging
      for (const c of candidates) {
        const similarity = (1 - Number(c.distance)).toFixed(4)
        console.log(`[MATCH]   Profile ${c.id}: distance=${Number(c.distance).toFixed(4)}, similarity=${similarity}`)
      }

      // 3. Filter profiles within threshold
      const matchedIds = candidates
        .filter(c => Number(c.distance) <= MAX_DISTANCE)
        .map(c => c.id)

      // 4. Claim matched profiles
      if (matchedIds.length > 0) {
        const result = await prisma.faceProfile.updateMany({
          where: {
            id: { in: matchedIds },
            is_claimed: false, // Guard: only claim if still unclaimed (prevents race condition)
          },
          data: {
            claimed_by: userId,
            is_claimed: true
          }
        })
        console.log(`[MATCH] Claimed ${result.count}/${matchedIds.length} profiles (rest were already claimed)`)

        const matchedPhotos = await prisma.photoFace.findMany({
          where: { face_profile_id: { in: matchedIds } },
          select: { photo_id: true },
          distinct: ['photo_id'],
        })

        await publishFaceMatched({
          eventId,
          userId,
          matchedPhotoCount: matchedPhotos.length,
          matchedProfileIds: matchedIds,
        })

        console.log(`[MATCH] ✓ Claimed ${matchedIds.length} profile(s) → ${matchedPhotos.length} photo(s) for user ${userId}`)
      } else {
        console.log(`[MATCH] ✗ No profiles above threshold ${MATCH_THRESHOLD} for user ${userId}`)
      }

    } catch (error) {
      console.error(`[MATCH] Job failed for user ${userId}:`, error)
      throw error
    }
  },
  {
    connection: redis,
    concurrency: 3
  }
)

matchWorker.on('completed', (job) => {
  console.log(`Face-matching job ${job.id} completed`)
})

matchWorker.on('failed', (job, err) => {
  console.error(`Face-matching job ${job?.id} failed with error: ${err.message}`)
})

export default matchWorker
