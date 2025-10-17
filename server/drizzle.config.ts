import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'drizzle-kit';

const currentDir = fileURLToPath(new URL('.', import.meta.url));

config({
  path: resolve(currentDir, '.env'),
});

const adminUrl = process.env.DATABASE_ADMIN_URL;
const appUrl = process.env.DATABASE_URL;

if (!adminUrl) {
  console.warn(
    '[drizzle.config] DATABASE_ADMIN_URL is not set. Falling back to DATABASE_URL – migrations may fail if this user lacks schema permissions.',
  );
}

export default defineConfig({
  dialect: 'postgresql',
  out: './drizzle',
  schema: './src/db/schema',
  dbCredentials: {
    url: adminUrl ?? appUrl ?? '',
  },
  verbose: true,
  strict: true,
});
