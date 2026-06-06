import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth.middleware";
import { prisma } from "../lib/prisma";
import { PLAN_LIMITS, type PlanType, type PlanLimits } from "../lib/plan-limits";

export interface PlanRequest extends AuthRequest {
  plan?: PlanType;
  planLimits?: PlanLimits;
}

export async function getEffectivePlan(userId: string): Promise<PlanType> {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { user_id: userId },
    });

    if (subscription && subscription.is_active) {
      if (
        subscription.expires_at &&
        new Date(subscription.expires_at) < new Date()
      ) {
        // Expired — mark inactive safely
        await prisma.subscription.updateMany({
          where: { id: subscription.id, is_active: true },
          data: { is_active: false },
        });
        return "FREE";
      } else {
        const plan = subscription.plan;
        if (plan in PLAN_LIMITS) {
          return plan as PlanType;
        } else {
          console.warn(`[getEffectivePlan] Invalid plan type in DB: ${plan}`);
          return "FREE";
        }
      }
    }
  } catch (error) {
    console.error("[getEffectivePlan] Error looking up plan:", error);
  }
  return "FREE";
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
  if (!req.user?.id) {
    req.plan = "FREE";
    req.planLimits = PLAN_LIMITS.FREE;
    return next();
  }

  const plan = await getEffectivePlan(req.user.id);
  req.plan = plan;
  req.planLimits = PLAN_LIMITS[plan];
  next();
}
