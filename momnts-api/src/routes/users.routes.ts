import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware.js'
import { upload } from '../lib/multer.js'
import { updateSelfieController, updateProfileController, deleteSelfieController } from '../controllers/users.controller.js'

const usersRouter = Router()

/**
 * @route PUT /api/users/selfie
 * @description Update user selfie and regenerate face embedding
 * @access Private
 */
usersRouter.put('/selfie', authenticate, upload.single('selfie'), updateSelfieController)

/**
 * @route DELETE /api/users/selfie
 * @description Delete user selfie and remove face embedding
 * @access Private
 */
usersRouter.delete('/selfie', authenticate, deleteSelfieController)

/**
 * @route PUT /api/users/profile
 * @description Update user profile (name)
 * @access Private
 */
usersRouter.put('/profile', authenticate, updateProfileController)

export { usersRouter }
