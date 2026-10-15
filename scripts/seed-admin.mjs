import "dotenv/config";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

const name = process.env.ADMIN_NAME?.trim();
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to seed an administrator.");
}
if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error("Set ADMIN_NAME and a valid ADMIN_EMAIL before seeding.");
}
if (!password || password.length < 12) {
  throw new Error("ADMIN_PASSWORD must contain at least 12 characters.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();

try {
  const hashedPassword = await bcrypt.hash(password, 12);
  await client.query("BEGIN");

  const existing = await client.query(
    'SELECT "id" FROM "users" WHERE lower(trim("email")) = $1 FOR UPDATE',
    [email],
  );

  let result;
  if (existing.rowCount > 0) {
    result = await client.query(
      'UPDATE "users" SET "name" = $1, "email" = $2, "password" = $3, "role" = \'ADMIN\', "isVerified" = true, "updatedAt" = now() WHERE "id" = $4 RETURNING "id", "email"',
      [name, email, hashedPassword, existing.rows[0].id],
    );
  } else {
    result = await client.query(
      'INSERT INTO "users" ("name", "email", "password", "phoneNumber", "role", "isVerified") VALUES ($1, $2, $3, \'\', \'ADMIN\', true) RETURNING "id", "email"',
      [name, email, hashedPassword],
    );
  }

  await client.query("COMMIT");
  console.info(`Administrator account ready for ${result.rows[0].email} (user ID ${result.rows[0].id}).`);
} catch (error) {
  await client.query("ROLLBACK");
  console.error("[Admin seed] Could not create or promote administrator:", error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
