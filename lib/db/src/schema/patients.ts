import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const patientsTable = pgTable("patients", {
  id: text("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  gender: text("gender").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  address: text("address").notNull(),
  insurance: jsonb("insurance").notNull(),
  emergencyContact: jsonb("emergency_contact").notNull(),
  allergies: jsonb("allergies").notNull().default([]),
  medications: jsonb("medications").notNull().default([]),
  conditions: jsonb("conditions").notNull().default([]),
  surgeries: jsonb("surgeries").notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPatientSchema = createInsertSchema(patientsTable).omit({ updatedAt: true });
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patientsTable.$inferSelect;
