import { Router, type IRouter } from "express";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db, patientsTable, accessCodesTable, accessHistoryTable } from "@workspace/db";
import {
  GetPatientParams,
  GetPatientResponse,
  UpdatePatientParams,
  UpdatePatientBody,
  UpdatePatientResponse,
  GetActivePassParams,
  GetActivePassResponse,
  GetAccessHistoryParams,
  GetAccessHistoryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

type RawConsent = { agreed?: boolean; date?: string; signature?: string };
type RawConsents = { hipaa?: RawConsent; consentToTreat?: RawConsent; billingPolicy?: RawConsent; releaseInfo?: RawConsent; telehealth?: RawConsent };
type RawROS = { constitutional?: Record<string, string>; cardiovascular?: Record<string, string>; respiratory?: Record<string, string>; gastrointestinal?: Record<string, string>; neurological?: Record<string, string>; musculoskeletal?: Record<string, string>; skin?: Record<string, string>; psychiatric?: Record<string, string> };

function defaultConsent() { return { agreed: false, date: "", signature: "" }; }

function serializePatient(p: typeof patientsTable.$inferSelect) {
  const rawConsents = (p.consents as RawConsents) ?? {};
  const rawROS = (p.reviewOfSystems as RawROS) ?? {};

  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    dateOfBirth: p.dateOfBirth,
    biologicalSex: p.biologicalSex,
    genderIdentity: p.genderIdentity,
    preferredName: p.preferredName,
    pronouns: p.pronouns,
    preferredLanguage: p.preferredLanguage,
    maritalStatus: p.maritalStatus,
    bloodType: p.bloodType,
    ssnLastFour: p.ssnLastFour,
    race: p.race,
    ethnicity: p.ethnicity,
    interpreterNeeded: p.interpreterNeeded,
    phone: p.phone,
    email: p.email,
    address: p.address,
    careTeam: p.careTeam as Record<string, string>,
    insurance: p.insurance as Record<string, string>,
    insuranceSecondary: (p.insuranceSecondary ?? null) as Record<string, string> | null,
    responsibleParty: (p.responsibleParty ?? null) as Record<string, string> | null,
    emergencyContact: p.emergencyContact as Record<string, string>,
    allergies: p.allergies as Record<string, string>[],
    medications: p.medications as Record<string, string>[],
    conditions: p.conditions as Record<string, string>[],
    surgeries: p.surgeries as Record<string, string>[],
    hospitalizations: p.hospitalizations as Record<string, string>[],
    immunizations: p.immunizations as Record<string, string>[],
    familyHistory: p.familyHistory as Record<string, string>[],
    socialHistory: p.socialHistory as Record<string, string>,
    vitals: p.vitals as Record<string, string>,
    reviewOfSystems: {
      constitutional: rawROS.constitutional ?? {},
      cardiovascular: rawROS.cardiovascular ?? {},
      respiratory: rawROS.respiratory ?? {},
      gastrointestinal: rawROS.gastrointestinal ?? {},
      neurological: rawROS.neurological ?? {},
      musculoskeletal: rawROS.musculoskeletal ?? {},
      skin: rawROS.skin ?? {},
      psychiatric: rawROS.psychiatric ?? {},
    },
    obgynHistory: (p.obgynHistory ?? null) as Record<string, string> | null,
    consents: {
      hipaa: rawConsents.hipaa ?? defaultConsent(),
      consentToTreat: rawConsents.consentToTreat ?? defaultConsent(),
      billingPolicy: rawConsents.billingPolicy ?? defaultConsent(),
      releaseInfo: rawConsents.releaseInfo ?? defaultConsent(),
      telehealth: rawConsents.telehealth ?? defaultConsent(),
    },
    signature: (p.signature ?? null) as Record<string, string> | null,
    recentUpdates: (p.recentUpdates ?? []) as { category: string; label: string; updatedAt: string }[],
    updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : String(p.updatedAt),
  };
}

function serializeCode(code: typeof accessCodesTable.$inferSelect) {
  return {
    code: code.code,
    patientId: code.patientId,
    expiresAt: code.expiresAt instanceof Date ? code.expiresAt.toISOString() : String(code.expiresAt),
    revokedAt: code.revokedAt instanceof Date ? code.revokedAt.toISOString() : code.revokedAt ?? null,
  };
}

router.get("/patient/:id", async (req, res): Promise<void> => {
  const params = GetPatientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message, errorCode: "INVALID_REQUEST" });
    return;
  }

  const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.id, params.data.id));
  if (!patient) {
    res.status(404).json({ error: "Patient not found", errorCode: "PATIENT_NOT_FOUND" });
    return;
  }

  res.json(GetPatientResponse.parse(serializePatient(patient)));
});

router.put("/patient/:id", async (req, res): Promise<void> => {
  const params = UpdatePatientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message, errorCode: "INVALID_REQUEST" });
    return;
  }

  const body = UpdatePatientBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message, errorCode: "INVALID_REQUEST" });
    return;
  }

  const [existing] = await db
    .select({ id: patientsTable.id })
    .from(patientsTable)
    .where(eq(patientsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Patient not found", errorCode: "PATIENT_NOT_FOUND" });
    return;
  }

  const [updated] = await db
    .update(patientsTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(patientsTable.id, params.data.id))
    .returning();

  req.log.info({ patientId: params.data.id }, "Patient updated");
  res.json(UpdatePatientResponse.parse(serializePatient(updated)));
});

router.get("/patient/:id/pass", async (req, res): Promise<void> => {
  const params = GetActivePassParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message, errorCode: "INVALID_REQUEST" });
    return;
  }

  const [pass] = await db
    .select()
    .from(accessCodesTable)
    .where(
      and(
        eq(accessCodesTable.patientId, params.data.id),
        gt(accessCodesTable.expiresAt, new Date()),
        isNull(accessCodesTable.revokedAt),
      ),
    )
    .orderBy(desc(accessCodesTable.createdAt))
    .limit(1);

  if (!pass) {
    res.status(404).json({ error: "No active pass", errorCode: "NO_ACTIVE_PASS" });
    return;
  }

  res.json(GetActivePassResponse.parse(serializeCode(pass)));
});

router.get("/patient/:id/access-history", async (req, res): Promise<void> => {
  const params = GetAccessHistoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message, errorCode: "INVALID_REQUEST" });
    return;
  }

  const [patient] = await db
    .select({ id: patientsTable.id })
    .from(patientsTable)
    .where(eq(patientsTable.id, params.data.id));

  if (!patient) {
    res.status(404).json({ error: "Patient not found", errorCode: "PATIENT_NOT_FOUND" });
    return;
  }

  const entries = await db
    .select()
    .from(accessHistoryTable)
    .where(eq(accessHistoryTable.patientId, params.data.id))
    .orderBy(desc(accessHistoryTable.viewedAt))
    .limit(50);

  res.json(GetAccessHistoryResponse.parse({
    entries: entries.map(e => ({
      ...e,
      viewedAt: e.viewedAt instanceof Date ? e.viewedAt.toISOString() : String(e.viewedAt),
    })),
  }));
});

export default router;
