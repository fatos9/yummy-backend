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

    // Kullanıcı bilgisi
    const userInfo = await pool.query(
      `
      SELECT last_accept_at, is_premium
      FROM auth_users
      WHERE firebase_uid = $1
      `,
      [uid]
    );

    const u = userInfo.rows[0];

    // Premium değilse günlük 1 limit
    if (!u.is_premium) {
      const now = new Date();
      const last = u.last_accept_at ? new Date(u.last_accept_at) : null;

      if (last && now - last < 24 * 60 * 60 * 1000) {
        return res.status(400).json({
          error: "Günde yalnızca 1 eşleşme kabul edebilirsin."
        });
      }
    }

    // İstek doğrulama
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

    // Kabul et
    await pool.query(
      `
      UPDATE match_requests
      SET status='accepted'
      WHERE id=$1
    `,
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

    // MATCH OLUŞTUR
    const matchInsert = await pool.query(
      `
      INSERT INTO matches (meal_id, user1_id, user2_id)
      VALUES ($1, $2, $3)
      RETURNING *;
    `,
      [request.meal_id, request.from_user_id, request.to_user_id]
    );

    const match = matchInsert.rows[0];

    // ----------------------------------------------
    // 🔥 BURAYA LOG EKLEDİK — ASIL SORUNUN YERİ
    // ----------------------------------------------

    console.log("📌 MATCH INSERT RESULT:", match);
    console.log(
      "📌 ChatRoom Insert Values:",
      match.id,
      match.user1_id,
      match.user2_id
    );

    let chatRoom;
    try {
      chatRoom = await pool.query(
        `
        INSERT INTO chat_rooms (match_id, user1_id, user2_id)
        VALUES ($1, $2, $3)
        RETURNING *;
      `,
        [match.id, match.user1_id, match.user2_id]
      );
    } catch (err) {
      console.error("🔥 CHAT ROOM INSERT ERROR:", err);

      return res.status(500).json({
        error: "chat room insert error",
        details: err.message,
      });
    }

    // Kullanıcı son kabul zamanını güncelle
    await pool.query(
      `
      UPDATE auth_users
      SET last_accept_at = NOW()
      WHERE firebase_uid=$1
    `,
      [uid]
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
