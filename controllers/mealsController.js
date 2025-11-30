// controllers/mealController.js
import { pool } from "../db.js";

/**
 * POST /meals
 * Yeni öğün ekler — günlük 1 öğün limiti (premium hariç)
 */
export const addMeal = async (req, res) => {
  try {
    const {
      name,
      category,
      image_url,
      restaurant_name,
      allergens,
      user_location,
      restaurant_location
    } = req.body;

    if (!name || !image_url) {
      return res.status(400).json({ error: "name ve image_url zorunlu" });
    }

    const userId = req.user.uid;

    // 🔥 Kullanıcı premium mu?
    const userInfo = await pool.query(
      `
      SELECT is_premium
      FROM auth_users
      WHERE firebase_uid = $1
      `,
      [userId]
    );

    const isPremium = userInfo.rows[0]?.is_premium;

    // 🔴 PREMIUM DEĞİLSE GÜNLÜK 1 LİMİT KONTROLÜ
    if (!isPremium) {
      const todaysMeal = await pool.query(
        `
        SELECT id 
        FROM meals
        WHERE user_id = $1
        AND DATE(createdat) = CURRENT_DATE
        LIMIT 1
        `,
        [userId]
      );

      if (todaysMeal.rows.length > 0) {
        return res.status(400).json({
          error: "Bugün zaten bir öğün paylaştın. Yarın tekrar deneyebilirsin."
        });
      }
    }

    // 🔥 ÖĞÜN EKLEME
    const insertMeal = await pool.query(
      `
      INSERT INTO meals (
        name,
        image_url,
        category,
        user_id,
        restaurant_name,
        allergens,
        user_location,
        restaurant_location
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *;
      `,
      [
        name,
        image_url,
        category,
        userId,
        restaurant_name || null,
        allergens || null,
        user_location || null,
        restaurant_location || null
      ]
    );

    return res.json(insertMeal.rows[0]);

  } catch (err) {
    console.error("🔥 Meal ekleme hatası:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};



/**
 * GET /meals
 * Tüm öğünleri listeler
 */
export const getMeals = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM meals
      ORDER BY createdat DESC
    `);

    return res.json(result.rows);

  } catch (err) {
    console.error("🔥 Meal listeleme hatası:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};



/**
 * GET /meals/:id
 * Tekil meal detayı
 */
export const getMealById = async (req, res) => {
  try {
    const mealId = req.params.id;

    const result = await pool.query(
      `SELECT * FROM meals WHERE id = $1 LIMIT 1`,
      [mealId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Öğün bulunamadı" });
    }

    return res.json(result.rows[0]);

  } catch (err) {
    console.error("🔥 Meal detay hatası:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};



/**
 * DELETE /meals/:id
 * Kullanıcı kendi meal'ini silebilir
 */
export const deleteMeal = async (req, res) => {
  try {
    const mealId = req.params.id;
    const userId = req.user.uid;

    // Meal sahibini kontrol et
    const check = await pool.query(
      `SELECT user_id FROM meals WHERE id = $1 LIMIT 1`,
      [mealId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: "Öğün bulunamadı" });
    }

    if (check.rows[0].user_id !== userId) {
      return res.status(403).json({ error: "Bu öğünü silemezsin" });
    }

    // Meal sil
    await pool.query(`DELETE FROM meals WHERE id = $1`, [mealId]);

    return res.json({ success: true });

  } catch (err) {
    console.error("🔥 Meal silme hatası:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};
