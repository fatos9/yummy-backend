import { pool } from "../db.js";

// ---------------------------------------------------
// GET /chat/room/:room_id
// ---------------------------------------------------
export const getChatMessages = async (req, res) => {
  try {
    const roomId = parseInt(req.params.room_id, 10);

    if (isNaN(roomId)) {
      return res.status(400).json({ error: "room_id geçersiz" });
    }

    const roomQuery = await pool.query(
      `SELECT id, user1_id, user2_id, is_locked
       FROM chat_rooms
       WHERE id = $1`,
      [roomId]
    );

    if (!roomQuery.rows.length) {
      return res.status(404).json({ error: "Chat odası bulunamadı" });
    }

    const room = roomQuery.rows[0];

    const msgQ = await pool.query(
      `SELECT 
         m.id,
         m.room_id,
         m.sender_id,
         m.message,
         m.created_at,
         u.username,
         u.photo_url
       FROM messages m
       LEFT JOIN auth_users u ON u.uid = m.sender_id
       WHERE m.room_id = $1
       ORDER BY m.created_at ASC`,
      [roomId]
    );

    return res.json({
      room,
      messages: msgQ.rows,
      locked: room.is_locked,
    });

  } catch (err) {
    console.error("🔥 getChatMessages Error:", err);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
};

// ---------------------------------------------------
// POST /chat/send
// ---------------------------------------------------
export const sendMessage = async (req, res) => {
  try {
    const { room_id, message } = req.body;
    const senderId = req.user.uid;

    const check = await pool.query(
      `SELECT id, is_locked FROM chat_rooms WHERE id=$1`,
      [room_id]
    );

    if (!check.rows.length)
      return res.status(404).json({ error: "Chat odası yok" });

    if (check.rows[0].is_locked)
      return res.status(403).json({ error: "Sohbet kapanmış" });

    const insert = await pool.query(
      `INSERT INTO messages (room_id, sender_id, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [room_id, senderId, message]
    );

    return res.json(insert.rows[0]);
  } catch (err) {
    console.error("🔥 sendMessage Error:", err);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
};

// ---------------------------------------------------
// GET /chat/rooms
// ---------------------------------------------------
export const getUserChatRooms = async (req, res) => {
  try {
    const uid = req.user.uid;

    const q = await pool.query(
      `SELECT 
         cr.*,
         u.username AS other_username,
         u.photo_url AS other_photo,
         m.message AS last_message,
         m.created_at AS last_message_time
       FROM chat_rooms cr
       LEFT JOIN auth_users u
         ON u.uid = 
           CASE WHEN cr.user1_id = $1 THEN cr.user2_id ELSE cr.user1_id END
       LEFT JOIN LATERAL (
         SELECT message, created_at
         FROM messages
         WHERE room_id = cr.id
         ORDER BY created_at DESC
         LIMIT 1
       ) m ON true
       WHERE cr.user1_id = $1 OR cr.user2_id = $1
       ORDER BY last_message_time DESC NULLS LAST`,
      [uid]
    );

    return res.json(q.rows);

  } catch (err) {
    console.error("🔥 Rooms list error:", err);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
};
