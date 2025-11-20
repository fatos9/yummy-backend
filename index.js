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

// Test endpoint (auth yok)
app.get("/", (req, res) => {
  res.send("Yummy Yum backend çalışıyor 🎉");
});

// DB test
app.get("/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.send(result.rows[0]);
  } catch (err) {
    console.log(err);
    res.status(500).send("DB hatası");
  }
});

// Örnek korumalı route
app.get("/me", auth, (req, res) => {
  res.send({ user: req.user });
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server başlatıldı ✔");
});
