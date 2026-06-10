import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const accessHistoryTable = pgTable("access_history", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  patientId: text("patient_id").notNull(),
  viewedAt: timestamp("viewed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAccessHistorySchema = createInsertSchema(accessHistoryTable).omit({ id: true, viewedAt: true });
export type InsertAccessHistory = z.infer<typeof insertAccessHistorySchema>;
export type AccessHistory = typeof accessHistoryTable.$inferSelect;
