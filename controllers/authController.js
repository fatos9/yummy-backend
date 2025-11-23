import { pool } from "../db.js";

/**
 * POST /auth/register
 * Body: firebase_uid, email, username
 */
export const registerUser = async (req, res) => {
  try {
    const { firebase_uid, email, username } = req.body;

    console.log("📥 Register BODY:", req.body);

    if (!firebase_uid) {
      return res.status(400).json({ error: "firebase_uid eksik" });
    }

    const existing = await pool.query(
      `SELECT * FROM auth_users WHERE firebase_uid = $1`,
      [firebase_uid]
    );

    if (existing.rows.length > 0) {
      return res.json({ user: existing.rows[0] });
    }

    const insert = await pool.query(
      `INSERT INTO auth_users (firebase_uid, email, username)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [firebase_uid, email, username]
    );

    res.json({ user: insert.rows[0] });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: err.message });
  }
};
