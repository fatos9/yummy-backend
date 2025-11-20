import express from "express";
import { auth } from "../middleware/auth.js";
import {
  addRating,
  getUserRating
} from "../controllers/ratingController.js";

const router = express.Router();

// Kullanıcıyı oylama
router.post("/add", auth, addRating);

// Kullanıcının tüm rating geçmişi
router.get("/:user_id", auth, getUserRating);

export default router;
