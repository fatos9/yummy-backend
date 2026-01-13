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

    if (!name || !category) {
      return res.status(400).json({ error: "name ve category zorunlu" });
    }

    const userId = req.user.uid;

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
        allergens,                // ❗ ARRAY olmalı, JSON.stringify değil
        user_location,            // ❗ JSONB ALANI → stringify etmiyoruz
        restaurant_location
      ]
    );

    return res.json(inserted.rows[0]);  // ✔ SAF DÖN
  } catch (err) {
    console.error("🔥 Meal ekleme hatası:", err);
    return res.status(500).json({ error: "Server hatası", detail: err.message });
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

// GET /match/request/:id
export const getMatchRequestById = async (req, res) => {
  try {
    const uid = req.user.uid;
    const requestId = Number(req.params.id);

    if (Number.isNaN(requestId)) {
      return res.status(400).json({ error: "Geçersiz request id" });
    }

    // 1️⃣ Request + meal bilgisi
    const result = await pool.query(
      `
      SELECT
        mr.id,
        mr.status,
        mr.meal_id,
        mr.from_user_id,
        mr.to_user_id,
        m.user_id AS meal_owner_id
      FROM match_requests mr
      JOIN meals m ON m.id = mr.meal_id
      WHERE mr.id = $1
        AND mr.to_user_id = $2
      `,
      [requestId, uid]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "İstek bulunamadı" });
    }

    const row = result.rows[0];

    // 2️⃣ Ben bu öğün için daha önce istek göndermiş miyim?
    const sentCheck = await pool.query(
      `
      SELECT 1
      FROM match_requests
      WHERE meal_id = $1
        AND from_user_id = $2
      LIMIT 1
      `,
      [row.meal_id, uid]
    );

    return res.json({
      request: {
        id: row.id,
        status: row.status,
        meal_id: row.meal_id,
        from_user_id: row.from_user_id,
        to_user_id: row.to_user_id,
      },
      context: {
        isOwner: row.meal_owner_id === uid,
        alreadySent: sentCheck.rows.length > 0,
      },
    });
  } catch (err) {
    console.error("🔥 GET MATCH REQUEST ERROR:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};

// GET /match/context/:mealId
export const getMatchContextByMeal = async (req, res) => {
  try {
    const uid = req.user.uid;
    const mealId = Number(req.params.mealId);

    if (Number.isNaN(mealId)) {
      return res.status(400).json({ error: "Geçersiz meal id" });
    }

    /*
      Bu sorgu şunu yapar:
      - Bu meal ile ilgili
      - Kullanıcının taraf olduğu
      - En güncel match_request'i bulur
    */
    const result = await pool.query(
      `
      SELECT
        mr.id,
        mr.status,
        mr.from_user_id,
        mr.to_user_id,
        mr.meal_id,
        mr.sender_meal_id,
        CASE
          WHEN mr.from_user_id = $1 THEN 'sender'
          WHEN mr.to_user_id = $1 THEN 'receiver'
        END AS role
      FROM match_requests mr
      WHERE
        mr.meal_id = $2
        AND ($1 = mr.from_user_id OR $1 = mr.to_user_id)
      ORDER BY mr.created_at DESC
      LIMIT 1
      `,
      [uid, mealId]
    );

    if (!result.rows.length) {
      return res.json({
        hasMatch: false,
      });
    }

    const row = result.rows[0];

    return res.json({
      hasMatch: true,
      request: {
        id: row.id,
        status: row.status,
        role: row.role,
        meal_id: row.meal_id,
        sender_meal_id: row.sender_meal_id,
        from_user_id: row.from_user_id,
        to_user_id: row.to_user_id,
      },
    });
  } catch (err) {
    console.error("🔥 GET MATCH CONTEXT ERROR:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};
