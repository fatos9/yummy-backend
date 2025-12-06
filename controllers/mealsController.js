// controllers/mealController.js
import { pool } from "../db.js";

/**
 * 📌 JSON Parse Helper — DB'de bozuk data olsa bile patlamasını engeller
 */
const safeJSON = (value) => {
  if (!value) return null;
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return null;
  }
};

/**
 * --------------------------------------------------------------------
 *  POST /meals → Yeni öğün ekle (FINAL VERSION)
 * --------------------------------------------------------------------
 */
export const addMeal = async (req, res) => {
  try {
    const {
      name,
      category,
      image_url,
      restaurant_name,
      allergens = [],
      user_location = null,
      restaurant_location = null
    } = req.body;

    // ---------------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------------
    if (!name) {
      return res.status(400).json({ error: "Yemek adı zorunlu" });
    }

    if (!category) {
      return res.status(400).json({ error: "Kategori zorunlu" });
    }

    const userId = req.user.uid;

    // ---------------------------------------------------------
    // PREMIUM CHECK
    // ---------------------------------------------------------
    const userInfo = await pool.query(
      `SELECT is_premium FROM auth_users WHERE firebase_uid = $1`,
      [userId]
    );

    const isPremium = userInfo.rows[0]?.is_premium === true;

    // ---------------------------------------------------------
    // GÜNLÜK LIMIT
    // ---------------------------------------------------------
    if (!isPremium) {
      const todaysMeal = await pool.query(
        `
        SELECT id 
        FROM meals
        WHERE user_id = $1
        AND DATE(createdat) = CURRENT_DATE
        `,
        [userId]
      );

      if (todaysMeal.rows.length > 0) {
        return res.status(400).json({
          error: "Bugün zaten bir öğün paylaştın. Yarın tekrar deneyebilirsin."
        });
      }
    }

    // ---------------------------------------------------------
    // ALLERGENS → PG ARRAY FORMAT
    // ["A","B"] --> {"A","B"}
    // ---------------------------------------------------------
    const pgAllergens =
      Array.isArray(allergens) && allergens.length > 0
        ? `{${allergens.map(a => `"${a}"`).join(",")}}`
        : null;

    // ---------------------------------------------------------
    // JSON KOLONLARI
    // ---------------------------------------------------------
    const pgUserLoc = user_location ? JSON.stringify(user_location) : null;
    const pgRestLoc = restaurant_location ? JSON.stringify(restaurant_location) : null;

    // ---------------------------------------------------------
    // DB'YE KAYDET
    // ---------------------------------------------------------
    const inserted = await pool.query(
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
        image_url || null,
        category,
        userId,
        restaurant_name || null,
        pgAllergens,
        pgUserLoc,
        pgRestLoc
      ]
    );

    const meal = inserted.rows[0];

    // ---------------------------------------------------------
    // RESPONSE (JSON formatına geri çeviriyoruz)
    // ---------------------------------------------------------
    const parsedMeal = {
      ...meal,
      allergens: meal.allergens || [],
      user_location: meal.user_location ? JSON.parse(meal.user_location) : null,
      restaurant_location: meal.restaurant_location ? JSON.parse(meal.restaurant_location) : null,
    };

    return res.json(parsedMeal);

  } catch (err) {
    console.error("🔥 Meal ekleme hatası:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};


/**
 * --------------------------------------------------------------------
 *  GET /meals → Tüm öğünleri listele
 * --------------------------------------------------------------------
 */
export const getMeals = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM meals
      ORDER BY createdat DESC
    `);

    const meals = result.rows.map((meal) => ({
      ...meal,
      allergens: safeJSON(meal.allergens),
      user_location: safeJSON(meal.user_location),
      restaurant_location: safeJSON(meal.restaurant_location)
    }));

    return res.json(meals);

  } catch (err) {
    console.error("🔥 Meal listeleme hatası:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};

/**
 * --------------------------------------------------------------------
 *  GET /meals/:id → Tekil meal detayı
 * --------------------------------------------------------------------
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

    const meal = result.rows[0];

    return res.json({
      ...meal,
      allergens: safeJSON(meal.allergens),
      user_location: safeJSON(meal.user_location),
      restaurant_location: safeJSON(meal.restaurant_location)
    });

  } catch (err) {
    console.error("🔥 Meal detay hatası:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};

/**
 * --------------------------------------------------------------------
 *  DELETE /meals/:id → Kullanıcı kendi meal’ini silebilir
 * --------------------------------------------------------------------
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

    await pool.query(`DELETE FROM meals WHERE id = $1`, [mealId]);

    return res.json({ success: true });

  } catch (err) {
    console.error("🔥 Meal silme hatası:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};
