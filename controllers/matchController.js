import { pool } from "../db.js";

/**
 * POST /match/send
 * Bir kullanıcı diğerine meal üzerinden istek yollar
 */
export const sendMatchRequest = async (req, res) => {
  try {
    const fromUserId = req.user.uid;
    const { to_user_id, meal_id } = req.body;

    if (!to_user_id || !meal_id) {
      return res.status(400).json({ error: "Eksik bilgi" });
    }

    // Zaten istek var mı kontrol et
    const check = await pool.query(
      `
      SELECT * FROM match_requests
      WHERE from_user_id = $1 AND to_user_id = $2 AND meal_id = $3
      LIMIT 1
    `,
      [fromUserId, to_user_id, meal_id]
    );

    if (check.rows.length > 0) {
      return res.json({ message: "Zaten istek gönderilmiş" });
    }

    const insert = await pool.query(
      `
      INSERT INTO match_requests (from_user_id, to_user_id, meal_id)
      VALUES ($1, $2, $3)
      RETURNING *;
    `,
      [fromUserId, to_user_id, meal_id]
    );

    return res.json(insert.rows[0]);
  } catch (err) {
    console.error("🔥 Match istek gönderme hatası:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};

/**
 * GET /match/received
 * Kullanıcının aldığı istekler
 */
export const getReceivedMatches = async (req, res) => {
  try {
    const uid = req.user.uid;

    const result = await pool.query(
      `
      SELECT mr.*, 
        u.username AS sender_name,
        u.photo_url AS sender_photo
      FROM match_requests mr
      LEFT JOIN auth_users u ON u.firebase_uid = mr.from_user_id
      WHERE mr.to_user_id = $1
      ORDER BY mr.createdat DESC
    `,
      [uid]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("🔥 Gelen istekler hatası:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};

/**
 * GET /match/sent
 * Kullanıcının gönderdiği istekler
 */
export const getSentMatches = async (req, res) => {
  try {
    const uid = req.user.uid; // Firebase UID

    const result = await pool.query(
      `
      SELECT mr.*,
        u.username AS receiver_name,
        u.photo_url AS receiver_photo
      FROM match_requests mr
      LEFT JOIN auth_users u ON u.firebase_uid = mr.to_user_id
      WHERE mr.from_user_id = $1
      ORDER BY mr.createdat DESC
    `,
      [uid]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("🔥 Gönderilen istekler hatası:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};

/**
 * POST /match/accept
 * İstek kabul edilir → match tablosuna kayıt düşülür
 */
export const acceptMatch = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { request_id } = req.body;

    if (!request_id) {
      return res.status(400).json({ error: "request_id eksik" });
    }

    // İsteği çek
    const check = await pool.query(
      `
      SELECT * FROM match_requests
      WHERE id = $1 AND to_user_id = $2
    `,
      [request_id, uid]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: "İstek bulunamadı" });
    }

    const request = check.rows[0];

    // Status güncelle
    await pool.query(
      `UPDATE match_requests SET status = 'accepted' WHERE id = $1`,
      [request_id]
    );

    // Match oluştur
    const matchInsert = await pool.query(
      `
      INSERT INTO matches (meal_id, user1_id, user2_id)
      VALUES ($1, $2, $3)
      RETURNING *;
    `,
      [request.meal_id, request.from_user_id, request.to_user_id]
    );

    return res.json(matchInsert.rows[0]);
  } catch (err) {
    console.error("🔥 Match kabul etme hatası:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};

/**
 * POST /match/reject
 * İstek reddedilir
 */
export const rejectMatch = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { request_id } = req.body;

    const check = await pool.query(
      `
      SELECT * FROM match_requests
      WHERE id = $1 AND to_user_id = $2
    `,
      [request_id, uid]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: "İstek bulunamadı" });
    }

    await pool.query(
      `
      UPDATE match_requests
      SET status = 'rejected'
      WHERE id = $1
    `,
      [request_id]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("🔥 Match reddetme hatası:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};
