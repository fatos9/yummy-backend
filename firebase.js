import admin from "firebase-admin";

// Base64 → UTF-8 → JSON
const decoded = Buffer.from(
  process.env.FIREBASE_SERVICE_ACCOUNT,
  "base64"
).toString("utf-8");

const serviceAccount = JSON.parse(decoded);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

export default admin;
