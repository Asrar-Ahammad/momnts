import { Router } from 'express'
import {
  uploadPhotoController,
  getEventPhotosController,
  getPhotoDetailController,
  deletePhotoController,
  downloadPhotoController,
} from '../controllers/photos.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { upload } from '../lib/multer.js'

const photosRouter = Router()

// upload.array('photos', 10) tells multer to accept up to 10 files
// under the field name "photos" in the multipart form
// After this middleware runs, req.files contains the uploaded file buffers
photosRouter.post('/:eventId/upload', authenticate, upload.array('photos', 10), uploadPhotoController)
photosRouter.get('/:eventId',         authenticate, getEventPhotosController)
photosRouter.get('/:eventId/:photoId',authenticate, getPhotoDetailController)
photosRouter.get('/:eventId/:photoId/download', authenticate, downloadPhotoController)
photosRouter.delete('/:eventId/:photoId', authenticate, deletePhotoController)

export { photosRouter }