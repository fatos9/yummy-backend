import admin from "../firebaseAdmin.js";

export const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token bulunamadı" });
    }

    const token = header.split(" ")[1];

    const decoded = await admin.auth().verifyIdToken(token);

    req.user = {
      uid: decoded.uid,
      email: decoded.email || null,
    };

    next();
  } catch (err) {
    console.error("❌ Auth Hatası:", err);
    return res.status(401).json({ error: "Geçersiz token" });
  }
};
