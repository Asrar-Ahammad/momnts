import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  getCommentsController,
  addCommentController,
  deleteCommentController,
} from "../controllers/comments.controller.js";

const commentsRouter = Router({ mergeParams: true });

commentsRouter.get("/", authenticate, getCommentsController);
commentsRouter.post("/", authenticate, addCommentController);
commentsRouter.delete("/:commentId", authenticate, deleteCommentController);

export { commentsRouter };
