import multer from 'multer'
import path from 'path'
import fs from 'fs'

// Multer is middleware that handles multipart/form-data requests
// (the format browsers use when submitting file uploads)
// It intercepts the request, reads the file bytes, and puts them on req.files

// diskStorage writes files to temp directory to avoid OOM with large uploads
// Files are processed by sharp, uploaded to R2, then cleaned up
const tempDir = path.join(process.cwd(), 'temp-uploads')
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir)
  },
  filename: (req, file, cb) => {
    // Use timestamp + random string to avoid collisions
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

export const upload = multer({
  storage,

  // Only accept image files
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
    if (allowed.includes(file.mimetype)) {
      cb(null, true)  // accept the file
    } else {
      cb(new Error('Only JPEG, PNG, WebP and HEIC images are allowed'))
    }
  },

  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max per file
    files: 10,                   // max 10 files per request
  },
})