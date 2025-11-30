// controllers/messagesController.js
import { pool } from "../db.js";

/**
 * GET /chat/room/:room_id
 */
export const getChatMessages = async (req, res) => {
  try {
    const roomId = req.params.room_id;

    const result = await pool.query(`
      SELECT m.*, u.username, u.photo_url
      FROM messages m
      LEFT JOIN auth_users u ON u.uid = m.sender_id
      WHERE m.room_id=$1
      ORDER BY m.created_at ASC
    `, [roomId]);

    res.json(result.rows);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/**
 * POST /chat/send
 */
export const sendMessage = async (req, res) => {
  try {
    const { room_id, message } = req.body;
    const senderId = req.user.uid;

    // Oda kilitli mi?
    const room = await pool.query(`
      SELECT is_locked FROM chat_rooms WHERE id=$1
    `, [room_id]);

    if (!room.rows.length) {
      return res.status(404).json({ error: "Chat odası yok." });
    }

    if (room.rows[0].is_locked) {
      return res.status(403).json({ error: "Sohbet kapanmış." });
    }

    const result = await pool.query(`
      INSERT INTO messages (room_id, sender_id, message)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [room_id, senderId, message]);

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
