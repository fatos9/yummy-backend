import { pool } from "../db.js";

/* =====================================================
   1️⃣ TÜM CHAT ROOMLAR (LİSTE)
   GET /chat/rooms
===================================================== */
export const getChatRooms = async (req, res) => {
  try {
    const uid = req.user.uid;

    const result = await pool.query(
      `
      SELECT
        cr.id AS room_id,
        cr.created_at,

        -- karşı taraf
        u.firebase_uid AS other_user_id,
        u.username,
        u.photo_url,

        -- son mesaj
        (
          SELECT cm.message
          FROM chat_messages cm
          WHERE cm.room_id = cr.id
          ORDER BY cm.created_at DESC
          LIMIT 1
        ) AS last_message,

        (
          SELECT cm.created_at
          FROM chat_messages cm
          WHERE cm.room_id = cr.id
          ORDER BY cm.created_at DESC
          LIMIT 1
        ) AS last_message_at

      FROM chat_rooms cr

      JOIN auth_users u
        ON u.firebase_uid =
          CASE
            WHEN cr.user1_id = $1 THEN cr.user2_id
            ELSE cr.user1_id
          END

      WHERE cr.user1_id = $1 OR cr.user2_id = $1
      ORDER BY last_message_at DESC NULLS LAST, cr.created_at DESC
      `,
      [uid]
    );

    return res.json(result.rows);

  } catch (err) {
    console.error("🔥 CHAT ROOMS ERROR:", err);
    return res.status(500).json({ error: "Chat listesi alınamadı" });
  }
};

/* =====================================================
   2️⃣ TEK CHAT ROOM + MESAJLAR
   GET /chat/room/:id
===================================================== */
/* =====================================================
   2️⃣ TEK CHAT ROOM + MESAJLAR + OTHER USER
   GET /chat/room/:id
===================================================== */
export const getChatRoom = async (req, res) => {
  try {
    const uid = req.user.uid;
    const roomId = Number(req.params.id);

    if (Number.isNaN(roomId)) {
      return res.status(400).json({ error: "Geçersiz room id" });
    }

    // 🔎 ROOM + YETKİ KONTROLÜ
    const roomResult = await pool.query(
      `
      SELECT *
      FROM chat_rooms
      WHERE id = $1
        AND ($2 = user1_id OR $2 = user2_id)
      `,
      [roomId, uid]
    );

    if (!roomResult.rows.length) {
      return res.status(404).json({ error: "Chat room bulunamadı" });
    }

    const room = roomResult.rows[0];

    // 👤 OTHER USER ID
    const otherUserId =
      room.user1_id === uid ? room.user2_id : room.user1_id;

    // 👤 OTHER USER INFO
    const otherUserResult = await pool.query(
      `
      SELECT
        id,
        username,
        photo_url
      FROM auth_users
      WHERE id = $1
      `,
      [otherUserId]
    );

    const otherUser = otherUserResult.rows[0] || null;

    // 💬 MESAJLAR
    const messagesResult = await pool.query(
      `
      SELECT
        id,
        room_id,
        sender_id,
        message,
        created_at
      FROM chat_messages
      WHERE room_id = $1
      ORDER BY created_at ASC
      `,
      [roomId]
    );

    return res.json({
      room: {
        id: room.id,
        match_id: room.match_id,
        created_at: room.created_at,
      },
      locked: false,
      other_user: otherUser && {
        id: otherUser.uid,
        username: otherUser.username,
        photo: otherUser.photo_url,
      },
      messages: messagesResult.rows,
    });

  } catch (err) {
    console.error("🔥 CHAT LOAD ERROR:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};

/* =====================================================
   3️⃣ MESAJ GÖNDER
   POST /chat/send
===================================================== */
export const sendChatMessage = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { room_id, message } = req.body;

    if (!room_id || !message?.trim()) {
      return res.status(400).json({ error: "Eksik veri" });
    }

    // 🔒 Room kontrolü (yetki)
    const roomCheck = await pool.query(
      `
      SELECT id
      FROM chat_rooms
      WHERE id = $1
        AND ($2 = user1_id OR $2 = user2_id)
      `,
      [room_id, uid]
    );

    if (!roomCheck.rows.length) {
      return res.status(403).json({ error: "Bu sohbet sana ait değil" });
    }

    // 💬 Mesaj ekle
    const insert = await pool.query(
      `
      INSERT INTO chat_messages (room_id, sender_id, message)
      VALUES ($1, $2, $3)
      RETURNING id, room_id, sender_id, message, created_at
      `,
      [room_id, uid, message.trim()]
    );

    return res.json(insert.rows[0]);

  } catch (err) {
    console.error("🔥 SEND MESSAGE ERROR:", err);
    return res.status(500).json({ error: "Mesaj gönderilemedi" });
  }
};
