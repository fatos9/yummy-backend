import { pool } from "../db.js";

/**
 * GET /profile/:uid
 * Kullanıcı profilini getirir
 */
export const getProfile = async (req, res) => {
  try {
    const uid = req.params.uid;

    const result = await pool.query(
      `SELECT * FROM auth_users WHERE id = $1 LIMIT 1`,
      [uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Profil bulunamadı" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("🔥 Profil çekme hatası:", err);
    return res.status(500).json({ error: "Server hatası" });
  }
};

/**
 * POST /profile
 * Yeni kullanıcı profil kaydı oluşturur
 * Eğer zaten varsa → o profili döner
 */
export const createProfile = async (req, res) => {
  try {
    const uid = req.user.uid;
    const email = req.user.email;

    // Var mı kontrol et
    const check = await pool.query(
      `SELECT * FROM auth_users WHERE id = $1 LIMIT 1`,
      [uid]
    );

    if (check.rows.length > 0) {
      return res.json(check.rows[0]); // profil zaten var → geri döner
    }

    // Yeni profil oluştur
    const query = `
      INSERT INTO auth_users (
        id, email, username, photo_url
      ) VALUES ($1, $2, $3, $4)
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
 * Kullanıcı profilini günceller
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
