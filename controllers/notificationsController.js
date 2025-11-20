import { pool } from "../db.js";

/**
 * GET /notifications
 * Kullanıcının tüm bildirimleri
 */
export const getNotifications = async (req, res) => {
  try {
    const uid = req.user.uid;

    const result = await pool.query(
      `
      SELECT *
      FROM notifications
      WHERE user_id = $1
      ORDER BY createdat DESC;
      `,
      [uid]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("🔥 Bildirim listeleme hatası:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};

/**
 * POST /notifications/add
 * Yeni bildirim ekle
 */
export const addNotification = async (req, res) => {
  try {
    const { user_id, message } = req.body;

    if (!user_id || !message) {
      return res.status(400).json({ error: "Eksik alanlar var" });
    }

    const result = await pool.query(
      `
      INSERT INTO notifications (user_id, message)
      VALUES ($1, $2)
      RETURNING *;
      `,
      [user_id, message]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("🔥 Bildirim ekleme hatası:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};

/**
 * POST /notifications/read
 * Bildirimi okundu yap
 */
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) return res.status(400).json({ error: "id eksik" });

    await pool.query(
      `
      UPDATE notifications
      SET is_read = true
      WHERE id = $1;
      `,
      [id]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("🔥 Bildirim okundu işaretleme hatası:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};
