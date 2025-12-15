import { pool } from "../db.js";

export const getChatRoom = async (req, res) => {
  try {
    const uid = req.user.uid;
    const roomId = Number(req.params.id);

    if (Number.isNaN(roomId)) {
      return res.status(400).json({ error: "Geçersiz room id" });
    }

    // 1️⃣ ROOM KONTROL
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

    // 2️⃣ MESAJLARI ÇEK
    const messagesResult = await pool.query(
      `
      SELECT id, room_id, sender_id, message, created_at
      FROM chat_messages
      WHERE room_id = $1
      ORDER BY created_at ASC
      `,
      [roomId]
    );

    return res.json({
      room,
      locked: false, // ileride match biterse true yaparsın
      messages: messagesResult.rows,
    });

  } catch (err) {
    console.error("🔥 CHAT LOAD ERROR:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};
