import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth.middleware";
import { prisma } from "../lib/prisma";
import { PLAN_LIMITS, type PlanType, type PlanLimits } from "../lib/plan-limits";

export interface PlanRequest extends AuthRequest {
  plan?: PlanType;
  planLimits?: PlanLimits;
}

/**
 * @name attachPlan
 * @description Middleware that attaches the user's plan and limits to the request.
 *              Must run AFTER authenticate middleware.
 *              Falls back to FREE if no subscription found.
 */
export async function attachPlan(
  req: PlanRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.id) {
      req.plan = "FREE";
      req.planLimits = PLAN_LIMITS.FREE;
      return next();
    }

    const subscription = await prisma.subscription.findUnique({
      where: { user_id: req.user.id },
    });

    // Determine effective plan
    let plan: PlanType = "FREE";

    if (subscription && subscription.is_active) {
      // Check expiry
      if (
        subscription.expires_at &&
        new Date(subscription.expires_at) < new Date()
      ) {
        // Expired — mark inactive
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { is_active: false },
        });
        plan = "FREE";
      } else {
        plan = subscription.plan as PlanType;
      }
    }

    req.plan = plan;
    req.planLimits = PLAN_LIMITS[plan];
    next();
  } catch (error) {
    // Don't block request on plan lookup failure — default to FREE
    console.error("[Plan Middleware] Error looking up plan:", error);
    req.plan = "FREE";
    req.planLimits = PLAN_LIMITS.FREE;
    next();
  }
}
