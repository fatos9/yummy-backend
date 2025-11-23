import { pool } from "../db.js";

/**
 * GET /profile/:uid
 */
export const getProfile = async (req, res) => {
  try {
    const uid = req.params.uid;

    const user = await pool.query(
      "SELECT * FROM auth_users WHERE firebase_uid = $1",
      [uid]
    );

    if (user.rows.length === 0)
      return res.status(404).json({ error: "bulunamadı" });

    res.json(user.rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};




/**
 * POST /profile
 */
export const createProfile = async (req, res) => {
  try {
    const firebase_uid = req.user.uid;
    const email = req.user.email;

    // Var mı kontrol et
    const existing = await pool.query(
      `SELECT * FROM auth_users WHERE firebase_uid = $1 LIMIT 1`,
      [firebase_uid]
    );

    if (existing.rows.length > 0) {
      return res.json(existing.rows[0]);
    }

    // Oluştur
    const insert = await pool.query(
      `
      INSERT INTO auth_users (firebase_uid, email, username, photo_url, rating, points)
      VALUES ($1, $2, NULL, NULL, 0, 0)
      RETURNING *
      `,
      [firebase_uid, email]
    );

    return res.json(insert.rows[0]);

  } catch (err) {
    console.error("🔥 createProfile error:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};



/**
 * PATCH /profile
 */
export const updateProfile = async (req, res) => {
  try {
    const firebase_uid = req.user.uid;
    const { username, photo_url } = req.body;

    const update = await pool.query(
      `
      UPDATE auth_users
      SET username = COALESCE($1, username),
          photo_url = COALESCE($2, photo_url)
      WHERE firebase_uid = $3
      RETURNING *
      `,
      [username, photo_url, firebase_uid]
    );

    return res.json(update.rows[0]);

  } catch (err) {
    console.error("🔥 updateProfile error:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};
