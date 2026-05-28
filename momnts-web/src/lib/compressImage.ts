/**
 * Client-side image compression using browser Canvas API.
 * Compresses images before uploading to reduce network transfer time.
 * 
 * For a typical 2MB phone photo:
 *   - Before: 2MB JPEG → sent raw over network
 *   - After:  ~300-500KB WebP → 4-5x faster upload
 */

const MAX_DIMENSION = 3840 // 4K — preserve quality, just cap insane sizes
const QUALITY = 0.85
const MAX_FILE_SIZE = 50 * 1024 * 1024 // Skip compression for files > 50MB (let server handle)

/**
 * Compress a single image file using the browser's Canvas API.
 * Returns a WebP blob if compression succeeds, original file otherwise.
 */
async function compressSingle(file: File): Promise<File> {
  // Skip non-image files or very large files
  if (!file.type.startsWith('image/') || file.size > MAX_FILE_SIZE) {
    return file
  }

  // HEIC files can't be decoded by browser canvas — skip
  if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
    return file
  }

  try {
    // Decode image using createImageBitmap (off main thread, memory efficient)
    const bitmap = await createImageBitmap(file)
    const { width, height } = bitmap

    // Calculate scale factor if image exceeds max dimension
    let targetW = width
    let targetH = height

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / Math.max(width, height)
      targetW = Math.round(width * scale)
      targetH = Math.round(height * scale)
    }

    // Use OffscreenCanvas if available (better performance, no DOM needed)
    let blob: Blob | null = null

    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(targetW, targetH)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas context failed')
      ctx.drawImage(bitmap, 0, 0, targetW, targetH)
      blob = await canvas.convertToBlob({ type: 'image/webp', quality: QUALITY })
    } else {
      // Fallback to regular canvas
      const canvas = document.createElement('canvas')
      canvas.width = targetW
      canvas.height = targetH
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas context failed')
      ctx.drawImage(bitmap, 0, 0, targetW, targetH)
      blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/webp', QUALITY)
      })
    }

    bitmap.close()

    if (!blob) throw new Error('Compression produced null blob')

    // Only use compressed version if it's actually smaller
    if (blob.size >= file.size) {
      return file
    }

    // Preserve original filename but change extension
    const name = file.name.replace(/\.[^.]+$/, '.webp')
    return new File([blob], name, { type: 'image/webp', lastModified: Date.now() })

  } catch (err) {
    // If compression fails for any reason, return original
    console.warn(`[compress] Failed to compress ${file.name}, using original:`, err)
    return file
  }
}

/**
 * Compress multiple image files in parallel.
 * Returns compressed files in the same order as input.
 */
export async function compressImages(files: File[]): Promise<File[]> {
  const results = await Promise.all(files.map(compressSingle))
  return results
}
