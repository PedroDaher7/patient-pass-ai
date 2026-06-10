import { Router, type IRouter } from "express";
import { and, desc, eq, gt, isNull, lt } from "drizzle-orm";
import { db, patientsTable, accessCodesTable, accessHistoryTable, sharedPassesTable } from "@workspace/db";
import {
  CreateCodeBody,
  ValidateCodeParams,
  ValidateCodeResponse,
  RevokeCodeParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function serializePatient(patient: typeof patientsTable.$inferSelect) {
  return {
    ...patient,
    insurance: patient.insurance as Record<string, string>,
    emergencyContact: patient.emergencyContact as Record<string, string>,
    allergies: patient.allergies as Record<string, string>[],
    medications: patient.medications as Record<string, string>[],
    conditions: patient.conditions as Record<string, string>[],
    surgeries: patient.surgeries as Record<string, string>[],
    recentUpdates: (patient.recentUpdates ?? []) as { category: string; label: string; updatedAt: string }[],
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

router.post("/codes", async (req, res): Promise<void> => {
  const body = CreateCodeBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message, errorCode: "INVALID_REQUEST" });
    return;
  }

  const { patientId } = body.data;

  const [patient] = await db
    .select({ id: patientsTable.id })
    .from(patientsTable)
    .where(eq(patientsTable.id, patientId));

  if (!patient) {
    res.status(404).json({ error: "Patient not found", errorCode: "PATIENT_NOT_FOUND" });
    return;
  }

  // Clean up old expired codes
  await db.delete(accessCodesTable).where(lt(accessCodesTable.expiresAt, new Date()));

  const revokeNow = new Date();

  // Revoke any existing active codes for this patient
  await db
    .update(accessCodesTable)
    .set({ revokedAt: revokeNow })
    .where(
      and(
        eq(accessCodesTable.patientId, patientId),
        gt(accessCodesTable.expiresAt, revokeNow),
        isNull(accessCodesTable.revokedAt),
      ),
    );

  // Mirror the revocation in shared passes
  await db
    .update(sharedPassesTable)
    .set({ revokedAt: revokeNow })
    .where(
      and(
        eq(sharedPassesTable.patientId, patientId),
        gt(sharedPassesTable.expiresAt, revokeNow),
        isNull(sharedPassesTable.revokedAt),
      ),
    );

  const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours
  const code = generateCode();

  const [created] = await db
    .insert(accessCodesTable)
    .values({ code, patientId, expiresAt })
    .returning();

  // Record in shared passes audit trail
  await db.insert(sharedPassesTable).values({ code, patientId, expiresAt });

  req.log.info({ patientId, code, expiresAt }, "Access code created");
  res.status(201).json(serializeCode(created));
});

router.get("/codes/:code", async (req, res): Promise<void> => {
  const params = ValidateCodeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message, errorCode: "INVALID_REQUEST" });
    return;
  }

  const [entry] = await db
    .select()
    .from(accessCodesTable)
    .where(eq(accessCodesTable.code, params.data.code));

  if (!entry) {
    res.status(404).json({ error: "Code not found", errorCode: "CODE_NOT_FOUND" });
    return;
  }

  if (entry.revokedAt !== null) {
    res.status(404).json({ error: "This pass has been revoked by the patient", errorCode: "CODE_REVOKED" });
    return;
  }

  if (entry.expiresAt < new Date()) {
    res.status(404).json({ error: "This pass has expired", errorCode: "CODE_EXPIRED" });
    return;
  }

  const [patient] = await db
    .select()
    .from(patientsTable)
    .where(eq(patientsTable.id, entry.patientId));

  if (!patient) {
    res.status(404).json({ error: "Patient not found", errorCode: "PATIENT_NOT_FOUND" });
    return;
  }

  // Capture previous access time before logging current view
  const [prevAccess] = await db
    .select({ viewedAt: accessHistoryTable.viewedAt })
    .from(accessHistoryTable)
    .where(eq(accessHistoryTable.patientId, entry.patientId))
    .orderBy(desc(accessHistoryTable.viewedAt))
    .limit(1);

  const lastViewedAt = prevAccess
    ? (prevAccess.viewedAt instanceof Date ? prevAccess.viewedAt.toISOString() : String(prevAccess.viewedAt))
    : null;

  // Log the access to history
  await db.insert(accessHistoryTable).values({
    code: entry.code,
    patientId: entry.patientId,
  });

  // Update lastViewedAt in shared passes
  await db
    .update(sharedPassesTable)
    .set({ lastViewedAt: new Date() })
    .where(eq(sharedPassesTable.code, entry.code));

  req.log.info({ code: params.data.code, patientId: entry.patientId }, "Code validated and view logged");
  res.json(ValidateCodeResponse.parse({
    patient: serializePatient(patient),
    expiresAt: entry.expiresAt instanceof Date ? entry.expiresAt.toISOString() : String(entry.expiresAt),
    lastViewedAt,
  }));
});

router.delete("/codes/:code", async (req, res): Promise<void> => {
  const params = RevokeCodeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message, errorCode: "INVALID_REQUEST" });
    return;
  }

  const [entry] = await db
    .select({ code: accessCodesTable.code })
    .from(accessCodesTable)
    .where(eq(accessCodesTable.code, params.data.code));

  if (!entry) {
    res.status(404).json({ error: "Code not found", errorCode: "CODE_NOT_FOUND" });
    return;
  }

  const revokedAt = new Date();

  await db
    .update(accessCodesTable)
    .set({ revokedAt })
    .where(eq(accessCodesTable.code, params.data.code));

  // Mirror revocation in shared passes
  await db
    .update(sharedPassesTable)
    .set({ revokedAt })
    .where(eq(sharedPassesTable.code, params.data.code));

  req.log.info({ code: params.data.code }, "Access code revoked");
  res.sendStatus(204);
});

export default router;
