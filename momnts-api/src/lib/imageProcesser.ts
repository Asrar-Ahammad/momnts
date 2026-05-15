import sharp from 'sharp'

// Sharp is an image processing library
// It can resize, compress, and convert images very efficiently
// We create 3 versions of every photo:
//   thumb   — tiny version for grid/gallery view (fast to load)
//   display — medium version for when user opens a photo
//   original — full quality for when user downloads

interface ProcessedPhoto {
  thumb: Buffer      // ~25KB  — shown in photo grid
  display: Buffer    // ~600KB — shown when photo is opened
  original: Buffer  // ~2.5MB — served on download
  width: number     // original image width
  height: number    // original image height
}

export async function processImage(input: Buffer | string): Promise<ProcessedPhoto> {
  // Create a sharp instance from the raw uploaded bytes or file path
  // We reuse the same input for all 3 versions
  const pipeline = sharp(input, {
    failOn: 'none',
    sequentialRead: true,
  }).rotate().withMetadata(false)

  // Get original dimensions before processing
  const metadata = await pipeline.clone().metadata()
  const width = metadata.width || 0
  const height = metadata.height || 0

  const [thumb, display, original] = await Promise.all([
    // thumb — small square crop, heavily compressed
    pipeline
      .clone() // clone so we can process the same image multiple times
      .webp({ quality: 70, effort: 3 })
      .toBuffer(),

    // display — max 2400px wide, good quality
    pipeline
      .clone()
      .resize(2400, 2400, {
        fit: 'inside',            // preserve aspect ratio, don't crop
        withoutEnlargement: true, // don't upscale small images
      })
      .webp({ quality: 82, effort: 4 })
      .toBuffer(),

    // original — lossless WebP, closest to the uploaded file
    pipeline
      .clone()
      .webp({ lossless: true }) // lossless = no quality loss, just better compression
      .toBuffer()
  ])

  return { thumb, display, original, width, height }
}