import express from "express";
import { auth } from "../middleware/auth.js";

import {
  getProfile,
  createProfile,
  updateProfile
} from "../controllers/profileController.js";

const router = express.Router();

// 🔥 PROFİL GET - public
router.get("/:uid", getProfile);

// 🔥 İlk girişte profil oluştur - auth required
router.post("/", auth, createProfile);

// 🔥 Profil güncelle - auth required
router.patch("/", auth, updateProfile);

export default router;
