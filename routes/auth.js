import express from "express";
import { registerUser, loginUser } from "../controllers/authController.js";

const router = express.Router();

// Register → Firebase token gerekmez
router.post("/register", registerUser);

// Login → Firebase token gerekmez (UID ile çalışıyoruz)
router.post("/login", loginUser);

export default router;
