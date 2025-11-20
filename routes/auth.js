import express from "express";
import { registerUser, loginUser } from "../controllers/authController.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// Register
router.post("/register", auth, registerUser);

// Login
router.post("/login", auth, loginUser);

export default router;
