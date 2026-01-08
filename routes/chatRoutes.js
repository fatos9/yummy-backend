import express from "express";
import { auth } from "../middleware/auth.js";
import {
  getChatRoom,
  getChatRooms,
  sendChatMessage,
  getNewChatMessages
} from "../controllers/chatController.js";

const router = express.Router();

router.get("/rooms", auth, getChatRooms);
router.get("/room/:id", auth, getChatRoom);
router.post("/send", auth, sendChatMessage);
router.get("/messages", auth, getNewChatMessages);

export default router;
