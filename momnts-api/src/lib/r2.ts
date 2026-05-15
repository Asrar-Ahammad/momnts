import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { NodeHttpHandler } from '@smithy/node-http-handler'

// Validate required environment variables at startup
const requiredEnvVars = {
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
  R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
}

const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key)

if (missingVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingVars.join(', ')}. ` +
    'Please set these variables before starting the server.'
  )
}

// S3Client works with R2 because Cloudflare R2 is S3-compatible
// We just point it to Cloudflare's endpoint instead of AWS
// For production with SSL certificate issues, set NODE_TLS_REJECT_UNAUTHORIZED=0
// as an environment variable when starting the server, NOT in code
export const r2 = new S3Client({
  region: 'auto', // R2 doesn't use regions like AWS, 'auto' is always correct
  endpoint: `https://${requiredEnvVars.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: requiredEnvVars.R2_ACCESS_KEY_ID!,
    secretAccessKey: requiredEnvVars.R2_SECRET_ACCESS_KEY!,
  },
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 5000,
    socketTimeout: 30000,
    maxSockets: 25,
    maxConcurrentStreams: 25,
  }),
})

/**
 * Uploads a file buffer to Cloudflare R2
 * @param key - the file path inside the bucket e.g. "events/abc/photo.jpg"
 * @param body - the file content as a Buffer
 * @param contentType - MIME type e.g. "image/jpeg"
 * @returns the public URL to access this file
 */
export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string,
  options?: { cacheControl?: string, contentDisposition?: string }
): Promise<string> {
  // PutObjectCommand is the S3/R2 way of saying "upload this file"
  await r2.send(new PutObjectCommand({
    Bucket: requiredEnvVars.R2_BUCKET_NAME!, // which bucket to upload to
    Key: key,                             // path inside the bucket
    Body: body,                           // the actual file bytes
    ContentType: contentType,             // tells browser how to handle the file
    CacheControl: options?.cacheControl,
    ContentDisposition: options?.contentDisposition,
  }))

  // R2_PUBLIC_URL is your r2.dev or custom domain URL
  // The full URL is just base URL + the key (file path)
  return `${requiredEnvVars.R2_PUBLIC_URL}/${key}`
}

/**
 * Deletes a file from Cloudflare R2
 * @param key - the file path inside the bucket to delete
 */
export async function deleteFromR2(key: string): Promise<void> {
  await r2.send(new DeleteObjectCommand({
    Bucket: requiredEnvVars.R2_BUCKET_NAME!,
    Key: key,
  }))
}

/**
 * Extracts the R2 key from a full public URL
 * We need this when deleting — we store full URLs in DB but R2 needs just the key
 * e.g. "https://pub-xxx.r2.dev/events/abc/photo.jpg" → "events/abc/photo.jpg"
 */
export function extractKeyFromUrl(url: string): string {
  return url.replace(`${requiredEnvVars.R2_PUBLIC_URL}/`, '')
}