import express from "express";
import { auth } from "../middleware/auth.js";
import {
  getChatMessages,
  sendMessage
} from "../controllers/messagesController.js";

const router = express.Router();

// Match mesajlarını getir
router.get("/room/:room_id", auth, getChatMessages);

// Yeni mesaj gönder
router.post("/send", auth, sendMessage);

//Tüm chat roomları getir
router.get("/chat/rooms", auth, getUserChatRooms);

export default router;
