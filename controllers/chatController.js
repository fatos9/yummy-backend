import { pool } from "../db.js";

/* =====================================================
   1️⃣ TÜM CHAT ROOMLAR (LİSTE)
   GET /chat/rooms
===================================================== */
export const getChatRooms = async (req, res) => {
  try {
    const uid = req.user.uid; // firebase_uid

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
   2️⃣ TEK CHAT ROOM + MESAJLAR + MEAL INFO (FINAL)
   GET /chat/room/:id
===================================================== */
export const getChatRoom = async (req, res) => {
  try {
    const uid = req.user.uid;
    const roomId = Number(req.params.id);

    if (Number.isNaN(roomId)) {
      return res.status(400).json({ error: "Geçersiz room id" });
    }

    // --------------------------------------------------
    // 🔒 CHAT ROOM + YETKİ
    // --------------------------------------------------
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

    // --------------------------------------------------
    // 👤 OTHER USER
    // --------------------------------------------------
    const otherUserUid =
      room.user1_id === uid ? room.user2_id : room.user1_id;

    const otherUserResult = await pool.query(
      `
      SELECT firebase_uid AS uid, username, photo_url
      FROM auth_users
      WHERE firebase_uid = $1
      `,
      [otherUserUid]
    );

    const otherUser = otherUserResult.rows[0] || null;

    // --------------------------------------------------
    // 🍽️ MEAL INFO (SOURCE = MATCH_REQUESTS)
    // --------------------------------------------------
    let mealInfo = null;

    if (room.match_id) {
      const mealResult = await pool.query(
        `
        SELECT
          mr.from_user_id,
          mr.to_user_id,

          sm.id   AS sender_meal_id,
          sm.name AS sender_meal_name,
          sm.image_url AS sender_meal_image,

          rm.id   AS receiver_meal_id,
          rm.name AS receiver_meal_name,
          rm.image_url AS receiver_meal_image

        FROM matches m
        JOIN match_requests mr ON mr.id = m.request_id
        LEFT JOIN meals sm ON sm.id = mr.sender_meal_id
        LEFT JOIN meals rm ON rm.id = mr.meal_id
        WHERE m.id = $1
        `,
        [room.match_id]
      );

      if (mealResult.rows.length) {
        const r = mealResult.rows[0];

        const isSender = r.from_user_id === uid;

        mealInfo = {
          my_meal: isSender
            ? {
                id: r.sender_meal_id,
                name: r.sender_meal_name,
                image: r.sender_meal_image,
              }
            : {
                id: r.receiver_meal_id,
                name: r.receiver_meal_name,
                image: r.receiver_meal_image,
              },

          other_meal: isSender
            ? {
                id: r.receiver_meal_id,
                name: r.receiver_meal_name,
                image: r.receiver_meal_image,
              }
            : {
                id: r.sender_meal_id,
                name: r.sender_meal_name,
                image: r.sender_meal_image,
              },
        };
      }
    }

    // --------------------------------------------------
    // 💬 MESSAGES
    // --------------------------------------------------
    const messagesResult = await pool.query(
      `
      SELECT id, room_id, sender_id, message, created_at
      FROM chat_messages
      WHERE room_id = $1
      ORDER BY created_at ASC
      `,
      [roomId]
    );

    // --------------------------------------------------
    // ✅ RESPONSE
    // --------------------------------------------------
    return res.json({
      room: {
        id: room.id,
        match_id: room.match_id,
        created_at: room.created_at,
      },
      locked: false,
      other_user: otherUser && {
        uid: otherUser.uid,
        username: otherUser.username,
        photo: otherUser.photo_url,
      },
      meal_info: mealInfo,
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
    const uid = req.user.uid; // firebase_uid
    const { room_id, message } = req.body;

    if (!room_id || !message?.trim()) {
      return res.status(400).json({ error: "Eksik veri" });
    }

    // 🔒 Room yetkisi
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

/* =====================================================
   4️⃣ YENİ MESAJLAR (POLLING)
   GET /chat/messages?room_id=&after=
===================================================== */
export const getNewChatMessages = async (req, res) => {
  try {
    const uid = req.user.uid;
    const roomId = Number(req.query.room_id);
    const after = req.query.after;

    if (!roomId || Number.isNaN(roomId) || !after) {
      return res.status(400).json({ error: "Eksik parametre" });
    }

    // 🔒 Room yetkisi
    const roomCheck = await pool.query(
      `
      SELECT id
      FROM chat_rooms
      WHERE id = $1
        AND ($2 = user1_id OR $2 = user2_id)
      `,
      [roomId, uid]
    );

    if (!roomCheck.rows.length) {
      return res.status(403).json({ error: "Yetkisiz erişim" });
    }

    // 💬 SADECE YENİ MESAJLAR
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
        AND created_at > $2
      ORDER BY created_at ASC
      `,
      [roomId, after]
    );

    return res.json({
      messages: messagesResult.rows,
    });
  } catch (err) {
    console.error("🔥 POLLING ERROR:", err);
    return res.status(500).json({ error: "Mesajlar alınamadı" });
  }
};
