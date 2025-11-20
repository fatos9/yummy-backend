import express from "express";
import { auth } from "../middleware/auth.js";

import {
  sendMatchRequest,
  getReceivedMatches,
  getSentMatches,
  acceptMatch,
  rejectMatch
} from "../controllers/matchController.js";

const router = express.Router();

// İstek gönder
router.post("/send", auth, sendMatchRequest);

// Gelen istekler
router.get("/received", auth, getReceivedMatches);

// Gönderilen istekler
router.get("/sent", auth, getSentMatches);

// Kabul et
router.post("/accept", auth, acceptMatch);

// Reddet
router.post("/reject", auth, rejectMatch);

export default router;
