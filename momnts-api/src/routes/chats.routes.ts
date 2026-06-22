import { Router } from "express";
import {
  getChatMessagesController,
  sendChatMessageController,
  updateChatMessageController,
  deleteChatMessageController,
  toggleMessageReactionController
} from "../controllers/chats.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

// mergeParams is required to access eventId from parent route namespace
const chatsRouter = Router({ mergeParams: true });

chatsRouter.get("/", authenticate, getChatMessagesController);
chatsRouter.post("/", authenticate, sendChatMessageController);
chatsRouter.put("/:messageId", authenticate, updateChatMessageController);
chatsRouter.delete("/:messageId", authenticate, deleteChatMessageController);
chatsRouter.post("/:messageId/reactions", authenticate, toggleMessageReactionController);

export { chatsRouter };
