import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

const currentDir = fileURLToPath(new URL(".", import.meta.url));

config({
  path: resolve(currentDir, ".env"),
});

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  const { PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE } = process.env;
  if (PGHOST && PGPORT && PGUSER && PGPASSWORD && PGDATABASE) {
    return `postgres://${encodeURIComponent(PGUSER)}:${encodeURIComponent(
      PGPASSWORD,
    )}@${PGHOST}:${PGPORT}/${PGDATABASE}`;
  }
  return undefined;
}

const adminUrl = process.env.DATABASE_ADMIN_URL;
const appUrl = resolveDatabaseUrl();

if (!adminUrl) {
  console.warn(
    "[drizzle.config] DATABASE_ADMIN_URL is not set. Falling back to DATABASE_URL – migrations may fail if this user lacks schema permissions.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  out: resolve(currentDir, "drizzle"),
  schema: resolve(currentDir, "src/db/schema"),
  dbCredentials: {
    url: adminUrl ?? appUrl ?? "",
  },
  verbose: true,
  strict: true,
});
