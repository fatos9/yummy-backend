// controllers/messagesController.js
import { pool } from "../db.js";

/**
 * GET /chat/room/:room_id
 * Chat odası bilgisi + mesaj listesi döner
 */
export const getChatMessages = async (req, res) => {
  try {
    const roomId = req.params.room_id;

    // 1) Chat oda bilgisi
    const roomQuery = await pool.query(
      `
      SELECT id, user1_id, user2_id, is_locked
      FROM chat_rooms
      WHERE id = $1
      LIMIT 1
      `,
      [roomId]
    );

    if (roomQuery.rows.length === 0) {
      return res.status(404).json({ error: "Chat odası bulunamadı." });
    }

    const room = roomQuery.rows[0];

    // 2) Mesajlar
    const messagesQuery = await pool.query(
      `
      SELECT 
        m.id,
        m.room_id,
        m.sender_id,
        m.message,
        m.created_at,
        u.username,
        u.photo_url
      FROM messages m
      LEFT JOIN auth_users u ON u.firebase_uid = m.sender_id
      WHERE m.room_id = $1
      ORDER BY m.created_at ASC
      `,
      [roomId]
    );

    const isLocked = room.is_locked;

    // 🔥 Tek tip JSON formatı
    return res.json({
      room,
      messages: isLocked ? [] : messagesQuery.rows,
      locked: isLocked
    });

  } catch (err) {
    console.error("🔥 getChatMessages Error:", err);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
};



/**
 * POST /chat/send
 */
export const sendMessage = async (req, res) => {
  try {
    const { room_id, message } = req.body;
    const senderId = req.user.uid;

    // 1) Oda bilgisi
    const room = await pool.query(
      `SELECT is_locked FROM chat_rooms WHERE id=$1`,
      [room_id]
    );

    if (!room.rows.length) {
      return res.status(404).json({ error: "Chat odası yok." });
    }

    if (room.rows[0].is_locked) {
      return res.status(403).json({ error: "Bu sohbet kapanmış. Mesaj gönderemezsin." });
    }

    // 2) Mesaj ekle
    const result = await pool.query(
      `
      INSERT INTO messages (room_id, sender_id, message)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [room_id, senderId, message]
    );

    return res.json(result.rows[0]);

  } catch (err) {
    console.error("🔥 sendMessage Error:", err);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
};


// GET /chat/rooms (kullanıcının tüm chat odaları)
export const getUserChatRooms = async (req, res) => {
  try {
    const uid = req.user.uid;

    const result = await pool.query(`
      SELECT 
        cr.*,
        -- karşı kullanıcı bilgisi
        u.username AS other_username,
        u.photo_url AS other_photo,
        -- son mesaj
        m.message AS last_message,
        m.created_at AS last_message_time
      FROM chat_rooms cr
      
      -- user1-user2 eşleşmesi
      LEFT JOIN auth_users u 
        ON u.firebase_uid = 
          CASE 
            WHEN cr.user1_id = $1 THEN cr.user2_id
            ELSE cr.user1_id
          END

      -- son mesaj
      LEFT JOIN LATERAL (
        SELECT message, created_at
        FROM messages
        WHERE room_id = cr.id
        ORDER BY created_at DESC
        LIMIT 1
      ) m ON true

      WHERE cr.user1_id = $1 OR cr.user2_id = $1
      ORDER BY m.created_at DESC NULLS LAST
    `, [uid]);

    res.json(result.rows);
  } catch (err) {
    console.error("🔥 Rooms list error:", err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
};
