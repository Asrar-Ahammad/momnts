import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware.js'
import { 
  getAllPhotosController, 
  getMyPhotosController, 
  getMyUploadsController 
} from '../controllers/gallery.controller.js'

const galleryRouter = Router()

/**
 * All gallery routes are mounted under /api/events/:eventId/photos
 */

galleryRouter.get('/:eventId/photos/all', authenticate, getAllPhotosController)
galleryRouter.get('/:eventId/photos/mine', authenticate, getMyPhotosController)
galleryRouter.get('/:eventId/photos/uploads', authenticate, getMyUploadsController)

export { galleryRouter }
