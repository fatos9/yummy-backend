import express from "express";
import { auth } from "../middleware/auth.js";

import {
  addMeal,
  getMeals,
  getMealById,
  deleteMeal
} from "../controllers/mealsController.js";

const router = express.Router();

// Öğün ekleme (korumalı)
router.post("/", auth, addMeal);

// Tüm öğünleri çekme (public)
router.get("/", getMeals);

// Tekil öğün
router.get("/:id", getMealById);

// Öğün silme (korumalı)
router.delete("/:id", auth, deleteMeal);

export default router;
