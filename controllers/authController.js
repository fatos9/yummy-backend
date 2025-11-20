import { pool } from "../db.js";

/**
 *  REGISTER USER
 *  POST /auth/register
 *  Firebase token → req.user içinde
 *  Body: username, phone
 */
export const registerUser = async (req, res) => {
  try {
    const { username, phone } = req.body;

    const firebaseUid = req.user.uid; // Firebase UID
    const email = req.user.email;     // Firebase Email

    if (!username) {
      return res.status(400).json({ error: "Username zorunlu" });
    }

    // DB kayıt (UPSERT)
    const result = await pool.query(
      `
      INSERT INTO auth_users (id, email, username, phone)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE 
      SET username = $3,
          phone = $4
      RETURNING *;
      `,
      [firebaseUid, email, username, phone || null]
    );

    return res.json({ user: result.rows[0] });
  } catch (err) {
    console.error("🔥 Register error:", err);
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
    const firebaseUid = req.user.uid;

    const result = await pool.query(
      `SELECT * FROM auth_users WHERE id = $1 LIMIT 1`,
      [firebaseUid]
    );

    return res.json({
      user: result.rows[0] || null,
    });
  } catch (err) {
    console.error("🔥 Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
