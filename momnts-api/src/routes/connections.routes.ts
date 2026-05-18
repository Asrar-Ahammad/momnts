import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  getWhoWasIWithController,
  getSharedPhotosController,
  getEventConnectionsSummaryController,
} from "../controllers/connections.controller.js";

const connectionsRouter = Router({ mergeParams: true });

// Static route BEFORE parameterized to avoid /summary matching /:faceProfileId
connectionsRouter.get("/summary", authenticate, getEventConnectionsSummaryController);
connectionsRouter.get("/", authenticate, getWhoWasIWithController);
connectionsRouter.get("/:faceProfileId/photos", authenticate, getSharedPhotosController);

export { connectionsRouter };
