import { Router, raw } from 'express'
import { clerkWebhookHandler } from '../controllers/clerk.controller.js'

const clerkRouter = Router()

// Clerk webhook — receives user.created events from Svix.
// Must use express.raw() to preserve the exact bytes Svix signed;
// the global express.json() must NOT pre-parse this route.
clerkRouter.post('/webhook', raw({ type: 'application/json' }), clerkWebhookHandler)

export { clerkRouter }
