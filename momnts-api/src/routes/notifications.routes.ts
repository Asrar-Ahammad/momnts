import { Router } from "express";
import { getNotificationsController, markAsReadController, markAllAsReadController, clearNotificationsController, deleteNotificationController } from "../controllers/notifications.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const notificationsRouter = Router();

notificationsRouter.get("/", authenticate, getNotificationsController);
notificationsRouter.put("/all/read", authenticate, markAllAsReadController);
notificationsRouter.put("/:notificationId/read", authenticate, markAsReadController);
notificationsRouter.delete("/all", authenticate, clearNotificationsController);
notificationsRouter.delete("/:notificationId", authenticate, deleteNotificationController);

export { notificationsRouter };
