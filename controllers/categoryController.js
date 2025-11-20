import { pool } from "../db.js";

/**
 * GET /categories
 * Tüm kategorileri döner
 */
export const getCategories = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, image_url FROM categories ORDER BY id ASC`
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("🔥 Category çekme hatası:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};


/**
 * POST /categories
 * Yeni kategori ekler (şimdilik kullanmayacaksın ama dursun)
 */
export const addCategory = async (req, res) => {
  try {
    const { name, image_url } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Kategori ismi zorunlu" });
    }

    const result = await pool.query(
      `
      INSERT INTO categories (name, image_url)
      VALUES ($1, $2)
      RETURNING *;
      `,
      [name, image_url || null]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("🔥 Category ekleme hatası:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};
