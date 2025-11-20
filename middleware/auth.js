import admin from "../firebase.js";

export const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    // Token yoksa
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Token bulunamadı"
      });
    }

    const token = header.split(" ")[1];

    // Firebase token doğrulama
    const decoded = await admin.auth().verifyIdToken(token);

    // Kullanıcıyı request içine ekle
    req.user = {
      uid: decoded.user_id || decoded.uid,
      email: decoded.email,
      ...decoded
    };

    next(); // devam et
  } catch (err) {
    console.error("❌ Auth Middleware Hatası:", err);
    return res.status(401).json({
      error: "Geçersiz veya süresi dolmuş token"
    });
  }
};
