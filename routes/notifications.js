import express from "express";
import { auth } from "../middleware/auth.js";
import {
  getNotifications,
  addNotification,
  markAsRead
} from "../controllers/notificationsController.js";

const router = express.Router();

// Bildirimleri getir
router.get("/", auth, getNotifications);

// Bildirim ekle
router.post("/add", auth, addNotification);

// Bildirimi okundu yap
router.post("/read", auth, markAsRead);

export default router;
