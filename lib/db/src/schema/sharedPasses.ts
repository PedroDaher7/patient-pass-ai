import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sharedPassesTable = pgTable("shared_passes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  patientId: text("patient_id").notNull(),
  providerName: text("provider_name"),
  specialty: text("specialty"),
  sharedAt: timestamp("shared_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

export const insertSharedPassSchema = createInsertSchema(sharedPassesTable).omit({ id: true });
export type InsertSharedPass = z.infer<typeof insertSharedPassSchema>;
export type SharedPass = typeof sharedPassesTable.$inferSelect;
