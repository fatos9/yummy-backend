import { pool } from "../db.js";

/**
 * POST /auth/register
 * Body: firebase_uid, email, username
 */
export const registerUser = async (req, res) => {
  try {
    const { firebase_uid, email, username } = req.body;

    if (!firebase_uid || !email) {
      return res.status(400).json({ error: "Eksik alan" });
    }

    // Kullanıcı zaten var mı?
    const existing = await pool.query(
      `SELECT * FROM auth_users WHERE firebase_uid = $1 LIMIT 1`,
      [firebase_uid]
    );

    if (existing.rows.length > 0) {
      return res.json({ user: existing.rows[0] });
    }

    // Yeni ekle
    const insert = await pool.query(
      `INSERT INTO auth_users (firebase_uid, email, username)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [firebase_uid, email, username || null]
    );

    return res.json({ user: insert.rows[0] });

  } catch (err) {
    console.error("🔥 Register error:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};
