import express from "express";
import { auth } from "../middleware/auth.js";
import {
  getChatMessages,
  sendMessage,
  getUserChatRooms
} from "../controllers/messagesController.js";

const router = express.Router();

router.get("/room/:room_id", auth, getChatMessages);
router.post("/send", auth, sendMessage);
router.get("/chat/rooms", auth, getUserChatRooms);

export default router;
