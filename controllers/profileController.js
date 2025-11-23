import { pool } from "../db.js";

/**
 * GET /profile/:uid
 * Kullanıcı profil + öğün + istatistikleri döner
 */
export const getProfile = async (req, res) => {
  try {
    const uid = req.params.uid;

    // 1) Kullanıcı bilgisi
    const userQuery = await pool.query(
      `SELECT id, email, username, photo_url, rating, points
       FROM auth_users 
       WHERE id = $1
       LIMIT 1`,
      [uid]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: "Profil bulunamadı" });
    }

    const user = userQuery.rows[0];

    // 2) Kullanıcının öğünleri
    const mealsQuery = await pool.query(
      `SELECT * FROM meals WHERE user_id = $1 ORDER BY createdat DESC`,
      [uid]
    );

    // 3) Eşleşme sayısı
    const matchQuery = await pool.query(
      `SELECT COUNT(*) AS matchCount FROM match_requests WHERE 
        (from_user_id = $1 OR to_user_id = $1) 
        AND status = 'accepted'`,
      [uid]
    );

    const matchCount = Number(matchQuery.rows[0].matchcount);

    // === GERİ DÖNEN FORMAT ===
    const profile = {
      uid: user.id,
      email: user.email,
      username: user.username,
      photo_url: user.photo_url,
      rating: user.rating || 0,
      points: user.points || 0,
      meals: mealsQuery.rows || [],
      matchCount: matchCount,
    };

    return res.json(profile);
  } catch (err) {
    console.error("🔥 Profil çekme hatası:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};

/**
 * POST /profile
 * İlk girişte profil oluşturur
 */
export const createProfile = async (req, res) => {
  try {
    const uid = req.user.uid;
    const email = req.user.email;

    // Zaten var mı?
    const check = await pool.query(
      `SELECT * FROM auth_users WHERE id = $1 LIMIT 1`,
      [uid]
    );

    if (check.rows.length > 0) {
      return res.json(check.rows[0]);
    }

    // Yoksa oluştur
    const query = `
      INSERT INTO auth_users (
        id, email, username, photo_url, rating, points
      ) VALUES ($1, $2, $3, $4, 0, 0)
      RETURNING *;
    `;

    const values = [uid, email, null, null];
    const result = await pool.query(query, values);

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("🔥 Profil oluşturma hatası:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};

/**
 * PATCH /profile
 * Profil güncelleme
 */
export const updateProfile = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { username, photo_url } = req.body;

    const query = `
      UPDATE auth_users
      SET 
        username = COALESCE($1, username),
        photo_url = COALESCE($2, photo_url)
      WHERE id = $3
      RETURNING *;
    `;

    const values = [username, photo_url, uid];

    const result = await pool.query(query, values);

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("🔥 Profil güncelleme hatası:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};
