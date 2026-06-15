import { boolean, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

export const platformSettings = pgTable('platform_settings', {
  id: varchar('id', { length: 256 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  inviteOnlySignup: boolean('invite_only_signup').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .$onUpdateFn(() => new Date()),
  updatedBy: varchar('updated_by', { length: 256 }),
});
