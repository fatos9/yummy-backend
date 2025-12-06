import pkg from "pg";
const { Pool } = pkg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on("connect", () => {
  console.log("📦 PostgreSQL bağlantısı başarılı!");
});

pool.on("error", (err) => {
  console.error("❌ PostgreSQL Pool Hatası:", err);
});
