import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { attachPlan } from "../middleware/plan.middleware";
import {
  getSubscriptionController,
  getUsageController,
} from "../controllers/subscription.controller";

const subscriptionRouter = Router();

// Get current plan + subscription info
subscriptionRouter.get("/", authenticate, attachPlan, getSubscriptionController);

// Get usage stats vs limits
subscriptionRouter.get(
  "/usage",
  authenticate,
  attachPlan,
  getUsageController
);

export { subscriptionRouter };
