import { eq } from "drizzle-orm";
import { db, patientsTable } from "@workspace/db";
import { logger } from "./logger";

const DEMO_PATIENT = {
  id: "demo",
  firstName: "Maria",
  lastName: "Lopez",
  dateOfBirth: "1972-03-15",
  biologicalSex: "Female",
  genderIdentity: "Woman",
  preferredLanguage: "English",
  maritalStatus: "Married",
  bloodType: "O+",
  phone: "(512) 823-4471",
  email: "maria.lopez@email.com",
  address: "247 Maple Street, Austin, TX 78701",
  careTeam: {
    pcp: "Dr. Ramesh Patel, MD — Austin Family Health",
    referringPhysician: "Dr. Ramesh Patel, MD",
    visitSpecialty: "Endocrinology",
    reasonForVisit: "Type 2 diabetes management follow-up; HbA1c review and medication adjustment",
    preferredPharmacy: "HEB Pharmacy #47 — 1825 S Congress Ave, Austin TX 78704",
    pharmacyPhone: "(512) 444-7890",
  },
  insurance: {
    plan: "Blue Cross Blue Shield of Texas PPO",
    memberId: "BCBS-7743219-TX",
    group: "GRP-45892",
    policyholder: "Maria E. Lopez",
    phone: "(800) 521-2227",
  },
  insuranceSecondary: {
    plan: "Medicare Part B",
    memberId: "1EG4-TE5-MK72",
    group: "N/A",
    policyholder: "Maria E. Lopez",
    phone: "(800) 633-4227",
  },
  emergencyContact: {
    name: "Carlos Alberto Lopez",
    relationship: "Spouse",
    phone: "(512) 823-4472",
  },
  allergies: [
    { name: "Penicillin", reaction: "Hives (urticaria), pruritus", severity: "Moderate" },
    { name: "Shellfish (shrimp, crab, lobster)", reaction: "Throat tightening, urticaria, facial swelling", severity: "Severe" },
  ],
  medications: [
    {
      name: "Metformin",
      dose: "1000 mg",
      frequency: "Twice daily with meals",
      route: "Oral",
      prescriber: "Dr. Ramesh Patel, MD",
      reason: "Type 2 diabetes mellitus — glycemic control",
    },
    {
      name: "Lisinopril",
      dose: "10 mg",
      frequency: "Once daily",
      route: "Oral",
      prescriber: "Dr. Ramesh Patel, MD",
      reason: "Hypertension",
    },
    {
      name: "Atorvastatin",
      dose: "20 mg",
      frequency: "Once daily at bedtime",
      route: "Oral",
      prescriber: "Dr. Ramesh Patel, MD",
      reason: "Hyperlipidemia — cardiovascular risk reduction",
    },
    {
      name: "Aspirin",
      dose: "81 mg",
      frequency: "Once daily",
      route: "Oral",
      prescriber: "Dr. Ramesh Patel, MD",
      reason: "Cardiovascular prophylaxis",
    },
    {
      name: "Vitamin D3",
      dose: "2000 IU",
      frequency: "Once daily",
      route: "Oral",
      prescriber: "Self (OTC)",
      reason: "Vitamin D deficiency maintenance",
    },
  ],
  conditions: [
    {
      name: "Type 2 Diabetes Mellitus",
      diagnosedDate: "2018-03",
      status: "Active",
      notes: "HbA1c 7.1% at last visit; diet-modified and on Metformin",
    },
    {
      name: "Hypertension",
      diagnosedDate: "2019-07",
      status: "Active",
      notes: "BP stable at 128/82 on Lisinopril 10 mg",
    },
    {
      name: "Hyperlipidemia",
      diagnosedDate: "2020-01",
      status: "Active",
      notes: "LDL 98 mg/dL at last labs; on Atorvastatin",
    },
    {
      name: "Obesity (Class I)",
      diagnosedDate: "2018-03",
      status: "Active",
      notes: "BMI 30.4; diet counseling ongoing",
    },
    {
      name: "Vitamin D Deficiency",
      diagnosedDate: "2022-09",
      status: "Resolved",
      notes: "Corrected with supplementation; levels now normal",
    },
  ],
  surgeries: [
    {
      procedure: "Laparoscopic Cholecystectomy",
      date: "2019-08-14",
      facility: "St. David's Medical Center, Austin TX",
    },
    {
      procedure: "Cesarean Section (C-section)",
      date: "2001-05-20",
      facility: "Seton Medical Center, Austin TX",
    },
  ],
  immunizations: [
    { vaccine: "COVID-19 (mRNA Bivalent Booster)", date: "2023-10-12" },
    { vaccine: "Influenza (Flu Shot)", date: "2025-10-02" },
    { vaccine: "Tdap (Tetanus, Diphtheria, Pertussis)", date: "2021-03-15" },
    { vaccine: "Pneumococcal PCV15 (Prevnar 15)", date: "2022-09-08" },
    { vaccine: "Hepatitis B (series complete)", date: "1998-06-01" },
    { vaccine: "MMR (series complete)", date: "1978-04-10" },
  ],
  familyHistory: [
    { relation: "Father", condition: "Type 2 Diabetes Mellitus" },
    { relation: "Father", condition: "Coronary Artery Disease (MI at age 62)" },
    { relation: "Mother", condition: "Hypertension" },
    { relation: "Mother", condition: "Breast Cancer (dx age 68, treated, in remission)" },
    { relation: "Maternal Grandmother", condition: "Type 2 Diabetes Mellitus" },
    { relation: "Brother (age 50)", condition: "Hyperlipidemia" },
  ],
  socialHistory: {
    smoking: "Former smoker — quit 2010; ~5 pack-year history",
    alcohol: "Social drinker — 1–2 drinks per week",
    occupation: "High school biology teacher, Austin ISD",
    exercise: "Moderate — 30-min walks 3×/week; mostly sedentary at work",
  },
  vitals: {
    heightFt: "5",
    heightIn: "4",
    weightLbs: "178",
    systolic: "128",
    diastolic: "82",
  },
};

export async function seedDemoPatient(): Promise<void> {
  try {
    await db
      .insert(patientsTable)
      .values(DEMO_PATIENT)
      .onConflictDoUpdate({
        target: patientsTable.id,
        set: DEMO_PATIENT,
      });
    logger.info("Demo patient Maria Lopez seeded/updated successfully");
  } catch (err) {
    logger.error({ err }, "Failed to seed demo patient");
  }
}
