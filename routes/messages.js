import express from "express";
import { auth } from "../middleware/auth.js";
import {
  getChatMessages,
  sendMessage,
  getUserChatRooms
} from "../controllers/messagesController.js";

const router = express.Router();

// Tek bir chat odasının mesajları
router.get("/room/:room_id", auth, getChatMessages);

// Mesaj gönder
router.post("/send", auth, sendMessage);

// Kullanıcının tüm chat odaları
router.get("/rooms", auth, getUserChatRooms);

export default router;
