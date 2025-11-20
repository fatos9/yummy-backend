import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./db.js";
import admin from "./firebase.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Firebase token doğrulama
const auth = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).send("Token yok");

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    console.log("Auth error:", err);
    return res.status(401).send("Geçersiz token");
  }
};

// Test endpoint
app.get("/", (req, res) => {
  res.send("Yummy Yum backend çalışıyor 🎉");
});

// Öğün ekleme
app.post("/meals", auth, async (req, res) => {
  try {
    const {
      name,
      category,
      image_url,
      restaurant_name,
      allergens,
      user_location,
      restaurant_location
    } = req.body;

    if (!name || !image_url)
      return res.status(400).send("name ve image_url zorunlu");

    const userId = req.user.uid;

    const query = `
      INSERT INTO meals (
        name, image_url, category, user_id,
        restaurant_name, allergens,
        user_location, restaurant_location
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *;
    `;

    const values = [
      name,
      image_url,
      category,
      userId,
      restaurant_name,
      allergens || null,
      user_location || null,
      restaurant_location || null,
    ];

    const result = await pool.query(query, values);
    res.send(result.rows[0]);
  } catch (err) {
    console.error("Meal ekleme hatası:", err);
    res.status(500).send("Server hatası");
  }
});

// Öğün listeleme
app.get("/meals", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM meals ORDER BY createdat DESC");
    res.send(result.rows);
  } catch (err) {
    console.error("Meal listeleme hatası:", err);
    res.status(500).send("Server hatası");
  }
});

// ⭐ LİSTENİ EN ALTA KOY
app.listen(process.env.PORT, () => {
  console.log("Server başlatıldı ✔ PORT:", process.env.PORT);
});
