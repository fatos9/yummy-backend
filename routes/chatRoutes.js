import express from "express";
import { auth } from "../middleware/auth.js";
import { getChatRoom } from "../controllers/chatController.js";

const router = express.Router();

router.get("/room/:id", auth, getChatRoom);

export default router;
