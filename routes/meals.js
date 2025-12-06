import express from "express";
import { auth } from "../middleware/auth.js";

import {
  addMeal,
  getMeals,
  getMealById,
  deleteMeal
} from "../controllers/mealController.js"; // ✅ DOĞRU DOSYA

const router = express.Router();

// Yeni öğün ekleme (auth zorunlu)
router.post("/", auth, addMeal);

// Tüm öğünleri çek (public)
router.get("/", getMeals);

// Tekil öğün detayı
router.get("/:id", getMealById);

// Öğün silme (auth zorunlu)
router.delete("/:id", auth, deleteMeal);

export default router;
