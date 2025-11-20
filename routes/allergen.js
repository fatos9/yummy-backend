import express from "express";
import { getAllergens, addAllergen } from "../controllers/allergenController.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// Alerjenleri listele (public)
router.get("/", getAllergens);

// Yeni alerjen ekle (korumalı)
router.post("/", auth, addAllergen);

export default router;
