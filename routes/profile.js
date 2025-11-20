import express from "express";
import { auth } from "../middleware/auth.js";

import {
  getProfile,
  createProfile,
  updateProfile
} from "../controllers/profileController.js";

const router = express.Router();

// GET profil (public)
router.get("/:uid", getProfile);

// Profil oluştur (ilk giriş) – korumalı
router.post("/", auth, createProfile);

// Profil güncelle – korumalı
router.patch("/", auth, updateProfile);

export default router;
