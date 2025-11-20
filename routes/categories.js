import express from "express";
import { getCategories, addCategory } from "../controllers/categoryController.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// Kategorileri listele (public)
router.get("/", getCategories);

// Yeni kategori ekle (korumalı, opsiyonel)
router.post("/", auth, addCategory);

export default router;
