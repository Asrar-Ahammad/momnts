import { Router } from "express";
import { getNotificationsController, markAsReadController, clearNotificationsController } from "../controllers/notifications.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const notificationsRouter = Router();

notificationsRouter.get("/", authenticate, getNotificationsController);
notificationsRouter.put("/:notificationId/read", authenticate, markAsReadController);
notificationsRouter.delete("/all", authenticate, clearNotificationsController);

export { notificationsRouter };
