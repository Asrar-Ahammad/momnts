import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware.js'
import { upload } from '../lib/multer.js'
import { uploadSelfieController } from '../controllers/onboarding.controller.js'

const onboardingRouter = Router()

/**
 * @route POST /api/onboarding/selfie
 * @description Upload user selfie and generate face embedding
 * @access Private
 */
onboardingRouter.post('/selfie', authenticate, upload.single('selfie'), uploadSelfieController)

export { onboardingRouter }
