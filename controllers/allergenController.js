import { pool } from "../db.js";

/**
 * GET /allergens
 * Tüm alerjenleri döner
 */
export const getAllergens = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name FROM allergens ORDER BY id ASC`
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("🔥 Alerjen çekme hatası:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};

/**
 * POST /allergens
 * Yeni alerjen ekler
 */
export const addAllergen = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Alerjen ismi zorunlu" });
    }

    const result = await pool.query(
      `
      INSERT INTO allergens (name)
      VALUES ($1)
      RETURNING *;
      `,
      [name]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("🔥 Alerjen ekleme hatası:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};
