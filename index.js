import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

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
app.use(express.json());

// Root test
app.get("/", (req, res) => {
  res.send("Yummy Yum backend çalışıyor 🎉");
});

// Routers
app.use("/meals", mealsRouter);
app.use("/profile", profileRouter);
app.use("/match", matchRouter);
app.use("/chat", messagesRouter);
app.use("/notifications", notificationsRouter);
app.use("/rating", ratingRouter);
app.use("/categories", categoriesRouter);
app.use("/allergens", allergenRouter);
app.use("/auth", authRouter);

// Start server
app.listen(process.env.PORT, () => {
  console.log("🚀 Server başlatıldı PORT:", process.env.PORT);
});
