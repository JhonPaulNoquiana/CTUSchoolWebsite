const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const databaseUrl = process.env.DATABASE_URL;
const hostname = databaseUrl ? new URL(databaseUrl).hostname : "";
const isSupabase = hostname.endsWith(".supabase.co") || hostname.endsWith(".supabase.com");

// Module Singleton: CommonJS caches this module, so all backend imports share
// one pool per Node.js process. Its multiple connections are managed by pg.
const pool = new Pool({
  connectionString: databaseUrl,
  ...(isSupabase ? {
    ssl: {
      ca: fs.readFileSync(path.join(__dirname, "certs/supabase-ca.crt"), "utf8"),
      rejectUnauthorized: true,
    },
  } : {}),
  connectionTimeoutMillis: 10000,
});

pool.on("connect", () => {
  console.log("✅ Connected to PostgreSQL database");
});

pool.on("error", (err) => {
  console.error("❌ PostgreSQL connection error:", err);
});

module.exports = pool;
