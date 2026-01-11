import express from "express";
import { auth } from "../middleware/auth.js";

import {
  addMeal,
  getMeals,
  getMealById,
  deleteMeal,
  getMatchRequestById
} from "../controllers/mealsController.js";

const router = express.Router();

// Yeni öğün ekleme (auth zorunlu)
router.post("/", auth, (req, res, next) => {
  console.log("🔥 /meals POST endpoint HIT!");
  next();
}, addMeal);

// Tüm öğünleri çek (public)
router.get("/", getMeals);

// Tekil öğün detayı
router.get("/:id", getMealById);

// Öğün silme (auth zorunlu)
router.delete("/:id", auth, deleteMeal);

router.get("/match/request/:id", auth, getMatchRequestById);

export default router;
