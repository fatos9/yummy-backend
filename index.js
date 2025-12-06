import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

// Routers
import mealsRouter from "./routes/meals.js";
import profileRouter from "./routes/profile.js";
import matchRouter from "./routes/match.js";
import messagesRouter from "./routes/messages.js";
import notificationsRouter from "./routes/notifications.js";
import ratingRouter from "./routes/rating.js";
import categoriesRouter from "./routes/categories.js";
import allergenRouter from "./routes/allergen.js";
import authRouter from "./routes/auth.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ROOT TEST
app.get("/", (req, res) => {
  res.send("🍽️ Yummy Yum Backend is Running!");
});

// API ROUTES
app.use("/auth", authRouter);
app.use("/meals", mealsRouter);
app.use("/profile", profileRouter);
app.use("/match", matchRouter);
app.use("/messages", messagesRouter); // 🔥 chat yerine /messages daha mantıklı
app.use("/notifications", notificationsRouter);
app.use("/rating", ratingRouter);
app.use("/categories", categoriesRouter);
app.use("/allergens", allergenRouter);

// PORT FIXED
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
