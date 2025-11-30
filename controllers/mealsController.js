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

    // 🔥 KULLANICI BİLGİSİ (premium + last_meal_at)
    const userInfo = await pool.query(
      `
      SELECT last_meal_at, is_premium
      FROM auth_users
      WHERE firebase_uid = $1
      `,
      [userId]
    );

    const u = userInfo.rows[0];

    // Premium değilse günlük limit kontrolü
    if (!u.is_premium) {
      const now = new Date();
      const last = u.last_meal_at ? new Date(u.last_meal_at) : null;

      if (last && now - last < 24 * 60 * 60 * 1000) {
        return res.status(400).json({
          error: "Günde yalnızca 1 öğün ekleyebilirsin. 24 saat sonra tekrar dene."
        });
      }
    }

    // 🔥 ÖĞÜN EKLEME
    const query = `
      INSERT INTO meals (
        name,
        image_url,
        category,
        user_id,
        restaurant_name,
        allergens,
        user_location,
        restaurant_location
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8
      )
      RETURNING *;
    `;

    const values = [
      name,
      image_url,
      category,
      userId,
      restaurant_name,
      allergens || null,
      user_location || null,
      restaurant_location || null
    ];

    const result = await pool.query(query, values);

    // 🔥 last_meal_at güncelle
    await pool.query(
      `
      UPDATE auth_users
      SET last_meal_at = NOW()
      WHERE firebase_uid = $1
      `,
      [userId]
    );

    return res.json(result.rows[0]);

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
    const query = `SELECT * FROM meals ORDER BY createdat DESC`;
    const result = await pool.query(query);

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
      `SELECT * FROM meals WHERE id = $1 LIMIT 1`,
      [mealId]
    );

    if (check.rows.length === 0)
      return res.status(404).json({ error: "Öğün bulunamadı" });

    if (check.rows[0].user_id !== userId)
      return res.status(403).json({ error: "Bu öğünü silemezsin" });

    await pool.query(`DELETE FROM meals WHERE id = $1`, [mealId]);

    return res.json({ success: true });
  } catch (err) {
    console.error("🔥 Meal silme hatası:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};
