import type { Response } from "express";
import type { PlanRequest } from "../middleware/plan.middleware";
import { prisma } from "../lib/prisma";
import { PLAN_LIMITS } from "../lib/plan-limits";

/**
 * @name getSubscriptionController
 * @description Returns the user's current plan, limits, and subscription info.
 * @route GET /api/subscription
 * @access Private
 */
export async function getSubscriptionController(
  req: PlanRequest,
  res: Response
) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { user_id: req.user.id },
    });

    return res.status(200).json({
      plan: req.plan || "FREE",
      limits: req.planLimits || PLAN_LIMITS.FREE,
      subscription: subscription
        ? {
            id: subscription.id,
            plan: subscription.plan,
            started_at: subscription.started_at,
            expires_at: subscription.expires_at,
            is_active: subscription.is_active,
          }
        : null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return res.status(500).json({ message });
  }
}

/**
 * @name getUsageController
 * @description Returns the user's current usage stats vs their plan limits.
 * @route GET /api/subscription/usage
 * @access Private
 */
export async function getUsageController(req: PlanRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const userId = req.user.id;

    // Count events where user is ORGANIZER (only created events count toward limit)
    const eventsCreated = await prisma.eventAccess.count({
      where: {
        user_id: userId,
        role: "ORGANIZER",
      },
    });

    // Count secure events created by user
    const secureEventsCreated = await prisma.event.count({
      where: {
        user_id: userId,
        is_secure: true,
      },
    });

    const limits = req.planLimits || PLAN_LIMITS.FREE;

    return res.status(200).json({
      plan: req.plan || "FREE",
      usage: {
        eventsCreated,
        maxEvents: limits.maxEvents === Infinity ? null : limits.maxEvents,
        secureEventsCreated,
        maxSecureEvents:
          limits.maxSecureEvents === Infinity ? null : limits.maxSecureEvents,
        maxAttendeesPerEvent: limits.maxAttendeesPerEvent,
        maxOrganizerUploadsPerEvent: limits.maxOrganizerUploadsPerEvent,
        maxAttendeeUploadsPerEvent: limits.maxAttendeeUploadsPerEvent,
        canRegenerateInviteCode: limits.canRegenerateInviteCode,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return res.status(500).json({ message });
  }
}
