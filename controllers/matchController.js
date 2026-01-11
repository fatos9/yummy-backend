// controllers/matchController.js
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

    const check = await pool.query(
      `
      SELECT 1 FROM match_requests
      WHERE from_user_id=$1 AND to_user_id=$2 AND meal_id=$3
      `,
      [fromUserId, to_user_id, meal_id]
    );

    if (check.rows.length) {
      return res.json({ message: "Zaten istek gönderilmiş" });
    }

    const senderMeal = await pool.query(
      `
      SELECT id FROM meals
      WHERE user_id=$1
      ORDER BY createdat DESC
      LIMIT 1
      `,
      [fromUserId]
    );

    if (!senderMeal.rows.length) {
      return res.status(400).json({
        error: "Göndericiye ait öğün bulunamadı"
      });
    }

    const senderMealId = senderMeal.rows[0].id;

    console.log("📌 MATCH INSERT VALUES:", {
      fromUserId,
      to_user_id,
      meal_id,
      senderMealId
    });

    const insert = await pool.query(
      `
      INSERT INTO match_requests
      (from_user_id, to_user_id, meal_id, sender_meal_id)
      VALUES ($1,$2,$3,$4)
      RETURNING *;
      `,
      [fromUserId, to_user_id, meal_id, senderMealId]
    );

    return res.json(insert.rows[0]);
  } catch (err) {
    console.error("🔥 Match istek gönderme hatası:", err);
    return res.status(500).json({ error: err.message });
  }
};



/**
 * GET /match/received
 */
export const getReceivedMatches = async (req, res) => {
  try {
    const uid = req.user.uid;

    const result = await pool.query(
      `
      SELECT 
        mr.*,
        u.username AS sender_name,
        u.photo_url AS sender_photo,
        m.id AS sender_meal_id,
        m.name AS sender_meal_name,
        m.image_url AS sender_meal_image
      FROM match_requests mr
      LEFT JOIN auth_users u ON u.firebase_uid = mr.from_user_id
      LEFT JOIN meals m ON m.id = mr.sender_meal_id
      WHERE mr.to_user_id = $1
      ORDER BY mr.created_at DESC
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
 */
export const getSentMatches = async (req, res) => {
  try {
    const uid = req.user.uid;

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
 * Match oluşur → chatroom oluşur
 */
export const acceptMatch = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { request_id } = req.body;

    if (!request_id) {
      return res.status(400).json({ error: "request_id eksik" });
    }

    // İstek doğrula
    const check = await pool.query(
      `
      SELECT *
      FROM match_requests
      WHERE id = $1 AND to_user_id = $2
      `,
      [request_id, uid]
    );

    if (!check.rows.length) {
      return res.status(404).json({ error: "İstek bulunamadı" });
    }

    const request = check.rows[0];

    // Kabul et
    await pool.query(
      `UPDATE match_requests SET status='accepted' WHERE id=$1`,
      [request_id]
    );

    // Diğer pendingleri reddet
    await pool.query(
      `
      UPDATE match_requests
      SET status='rejected'
      WHERE to_user_id=$1 AND id != $2 AND status='pending'
      `,
      [uid, request_id]
    );

    // 🔥 MATCH OLUŞTUR — KRİTİK
    const matchInsert = await pool.query(
      `
      INSERT INTO matches
        (
          user1_id,
          user2_id,
          user1_meal_id,
          user2_meal_id,
          request_id
        )
      VALUES
        ($1, $2, $3, $4, $5)
      RETURNING *;
      `,
      [
        request.from_user_id,   // user1
        request.to_user_id,     // user2
        request.sender_meal_id, // user1_meal_id
        request.meal_id,        // user2_meal_id
        request.id              // request_id
      ]
    );

    const match = matchInsert.rows[0];

    // 💬 CHAT ROOM
    const chatRoom = await pool.query(
      `
      INSERT INTO chat_rooms (match_id, user1_id, user2_id)
      VALUES ($1, $2, $3)
      RETURNING *;
      `,
      [match.id, match.user1_id, match.user2_id]
    );

    return res.json({
      match,
      room: chatRoom.rows[0],
    });

  } catch (err) {
    console.error("🔥 Match kabul hatası:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};

/**
 * POST /match/reject
 */
export const rejectMatch = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { request_id } = req.body;

    if (!request_id) {
      return res.status(400).json({ error: "request_id eksik" });
    }

    const check = await pool.query(
      `
      SELECT id FROM match_requests
      WHERE id=$1 AND to_user_id=$2 AND status='pending'
      `,
      [request_id, uid]
    );

    if (!check.rows.length) {
      return res.status(404).json({ error: "İstek bulunamadı / işlem yapılmış" });
    }

    await pool.query(`
      UPDATE match_requests
      SET status='rejected'
      WHERE id=$1
    `, [request_id]);

    return res.json({ success: true });

  } catch (err) {
    console.error("🔥 Reject error:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};
