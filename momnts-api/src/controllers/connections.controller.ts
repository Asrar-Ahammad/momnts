import type { Response } from "express";
import { prisma } from "../lib/prisma.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";

/**
 * @name getWhoWasIWithController
 * @description Returns a list of other face profiles that co-occur in photos
 * with the authenticated user, sorted by number of shared photos.
 * @route GET /events/:eventId/connections
 * @access Private
 */
async function getWhoWasIWithController(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const eventId = req.params.eventId as string;

    // Check event access
    const eventAccess = await prisma.eventAccess.findUnique({
      where: {
        event_id_user_id: { event_id: eventId, user_id: req.user.id },
      },
    });

    if (!eventAccess) {
      return res
        .status(403)
        .json({ message: "You do not have access to this event" });
    }

    // Find ALL of user's FaceProfiles for this event (can have multiple clusters)
    const faceProfiles = await prisma.faceProfile.findMany({
      where: { event_id: eventId, claimed_by: req.user.id },
    });

    if (faceProfiles.length === 0) {
      return res.status(200).json({
        data: [],
        message: "No photos of you found in this event yet.",
        prompt:
          "Make sure your selfie is uploaded and photos have been processed.",
      });
    }

    const userFaceProfileIds = faceProfiles.map((fp) => fp.id);

    // Co-occurrence query: find all other face profiles that appear in the same photos
    // Grouped by claimed user (claimed_by) if claimed, otherwise by face profile id
    const results = await prisma.$queryRaw<
      {
        face_profile_id: string;
        claimed_by: string | null;
        is_claimed: boolean;
        user_name: string | null;
        user_id: string | null;
        selfie_url: string | null;
        shared_photo_count: bigint;
      }[]
    >`
      SELECT
        MIN(fp.id) as face_profile_id,
        fp.claimed_by,
        fp.is_claimed,
        u.name as user_name,
        u.id as user_id,
        u.selfie_url,
        COUNT(DISTINCT pf2.photo_id) as shared_photo_count
      FROM "PhotoFace" pf1
      JOIN "PhotoFace" pf2
        ON pf1.photo_id = pf2.photo_id
        AND pf2.face_profile_id != pf1.face_profile_id
      JOIN "FaceProfile" fp
        ON fp.id = pf2.face_profile_id
      LEFT JOIN "User" u
        ON u.id = fp.claimed_by
      WHERE pf1.face_profile_id = ANY(${userFaceProfileIds}::text[])
        AND NOT (pf2.face_profile_id = ANY(${userFaceProfileIds}::text[]))
      GROUP BY COALESCE(fp.claimed_by, fp.id), fp.claimed_by, fp.is_claimed, u.name, u.id, u.selfie_url
      ORDER BY shared_photo_count DESC
      LIMIT 50
    `;

    const mappedResults = results.map((r) => ({
      face_profile_id: r.face_profile_id,
      shared_photo_count: Number(r.shared_photo_count),
      is_claimed: r.is_claimed,
      person: {
        user_id: r.user_id ?? null,
        name: r.user_name ?? "Unknown Person",
        selfie_url: r.selfie_url ?? null,
        is_you: false,
      },
    }));

    return res.status(200).json({
      total_people: mappedResults.length,
      data: mappedResults,
      your_face_profile_ids: userFaceProfileIds,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return res.status(500).json({ message });
  }
}

/**
 * @name getSharedPhotosController
 * @description Returns all photos where both the current user and the specified
 * face profile appear together.
 * @route GET /events/:eventId/connections/:faceProfileId/photos
 * @access Private
 */
async function getSharedPhotosController(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const eventId = req.params.eventId as string;
    const faceProfileId = req.params.faceProfileId as string;

    // Check event access
    const eventAccess = await prisma.eventAccess.findUnique({
      where: {
        event_id_user_id: { event_id: eventId, user_id: req.user.id },
      },
    });

    if (!eventAccess) {
      return res
        .status(403)
        .json({ message: "You do not have access to this event" });
    }

    // Find ALL of user's FaceProfiles for this event
    const userFaceProfiles = await prisma.faceProfile.findMany({
      where: { event_id: eventId, claimed_by: req.user.id },
    });

    if (userFaceProfiles.length === 0) {
      return res.status(404).json({
        message: "No face profile found for you in this event",
      });
    }

    const userFaceProfileIds = userFaceProfiles.map((fp) => fp.id);

    // Fetch other person's info
    const otherProfile = await prisma.faceProfile.findUnique({
      where: { id: faceProfileId },
      include: { claimed: { select: { id: true, name: true, selfie_url: true } } },
    });

    if (!otherProfile) {
      return res.status(404).json({
        message: "Face profile not found",
      });
    }

    // Find all face profiles claimed by the other user (if claimed), otherwise just this profile
    let otherFaceProfileIds: string[] = [faceProfileId];
    if (otherProfile.claimed_by) {
      const otherClaimedProfiles = await prisma.faceProfile.findMany({
        where: { event_id: eventId, claimed_by: otherProfile.claimed_by },
        select: { id: true },
      });
      otherFaceProfileIds = otherClaimedProfiles.map((fp) => fp.id);
    }

    // Find shared photos via self-join on PhotoFace
    // Uses ANY() to match against ALL user profiles on both sides
    const photos = await prisma.$queryRaw<
      {
        id: string;
        thumb_url: string;
        display_url: string;
        original_url: string;
        uploaded_at: Date;
        is_visible: boolean;
        uploader_name: string;
        width: number | null;
        height: number | null;
        is_favourited: boolean;
      }[]
    >`
      SELECT DISTINCT
        p.id,
        p.thumb_url,
        p.display_url,
        p.original_url,
        p.uploaded_at,
        p.is_visible,
        u.name as uploader_name,
        p.width,
        p.height,
        EXISTS(
          SELECT 1 FROM "Favourite" f
          WHERE f.photo_id = p.id AND f.user_id = ${req.user.id}
        ) as is_favourited
      FROM "PhotoFace" pf1
      JOIN "PhotoFace" pf2
        ON pf1.photo_id = pf2.photo_id
      JOIN "Photo" p
        ON p.id = pf1.photo_id
      JOIN "User" u
        ON u.id = p.user_id
      WHERE pf1.face_profile_id = ANY(${userFaceProfileIds}::text[])
        AND pf2.face_profile_id = ANY(${otherFaceProfileIds}::text[])
        AND p.event_id = ${eventId}
        AND p.is_visible = true
      ORDER BY p.uploaded_at DESC
    `;

    return res.status(200).json({
      shared_with: {
        face_profile_id: faceProfileId,
        name: otherProfile.claimed?.name ?? "Unknown Person",
        is_claimed: otherProfile.is_claimed,
        user_id: otherProfile.claimed?.id ?? null,
        selfie_url: otherProfile.claimed?.selfie_url ?? null,
      },
      total_shared: photos.length,
      photos,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return res.status(500).json({ message });
  }
}

/**
 * @name getEventConnectionsSummaryController
 * @description Returns a quick count: total people and total shared photos
 * for the UI badge.
 * @route GET /events/:eventId/connections/summary
 * @access Private
 */
async function getEventConnectionsSummaryController(
  req: AuthRequest,
  res: Response
) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const eventId = req.params.eventId as string;

    // Check event access
    const eventAccess = await prisma.eventAccess.findUnique({
      where: {
        event_id_user_id: { event_id: eventId, user_id: req.user.id },
      },
    });

    if (!eventAccess) {
      return res
        .status(403)
        .json({ message: "You do not have access to this event" });
    }

    // Find ALL of user's FaceProfiles
    const faceProfiles = await prisma.faceProfile.findMany({
      where: { event_id: eventId, claimed_by: req.user.id },
    });

    if (faceProfiles.length === 0) {
      return res.status(200).json({
        total_people: 0,
        total_shared_photos: 0,
      });
    }

    const userFaceProfileIds = faceProfiles.map((fp) => fp.id);

    const summary = await prisma.$queryRaw<
      { total_people: bigint; total_shared_photos: bigint }[]
    >`
      SELECT
        COUNT(DISTINCT COALESCE(fp2.claimed_by, fp2.id)) as total_people,
        COUNT(DISTINCT pf2.photo_id) as total_shared_photos
      FROM "PhotoFace" pf1
      JOIN "PhotoFace" pf2
        ON pf1.photo_id = pf2.photo_id
        AND pf2.face_profile_id != pf1.face_profile_id
      JOIN "FaceProfile" fp2
        ON fp2.id = pf2.face_profile_id
      WHERE pf1.face_profile_id = ANY(${userFaceProfileIds}::text[])
        AND NOT (pf2.face_profile_id = ANY(${userFaceProfileIds}::text[]))
    `;

    const row = summary[0];

    return res.status(200).json({
      total_people: Number(row?.total_people ?? 0),
      total_shared_photos: Number(row?.total_shared_photos ?? 0),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return res.status(500).json({ message });
  }
}

export {
  getWhoWasIWithController,
  getSharedPhotosController,
  getEventConnectionsSummaryController,
};
