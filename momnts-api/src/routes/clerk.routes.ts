import { Router } from 'express'
import { clerkWebhookHandler } from '../controllers/clerk.controller.js'

const clerkRouter = Router()

// Clerk webhook — receives user.created events
// Must use raw JSON body (express.json() must run before this, which it does in index.ts)
clerkRouter.post('/webhook', clerkWebhookHandler)

export { clerkRouter }
