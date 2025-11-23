import { pool } from "../db.js";

/**
 *  REGISTER USER
 *  POST /auth/register
 *  Firebase token → req.user içinde
 *  Body: username, phone
 */
export const registerUser = async (req, res) => {
  try {
    const { firebase_uid, email, username } = req.body;

    if (!firebase_uid || !email || !username) {
      return res.status(400).json({ error: "Eksik alanlar var" });
    }

    const result = await pool.query(
      `
      INSERT INTO auth_users (firebase_uid, email, username)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [firebase_uid, email, username]
    );

    return res.json({ user: result.rows[0] });
  } catch (err) {
    console.error("🔥 Register error:", err);

    if (err.code === "23505") {
      return res.status(409).json({ error: "Kullanıcı zaten mevcut" });
    }

    res.status(500).json({ error: "Server error" });
  }
};


/**
 *  LOGIN USER
 *  POST /auth/login
 *  Firebase token → req.user içinde
 */
export const loginUser = async (req, res) => {
  try {
    const { firebase_uid } = req.body;

    if (!firebase_uid) {
      return res.status(400).json({ error: "UID gerekir" });
    }

    const result = await pool.query(
      `SELECT * FROM auth_users WHERE firebase_uid = $1 LIMIT 1`,
      [firebase_uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ user: null });
    }

    return res.json({ user: result.rows[0] });

  } catch (err) {
    console.error("🔥 Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
};