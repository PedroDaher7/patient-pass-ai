import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const patientsTable = pgTable("patients", {
  id: text("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  biologicalSex: text("gender").notNull(),
  genderIdentity: text("gender_identity").notNull().default(""),
  preferredName: text("preferred_name").notNull().default(""),
  pronouns: text("pronouns").notNull().default(""),
  preferredLanguage: text("preferred_language").notNull().default("English"),
  maritalStatus: text("marital_status").notNull().default(""),
  bloodType: text("blood_type").notNull().default(""),
  ssnLastFour: text("ssn_last_four").notNull().default(""),
  race: text("race").notNull().default(""),
  ethnicity: text("ethnicity").notNull().default(""),
  interpreterNeeded: text("interpreter_needed").notNull().default(""),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  address: text("address").notNull(),
  careTeam: jsonb("care_team").notNull().default({}),
  insurance: jsonb("insurance").notNull(),
  insuranceSecondary: jsonb("insurance_secondary"),
  responsibleParty: jsonb("responsible_party"),
  emergencyContact: jsonb("emergency_contact").notNull(),
  allergies: jsonb("allergies").notNull().default([]),
  medications: jsonb("medications").notNull().default([]),
  conditions: jsonb("conditions").notNull().default([]),
  surgeries: jsonb("surgeries").notNull().default([]),
  hospitalizations: jsonb("hospitalizations").notNull().default([]),
  immunizations: jsonb("immunizations").notNull().default([]),
  familyHistory: jsonb("family_history").notNull().default([]),
  socialHistory: jsonb("social_history").notNull().default({}),
  vitals: jsonb("vitals").notNull().default({}),
  reviewOfSystems: jsonb("review_of_systems").notNull().default({}),
  obgynHistory: jsonb("obgyn_history"),
  consents: jsonb("consents").notNull().default({}),
  signature: jsonb("signature"),
  recentUpdates: jsonb("recent_updates").notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPatientSchema = createInsertSchema(patientsTable).omit({ updatedAt: true });
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patientsTable.$inferSelect;
