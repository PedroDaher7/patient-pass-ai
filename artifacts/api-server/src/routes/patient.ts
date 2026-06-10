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

function serializePatient(patient: typeof patientsTable.$inferSelect) {
  return {
    ...patient,
    insurance: patient.insurance as Record<string, string>,
    emergencyContact: patient.emergencyContact as Record<string, string>,
    allergies: patient.allergies as Record<string, string>[],
    medications: patient.medications as Record<string, string>[],
    conditions: patient.conditions as Record<string, string>[],
    surgeries: patient.surgeries as Record<string, string>[],
    updatedAt: patient.updatedAt instanceof Date
      ? patient.updatedAt.toISOString()
      : String(patient.updatedAt),
  };
}

function serializeCode(code: typeof accessCodesTable.$inferSelect) {
  return {
    code: code.code,
    patientId: code.patientId,
    expiresAt: code.expiresAt instanceof Date ? code.expiresAt.toISOString() : String(code.expiresAt),
    revokedAt: code.revokedAt instanceof Date
      ? code.revokedAt.toISOString()
      : code.revokedAt ?? null,
  };
}

router.get("/patient/:id", async (req, res): Promise<void> => {
  const params = GetPatientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message, errorCode: "INVALID_REQUEST" });
    return;
  }

  const [patient] = await db
    .select()
    .from(patientsTable)
    .where(eq(patientsTable.id, params.data.id));

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
    entries: entries.map((e) => ({
      ...e,
      viewedAt: e.viewedAt instanceof Date ? e.viewedAt.toISOString() : String(e.viewedAt),
    })),
  }));
});

export default router;
