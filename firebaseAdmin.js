import admin from "firebase-admin";

// 🔥 Service Account otomatik alınacak şekilde ayar
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

export default admin;
