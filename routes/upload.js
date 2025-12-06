import express from "express";
import { v4 as uuid } from "uuid";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { initializeApp } from "firebase/app";

const router = express.Router();

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  storageBucket: process.env.FIREBASE_BUCKET,
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

router.post("/", async (req, res) => {
  try {
    const { base64, fileName } = req.body;

    if (!base64) {
      return res.status(400).json({ error: "base64 yok" });
    }

    const buffer = Buffer.from(base64, "base64");

    const fileRef = ref(storage, `meals/${uuid()}_${fileName}`);

    await uploadBytes(fileRef, buffer, {
      contentType: "image/jpeg",
    });

    const url = await getDownloadURL(fileRef);

    return res.json({ url });
  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ error: "Upload hata" });
  }
});

export default router;
