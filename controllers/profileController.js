import { pool } from "../db.js";

/**
 * GET /profile/:uid
 */
export const getProfile = async (req, res) => {
  try {
    const uid = req.params.uid; // Firebase UID

    // --- USER ---
    const userQuery = await pool.query(
      `
      SELECT 
        firebase_uid AS uid,
        email,
        username,
        photo_url,
        rating
      FROM auth_users
      WHERE firebase_uid = $1
      LIMIT 1
      `,
      [uid]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: "bulunamadı" });
    }

    const user = userQuery.rows[0];

    // --- MEALS ---
    const mealsQuery = await pool.query(
      `
      SELECT *
      FROM meals
      WHERE user_id::text = $1::text
      ORDER BY createdat DESC
      `,
      [uid]
    );

    // --- MATCH COUNT ---
    let matchCount = 0;
    try {
      const matchQuery = await pool.query(
        `
        SELECT COUNT(*) AS count
        FROM match_requests
        WHERE (from_user_id = $1 OR to_user_id = $1)
        AND status = 'accepted'
        `,
        [uid]
      );
      matchCount = Number(matchQuery.rows[0].count) || 0;
    } catch (e) {
      console.log("⚠ matchCount sorgusu hatası:", e.message);
    }

    return res.json({
      uid: user.uid,
      email: user.email,
      username: user.username,
      photo_url: user.photo_url,
      rating: user.rating,
      points: user.points,

      meals: mealsQuery.rows,
      matchCount,
    });

  } catch (err) {
    console.error("🔥 getProfile error:", err);
    return res.status(500).json({ error: "Server hatası", detail: err.message });
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
