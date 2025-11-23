import { pool } from "../db.js";

/**
 * REGISTER
 * POST /auth/register
 * Header → Authorization: Bearer <firebase token>
 * Body → { username }
 */
export const registerUser = async (req, res) => {
  try {
    const uid = req.user.uid;       // token'dan
    const email = req.user.email;   // token'dan
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username zorunlu" });
    }

    // Kullanıcıyı DB'ye yaz (upsert)
    const result = await pool.query(
      `
      INSERT INTO auth_users (firebase_uid, email, username)
      VALUES ($1, $2, $3)
      ON CONFLICT (firebase_uid) DO UPDATE SET
        email = EXCLUDED.email,
        username = EXCLUDED.username
      RETURNING *;
      `,
      [uid, email, username]
    );

    return res.json(result.rows[0]);

  } catch (err) {
    console.error("🔥 Register error:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};



/**
 * LOGIN
 * POST /auth/login
 * Header → Authorization: Bearer <firebase token>
 */
export const loginUser = async (req, res) => {
  try {
    const uid = req.user.uid;

    const result = await pool.query(
      `SELECT * FROM auth_users WHERE firebase_uid = $1`,
      [uid]
    );

    // Kullanıcı yoksa -> frontend register sayfasına yönlendirebilir
    return res.json(result.rows[0] || { exists: false });

  } catch (err) {
    console.error("🔥 Login error:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};
