import { pool } from "../db.js";

/**
 * POST /rating/add
 * Bir kullanıcı başka bir kullanıcıyı oyluyor
 */
export const addRating = async (req, res) => {
  try {
    const fromUser = req.user.uid;
    const { to_user_id, rating } = req.body;

    if (!to_user_id || !rating) {
      return res.status(400).json({ error: "Eksik bilgi" });
    }

    if (fromUser === to_user_id) {
      return res.status(400).json({ error: "Kendine puan veremezsin" });
    }

    // Zaten oylamış mı?
    const check = await pool.query(
      `
      SELECT * FROM user_ratings
      WHERE from_user_id = $1 AND to_user_id = $2
      LIMIT 1
      `,
      [fromUser, to_user_id]
    );

    if (check.rows.length > 0) {
      return res.status(400).json({ error: "Bu kullanıcıyı zaten oyladın" });
    }

    // Rating ekle
    const insert = await pool.query(
      `
      INSERT INTO user_ratings (from_user_id, to_user_id, rating)
      VALUES ($1, $2, $3)
      RETURNING *;
      `,
      [fromUser, to_user_id, rating]
    );

    // Ortalama puanı güncelle
    const avgQuery = await pool.query(
      `
      SELECT AVG(rating) AS avg
      FROM user_ratings
      WHERE to_user_id = $1
      `,
      [to_user_id]
    );

    const newRating = avgQuery.rows[0].avg;

    await pool.query(
      `
      UPDATE auth_users
      SET rating = $1
      WHERE id = $2
      `,
      [newRating, to_user_id]
    );

    return res.json({
      success: true,
      rating: insert.rows[0],
      new_avg: newRating
    });
  } catch (err) {
    console.error("🔥 Rating ekleme hatası:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};


/**
 * GET /rating/:user_id
 * Kullanıcının aldığı tüm oylar + ortalama puanı
 */
export const getUserRating = async (req, res) => {
  try {
    const userId = req.params.user_id;

    const result = await pool.query(
      `
      SELECT * FROM user_ratings
      WHERE to_user_id = $1
      ORDER BY createdat DESC;
      `,
      [userId]
    );

    // Ortalama
    const avg = await pool.query(
      `
      SELECT AVG(rating) AS avg
      FROM user_ratings
      WHERE to_user_id = $1
      `,
      [userId]
    );

    return res.json({
      ratings: result.rows,
      average: avg.rows[0].avg || null
    });
  } catch (err) {
    console.error("🔥 Rating listeleme hatası:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};
