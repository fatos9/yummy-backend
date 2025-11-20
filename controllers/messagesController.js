import { pool } from "../db.js";

/**
 * GET /chat/:match_id
 * Bir match'in mesaj geçmişini döner
 */
export const getChatMessages = async (req, res) => {
  try {
    const matchId = req.params.match_id;

    const result = await pool.query(
      `
      SELECT m.*, u.username AS sender_name, u.photo_url AS sender_photo
      FROM messages m
      LEFT JOIN auth_users u ON u.id = m.sender_id
      WHERE m.match_id = $1
      ORDER BY m.createdat ASC;
      `,
      [matchId]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("🔥 Mesaj geçmişi hatası:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};


/**
 * POST /chat/send
 * Sohbete mesaj gönderme
 */
export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user.uid;
    const { match_id, message } = req.body;

    if (!match_id || !message) {
      return res.status(400).json({ error: "Eksik alanlar var" });
    }

    const result = await pool.query(
      `
      INSERT INTO messages (match_id, sender_id, message)
      VALUES ($1, $2, $3)
      RETURNING *;
      `,
      [match_id, senderId, message]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("🔥 Mesaj gönderme hatası:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};
