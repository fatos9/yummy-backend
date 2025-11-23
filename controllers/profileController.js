import { pool } from "../db.js";

/**
 * GET /profile/:uid
 * Kullanıcı profil + öğün + istatistik döner
 */
export const getProfile = async (req, res) => {
  try {
    const uid = req.params.uid;

    // 1) Kullanıcıyı çek
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
      `SELECT COUNT(*) AS count 
       FROM match_requests 
       WHERE (from_user_id = $1 OR to_user_id = $1)
       AND status = 'accepted'`,
      [uid]
    );

    const matchCount = Number(matchQuery.rows[0].count);

    // === FRONTEND'İN BEKLEDİĞİ JSON ===
    return res.json({
      user: {
        uid: user.id,
        email: user.email,
        username: user.username,
        photo_url: user.photo_url,
        rating: user.rating || 0,
        points: user.points || 0,
      },
      meals: mealsQuery.rows,
      matchCount: matchCount,
      points: user.points || 0,
    });
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

    // Profil zaten var mı?
    const existing = await pool.query(
      `SELECT * FROM auth_users WHERE id = $1 LIMIT 1`,
      [uid]
    );

    if (existing.rows.length > 0) {
      return res.json(existing.rows[0]);
    }

    // Yeni profil oluştur
    const insert = await pool.query(
      `INSERT INTO auth_users 
       (id, email, username, photo_url, rating, points)
       VALUES ($1, $2, $3, $4, 0, 0)
       RETURNING *`,
      [uid, email, null, null]
    );

    return res.json(insert.rows[0]);
  } catch (err) {
    console.error("🔥 Profil oluşturma hatası:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};



/**
 * PATCH /profile
 * Profil günceller
 */
export const updateProfile = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { username, photo_url } = req.body;

    const update = await pool.query(
      `UPDATE auth_users
       SET 
         username = COALESCE($1, username),
         photo_url = COALESCE($2, photo_url)
       WHERE id = $3
       RETURNING *`,
      [username, photo_url, uid]
    );

    return res.json(update.rows[0]);
  } catch (err) {
    console.error("🔥 Profil güncelleme hatası:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};
