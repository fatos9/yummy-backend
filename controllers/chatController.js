import { pool } from "../db.js";

export const getChatRoom = async (req, res) => {
  try {
    const roomId = req.params.id;
    const uid = req.user.uid;

    const room = await pool.query(
      `
      SELECT *
      FROM chat_rooms
      WHERE id = $1
        AND (user1_id = $2 OR user2_id = $2)
      `,
      [roomId, uid]
    );

    if (!room.rows.length) {
      return res.status(404).json({ error: "Chat room bulunamadı" });
    }

    return res.json({
      room: room.rows[0],
      messages: []
    });
  } catch (err) {
    console.error("CHAT LOAD ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
};
