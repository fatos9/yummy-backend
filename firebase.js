import admin from "firebase-admin";

// Base64 → JSON decode
const decodedServiceAccount = Buffer.from(
  process.env.FIREBASE_SERVICE_ACCOUNT,
  "base64"
).toString("utf-8");

const serviceAccount = JSON.parse(decodedServiceAccount);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

export default admin;
