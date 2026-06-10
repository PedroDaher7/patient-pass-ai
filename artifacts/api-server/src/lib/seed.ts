import { eq } from "drizzle-orm";
import { db, patientsTable } from "@workspace/db";
import { logger } from "./logger";

const DEMO_PATIENT = {
  id: "demo",
  firstName: "Maria",
  lastName: "Lopez",
  dateOfBirth: "1982-04-15",
  gender: "Female",
  phone: "(555) 823-4471",
  email: "maria.lopez@email.com",
  address: "247 Maple Street, Austin, TX 78701",
  insurance: {
    plan: "Blue Cross Blue Shield PPO",
    memberId: "BCBS-7743219",
    group: "GRP-45892",
    phone: "(800) 521-2227",
  },
  emergencyContact: {
    name: "Carlos Lopez",
    relationship: "Spouse",
    phone: "(555) 823-4472",
  },
  allergies: [
    { name: "Penicillin", severity: "Severe", reaction: "Anaphylaxis" },
    { name: "Sulfa drugs", severity: "Moderate", reaction: "Rash and hives" },
  ],
  medications: [
    { name: "Lisinopril", dose: "10 mg", frequency: "Once daily", prescriber: "Dr. R. Patel" },
    { name: "Metformin", dose: "500 mg", frequency: "Twice daily with meals", prescriber: "Dr. R. Patel" },
    { name: "Atorvastatin", dose: "20 mg", frequency: "Once daily at bedtime", prescriber: "Dr. R. Patel" },
  ],
  conditions: [
    { name: "Type 2 Diabetes", diagnosedDate: "2018-03", notes: "Well-controlled with medication and diet" },
    { name: "Hypertension", diagnosedDate: "2019-07", notes: "Managed with Lisinopril, blood pressure stable" },
  ],
  surgeries: [
    { procedure: "Laparoscopic Appendectomy", date: "2011-09-03", hospital: "St. David's Medical Center, Austin TX", notes: "Uncomplicated, full recovery" },
  ],
};

export async function seedDemoPatient(): Promise<void> {
  try {
    const [existing] = await db
      .select({ id: patientsTable.id })
      .from(patientsTable)
      .where(eq(patientsTable.id, "demo"));

    if (existing) {
      logger.info("Demo patient already exists, skipping seed");
      return;
    }

    await db.insert(patientsTable).values(DEMO_PATIENT);
    logger.info("Demo patient Maria Lopez seeded successfully");
  } catch (err) {
    logger.error({ err }, "Failed to seed demo patient");
  }
}
