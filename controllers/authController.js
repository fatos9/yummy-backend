import { pool } from "../db.js";

export const registerUser = async (req, res) => {
  try {
    console.log("📥 BODY:", req.body);

    const { firebase_uid, email, username } = req.body;3

    if (!firebase_uid || !email)
      return res.status(400).json({ error: "eksik parametre" });

    // Var mı?
    const check = await pool.query(
      "SELECT * FROM auth_users WHERE firebase_uid = $1",
      [firebase_uid]
    );

    if (check.rows.length > 0)
      return res.json({ user: check.rows[0] });

    // Yeni ekle
    const insert = await pool.query(
      `INSERT INTO auth_users (firebase_uid, email, username)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [firebase_uid, email, username]
    );

    res.json({ user: insert.rows[0] });

  } catch (err) {
    console.log("REGISTER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};


export const loginUser = async (req, res) => {
  try {
    const { firebase_uid } = req.body;

    const user = await pool.query(
      "SELECT * FROM auth_users WHERE firebase_uid=$1",
      [firebase_uid]
    );

    res.json({ user: user.rows[0] || null });

  } catch (err) {
    console.log("LOGIN ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};
