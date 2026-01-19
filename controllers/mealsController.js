// controllers/mealController.js
import { pool } from "../db.js";

/* --------------------------------------------------
   JSON SAFE HELPER
-------------------------------------------------- */
const safeJSON = (value) => {
  if (!value) return null;
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return null;
  }
};

/* ==================================================
   MEALS
================================================== */

/**
 * POST /meals
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
      restaurant_location = null,
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
        allergens,
        user_location,
        restaurant_location,
      ]
    );

    return res.json(inserted.rows[0]);
  } catch (err) {
    console.error("🔥 Meal ekleme hatası:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};

/**
 * GET /meals
 */
export const getMeals = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM meals
      ORDER BY created_at DESC
    `);

    return res.json(
      result.rows.map((meal) => ({
        ...meal,
        allergens: safeJSON(meal.allergens),
        user_location: safeJSON(meal.user_location),
        restaurant_location: safeJSON(meal.restaurant_location),
      }))
    );
  } catch (err) {
    console.error("🔥 Meal listeleme hatası:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};

/**
 * GET /meals/:id
 */
export const getMealById = async (req, res) => {
  try {
    const mealId = Number(req.params.id);

    const result = await pool.query(
      `SELECT * FROM meals WHERE id = $1 LIMIT 1`,
      [mealId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Öğün bulunamadı" });
    }

    const meal = result.rows[0];

    return res.json({
      ...meal,
      allergens: safeJSON(meal.allergens),
      user_location: safeJSON(meal.user_location),
      restaurant_location: safeJSON(meal.restaurant_location),
    });
  } catch (err) {
    console.error("🔥 Meal detay hatası:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};

/**
 * DELETE /meals/:id
 */
export const deleteMeal = async (req, res) => {
  try {
    const mealId = Number(req.params.id);
    const userId = req.user.uid;

    const check = await pool.query(
      `SELECT user_id FROM meals WHERE id = $1`,
      [mealId]
    );

    if (!check.rows.length) {
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

/* ==================================================
   MATCH
================================================== */

/**
 * POST /match/send
 */
export const sendMatchRequest = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { to_user_id, meal_id } = req.body;

    if (!to_user_id || !meal_id) {
      return res.status(400).json({ error: "Eksik parametre" });
    }

    // sender meal
    const senderMeal = await pool.query(
      `
      SELECT id
      FROM meals
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [uid]
    );

    if (!senderMeal.rows.length) {
      return res.status(400).json({ error: "Gönderenin öğünü yok" });
    }

    const senderMealId = senderMeal.rows[0].id;

    const inserted = await pool.query(
      `
      INSERT INTO match_requests (
        from_user_id,
        to_user_id,
        meal_id,
        sender_meal_id,
        context_meal_id
      )
      VALUES ($1,$2,$3,$4,$5)
      RETURNING id
      `,
      [uid, to_user_id, meal_id, senderMealId, meal_id]
    );

    return res.json({ id: inserted.rows[0].id });
  } catch (err) {
    console.error("🔥 MATCH SEND ERROR:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};

/**
 * GET /match/context/:mealId
 */
export const getMatchContextByMeal = async (req, res) => {
  try {
    const uid = req.user.uid;
    const mealId = Number(req.params.mealId);

    const meal = await pool.query(
      `SELECT user_id FROM meals WHERE id = $1`,
      [mealId]
    );

    if (!meal.rows.length) {
      return res.status(404).json({ error: "Meal not found" });
    }

    if (meal.rows[0].user_id === uid) {
      return res.json({ isOwnMeal: true });
    }

    const result = await pool.query(
      `
      SELECT
        mr.id,
        mr.status,
        mr.sender_meal_id,
        mr.meal_id,
        CASE
          WHEN mr.from_user_id = $1 THEN 'sender'
          WHEN mr.to_user_id = $1 THEN 'receiver'
        END AS role
      FROM match_requests mr
      WHERE
        mr.context_meal_id = $2
        AND ($1 = mr.from_user_id OR $1 = mr.to_user_id)
      ORDER BY mr.created_at DESC
      LIMIT 1
      `,
      [uid, mealId]
    );

    if (!result.rows.length) {
      return res.json({ isOwnMeal: false, hasMatch: false });
    }

    const row = result.rows[0];

    return res.json({
      isOwnMeal: false,
      hasMatch: true,
      request: {
        id: row.id,
        status: row.status,
        role: row.role,
        sender_meal_id: row.sender_meal_id,
        meal_id: row.meal_id,
      },
    });
  } catch (err) {
    console.error("🔥 GET MATCH CONTEXT ERROR:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};
