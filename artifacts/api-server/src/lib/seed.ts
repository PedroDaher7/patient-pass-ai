import { eq } from "drizzle-orm";
import { db, patientsTable, sharedPassesTable } from "@workspace/db";
import { logger } from "./logger";

const TODAY = "2026-06-10";

const DEMO_PATIENT = {
  id: "demo",
  firstName: "Maria",
  lastName: "Lopez",
  dateOfBirth: "1972-03-15",
  biologicalSex: "Female",
  genderIdentity: "Woman",
  preferredName: "Maria",
  pronouns: "She/Her",
  preferredLanguage: "English",
  maritalStatus: "Married",
  bloodType: "O+",
  ssnLastFour: "4471",
  race: "Hispanic or Latino",
  ethnicity: "Mexican American",
  interpreterNeeded: "No",
  phone: "(512) 823-4471",
  email: "maria.lopez@email.com",
  address: "247 Maple Street, Austin, TX 78701",
  careTeam: {
    pcp: "Dr. Ramesh Patel, MD — Austin Family Health",
    referringPhysician: "Dr. Ramesh Patel, MD",
    visitSpecialty: "Endocrinology",
    reasonForVisit: "Type 2 diabetes management follow-up; HbA1c review and medication adjustment",
    preferredPharmacy: "HEB Pharmacy #47",
    pharmacyAddress: "1825 S Congress Ave, Austin TX 78704",
    pharmacyPhone: "(512) 444-7890",
  },
  insurance: {
    plan: "Blue Cross Blue Shield of Texas PPO",
    memberId: "BCBS-7743219-TX",
    group: "GRP-45892",
    policyholder: "Maria E. Lopez",
    policyholderDob: "1972-03-15",
    policyholderRelationship: "Self",
    phone: "(800) 521-2227",
  },
  insuranceSecondary: {
    plan: "Medicare Part B",
    memberId: "1EG4-TE5-MK72",
    group: "N/A",
    policyholder: "Maria E. Lopez",
    policyholderDob: "1972-03-15",
    policyholderRelationship: "Self",
    phone: "(800) 633-4227",
  },
  responsibleParty: {
    name: "Maria E. Lopez",
    relationship: "Self",
    dob: "1972-03-15",
    phone: "(512) 823-4471",
    address: "247 Maple Street, Austin, TX 78701",
    employer: "Austin Independent School District",
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
      name: "Empagliflozin",
      dose: "10 mg",
      frequency: "Once daily",
      route: "Oral",
      prescriber: "Dr. Ramesh Patel, MD",
      reason: "Type 2 diabetes — cardioprotective SGLT2 inhibitor",
    },
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
  hospitalizations: [
    {
      reason: "Cholecystectomy — gallbladder removal",
      date: "2019-08-12",
      facility: "St. David's Medical Center, Austin TX",
    },
    {
      reason: "Cesarean Section — delivery of son Miguel",
      date: "2001-05-19",
      facility: "Seton Medical Center, Austin TX",
    },
    {
      reason: "Gestational diabetes — inpatient monitoring",
      date: "2001-04-10",
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
    occupation: "High school biology teacher",
    employer: "Austin Independent School District",
    exercise: "Moderate — 30-min walks 3×/week; mostly sedentary at work",
  },
  vitals: {
    heightFt: "5",
    heightIn: "4",
    weightLbs: "178",
    systolic: "128",
    diastolic: "82",
  },
  reviewOfSystems: {
    constitutional: {
      "Fever": "Denied",
      "Fatigue": "Present",
      "Night sweats": "Denied",
      "Unexplained weight loss": "Denied",
      "Weight gain": "Present",
      "Chills": "Denied",
    },
    cardiovascular: {
      "Chest pain": "Denied",
      "Palpitations": "Denied",
      "Shortness of breath on exertion": "Denied",
      "Lower extremity edema": "Denied",
      "Orthopnea": "Denied",
    },
    respiratory: {
      "Cough": "Denied",
      "Wheezing": "Denied",
      "Shortness of breath at rest": "Denied",
      "Hemoptysis": "Denied",
    },
    gastrointestinal: {
      "Nausea": "Denied",
      "Vomiting": "Denied",
      "Diarrhea": "Denied",
      "Constipation": "Denied",
      "Abdominal pain": "Denied",
      "Heartburn / GERD": "Present",
    },
    neurological: {
      "Headaches": "Present",
      "Dizziness": "Denied",
      "Numbness or tingling": "Denied",
      "Seizures": "Denied",
      "Memory changes": "Denied",
    },
    musculoskeletal: {
      "Joint pain": "Denied",
      "Muscle weakness": "Denied",
      "Back pain": "Present",
      "Morning stiffness": "Denied",
    },
    skin: {
      "Rash": "Denied",
      "Itching": "Denied",
      "Hair loss": "Denied",
      "Wound healing changes": "Denied",
    },
    psychiatric: {
      "Depression": "Denied",
      "Anxiety": "Present",
      "Insomnia": "Present",
      "Suicidal ideation": "Denied",
    },
  },
  obgynHistory: {
    lmp: "2023-11-15",
    pregnancies: "2",
    deliveries: "1",
    miscarriages: "1",
    abortions: "0",
    liveBirths: "1",
  },
  consents: {
    hipaa: {
      agreed: true,
      date: TODAY,
      signature: "Maria Lopez",
    },
    consentToTreat: {
      agreed: true,
      date: TODAY,
      signature: "Maria Lopez",
    },
    billingPolicy: {
      agreed: true,
      date: TODAY,
      signature: "Maria Lopez",
    },
    releaseInfo: {
      agreed: true,
      date: TODAY,
      signature: "Maria Lopez",
    },
    telehealth: {
      agreed: true,
      date: TODAY,
      signature: "Maria Lopez",
    },
  },
  signature: {
    mode: "typed",
    text: "Maria Lopez",
    dataUrl: "",
    date: TODAY,
  },
  recentUpdates: [
    { category: "medications", label: "Empagliflozin 10 mg", updatedAt: TODAY },
  ],
};

export { DEMO_PATIENT };

export async function seedDemoSharedPasses(): Promise<void> {
  try {
    await db.delete(sharedPassesTable).where(eq(sharedPassesTable.patientId, "demo"));

    const now = new Date();

    await db.insert(sharedPassesTable).values([
      {
        code: "HIST01",
        patientId: "demo",
        providerName: "Dr. Ramesh Patel, MD",
        specialty: "Primary Care",
        sharedAt: new Date("2026-05-12T09:00:00Z"),
        expiresAt: new Date("2026-05-12T13:00:00Z"),
        lastViewedAt: new Date("2026-05-12T09:45:00Z"),
        revokedAt: null,
      },
      {
        code: "HIST02",
        patientId: "demo",
        providerName: "Austin Cardiology Associates",
        specialty: "Cardiology",
        sharedAt: new Date("2026-06-03T10:00:00Z"),
        expiresAt: new Date("2026-06-03T14:00:00Z"),
        lastViewedAt: new Date("2026-06-04T08:30:00Z"),
        revokedAt: null,
      },
      {
        code: "HIST03",
        patientId: "demo",
        providerName: "Westlake Imaging Center",
        specialty: "Radiology",
        sharedAt: new Date("2026-05-28T14:00:00Z"),
        expiresAt: new Date("2026-05-28T18:00:00Z"),
        lastViewedAt: new Date("2026-05-28T14:30:00Z"),
        revokedAt: null,
      },
      {
        code: "ENDO01",
        patientId: "demo",
        providerName: "Austin Endocrinology Group",
        specialty: "Endocrinology",
        sharedAt: now,
        expiresAt: new Date(now.getTime() + 3 * 60 * 60 * 1000),
        lastViewedAt: now,
        revokedAt: null,
      },
    ]);

    logger.info("Demo shared passes seeded successfully");
  } catch (err) {
    logger.error({ err }, "Failed to seed demo shared passes");
  }
}

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
