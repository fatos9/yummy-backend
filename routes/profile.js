import express from "express";
import { auth } from "../middleware/auth.js";

import {
  getProfile,
  createProfile,
  updateProfile
} from "../controllers/profileController.js";

const router = express.Router();

// Profil görüntüleme (public, uid ile)
router.get("/:uid", getProfile);

// İlk girişte profil oluşturma
router.post("/", auth, createProfile);

// Profil güncelleme
router.patch("/", auth, updateProfile);

export default router;
