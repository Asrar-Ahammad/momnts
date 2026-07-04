import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware.js'
import { upload } from '../lib/multer.js'
import { updateSelfieController, updateProfileController, deleteSelfieController, updateBannerController, deleteBannerController } from '../controllers/users.controller.js'

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

/**
 * @route PUT /api/users/banner
 * @description Update user profile banner image
 * @access Private
 */
usersRouter.put('/banner', authenticate, upload.single('banner'), updateBannerController)

/**
 * @route DELETE /api/users/banner
 * @description Delete user profile banner image
 * @access Private
 */
usersRouter.delete('/banner', authenticate, deleteBannerController)

export { usersRouter }
