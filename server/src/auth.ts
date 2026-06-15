import { randomUUID } from 'node:crypto';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { emailOTP } from 'better-auth/plugins/email-otp';
import { inviteSessionPlugin } from './auth/plugins/inviteSession.js';
import { env, isProduction } from './config/env.js';
import { db } from './db/client.js';
import { authAccounts, authSessions, authVerifications, users } from './db/schema/index.js';
import { sendOtpEmail } from './services/email.js';

const OTP_TTL_SECONDS = 10 * 60;
const OTP_TTL_MINUTES = Math.ceil(OTP_TTL_SECONDS / 60);

const authSecret = env.BETTER_AUTH_SECRET;

if (!authSecret || authSecret.length < 32) {
  throw new Error(
    'BETTER_AUTH_SECRET must be at least 32 characters. Update your environment configuration before starting the server.',
  );
}

const placeholderSecret = 'trafficmena-dev-secret-change-in-production-min-32-chars';
if (isProduction && authSecret === placeholderSecret) {
  throw new Error(
    'BETTER_AUTH_SECRET is using the default placeholder. Generate a unique 32+ character secret before running in production.',
  );
}
if (!isProduction && authSecret === placeholderSecret) {
  console.warn(
    '[auth] BETTER_AUTH_SECRET is using the default placeholder. Generate a unique secret before deploying to production.',
  );
}

export const auth = betterAuth({
  secret: authSecret,
  url: env.BETTER_AUTH_ISSUER ?? 'http://localhost:3001',
  trustedOrigins: env.CORS_ALLOWLIST.length > 0 ? env.CORS_ALLOWLIST : undefined,
  logger: {
    disabled: isProduction,
  },
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: users,
      session: authSessions,
      account: authAccounts,
      verification: authVerifications,
    },
  }),
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  plugins: [
    emailOTP({
      expiresIn: OTP_TTL_SECONDS,
      sendVerificationOTP: async ({ email, otp, type }) => {
        await sendOtpEmail({ email, otp, ttlMinutes: OTP_TTL_MINUTES });
        if (!isProduction) {
          console.info('[auth] OTP dispatched', { email, type });
        }
      },
      otpLength: 6,
    }),
    inviteSessionPlugin(),
  ],
  advanced: {
    database: {
      generateId: ({ model }) => {
        switch (model) {
          case 'user':
          case 'session':
          case 'account':
          case 'verification':
            return randomUUID();
          default:
            return randomUUID();
        }
      },
    },
  },
});
