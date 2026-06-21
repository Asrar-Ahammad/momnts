import type { Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import crypto from 'crypto'

/**
 * Clerk Webhook Handler
 *
 * Handles `user.created` events from Clerk webhooks.
 * When a new user signs up via Clerk (Google/Apple OAuth), creates an internal
 * User record linked via clerk_user_id.
 *
 * @route POST /api/auth/clerk/webhook
 */
export async function clerkWebhookHandler(req: Request, res: Response) {
  try {
    // Verify webhook signature (Clerk uses Svix)
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('[Clerk Webhook] CLERK_WEBHOOK_SECRET not configured')
      return res.status(500).json({ message: 'Webhook not configured' })
    }

    const svixId = req.headers['svix-id'] as string
    const svixTimestamp = req.headers['svix-timestamp'] as string
    const svixSignature = req.headers['svix-signature'] as string

    if (!svixId || !svixTimestamp || !svixSignature) {
      return res.status(400).json({ message: 'Missing Svix headers' })
    }

    // Verify signature
    const body = JSON.stringify(req.body)
    const signedContent = `${svixId}.${svixTimestamp}.${body}`
    
    // Clerk webhook secrets are prefixed with "whsec_"
    const secret = webhookSecret.startsWith('whsec_')
      ? webhookSecret.slice(6)
      : webhookSecret
    const secretBytes = Buffer.from(secret, 'base64')
    const signature = crypto
      .createHmac('sha256', secretBytes)
      .update(signedContent)
      .digest('base64')

    const expectedSignatures = svixSignature.split(' ').map(s => s.split(',')[1])
    const isValid = expectedSignatures.some(expected => {
      try {
        return crypto.timingSafeEqual(
          Buffer.from(signature),
          Buffer.from(expected || '')
        )
      } catch {
        return false
      }
    })

    if (!isValid) {
      console.warn('[Clerk Webhook] Invalid signature')
      return res.status(401).json({ message: 'Invalid webhook signature' })
    }

    const { type, data } = req.body

    if (type === 'user.created') {
      const clerkUserId = data.id
      const email = data.email_addresses?.[0]?.email_address
      const name = `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'User'

      if (!email) {
        console.error('[Clerk Webhook] user.created event missing email')
        return res.status(400).json({ message: 'No email in webhook payload' })
      }

      // Check if user already exists by email (migration case — shouldn't happen here
      // since migration happens on legacy login, but handle defensively)
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) {
        // Link Clerk ID if not already linked
        if (!existing.clerk_user_id) {
          await prisma.user.update({
            where: { id: existing.id },
            data: {
              clerk_user_id: clerkUserId,
              auth_provider: 'clerk',
            },
          })
          console.log(`[Clerk Webhook] Linked existing user ${existing.id} to Clerk ${clerkUserId}`)
        }
        return res.status(200).json({ message: 'User already exists, linked' })
      }

      // Create new internal user — no password for OAuth users
      const newUser = await prisma.user.create({
        data: {
          name,
          email,
          password_hash: null,
          email_verified: true, // OAuth emails are pre-verified
          clerk_user_id: clerkUserId,
          auth_provider: 'clerk',
        },
      })

      // Create default FREE subscription
      await prisma.subscription.create({
        data: {
          user_id: newUser.id,
          plan: 'FREE',
        },
      })

      console.log(`[Clerk Webhook] Created new user ${newUser.id} for Clerk ${clerkUserId}`)
      return res.status(201).json({ message: 'User created' })
    }

    // Acknowledge other event types without processing
    return res.status(200).json({ message: 'Event type not handled' })
  } catch (error) {
    console.error('[Clerk Webhook] Error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return res.status(500).json({ message })
  }
}
