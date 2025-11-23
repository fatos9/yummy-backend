import admin from "../firebase.js";

export const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token bulunamadı" });
    }

    const token = header.split(" ")[1];

    const decoded = await admin.auth().verifyIdToken(token);

    req.user = {
      uid: decoded.uid || decoded.user_id,
      email: decoded.email
    };

    next();
  } catch (err) {
    console.error("❌ Auth Middleware Hatası:", err);
    return res.status(401).json({ error: "Geçersiz veya süresi dolmuş token" });
  }
};
