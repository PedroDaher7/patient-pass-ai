import { Router, type IRouter } from "express";
import { eq, lt } from "drizzle-orm";
import { db, patientsTable, accessCodesTable } from "@workspace/db";
import {
  CreateCodeBody,
  ValidateCodeParams,
  ValidateCodeResponse,
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
    updatedAt: patient.updatedAt instanceof Date
      ? patient.updatedAt.toISOString()
      : String(patient.updatedAt),
  };
}

router.post("/codes", async (req, res): Promise<void> => {
  const body = CreateCodeBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { patientId, expiresInMinutes } = body.data;

  const [patient] = await db
    .select({ id: patientsTable.id })
    .from(patientsTable)
    .where(eq(patientsTable.id, patientId));

  if (!patient) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  // Clean up expired codes
  await db.delete(accessCodesTable).where(lt(accessCodesTable.expiresAt, new Date()));

  const minutes = expiresInMinutes ?? 30;
  const expiresAt = new Date(Date.now() + minutes * 60 * 1000);
  const code = generateCode();

  await db.insert(accessCodesTable).values({
    code,
    patientId,
    expiresAt,
  });

  req.log.info({ patientId, code, expiresAt }, "Access code created");
  res.status(201).json({
    code,
    patientId,
    expiresAt: expiresAt.toISOString(),
  });
});

router.get("/codes/:code", async (req, res): Promise<void> => {
  const params = ValidateCodeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [entry] = await db
    .select()
    .from(accessCodesTable)
    .where(eq(accessCodesTable.code, params.data.code));

  if (!entry) {
    res.status(404).json({ error: "Code not found or expired" });
    return;
  }

  if (entry.expiresAt < new Date()) {
    res.status(404).json({ error: "Code has expired" });
    return;
  }

  const [patient] = await db
    .select()
    .from(patientsTable)
    .where(eq(patientsTable.id, entry.patientId));

  if (!patient) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  req.log.info({ code: params.data.code, patientId: entry.patientId }, "Code validated");
  res.json(ValidateCodeResponse.parse({
    patient: serializePatient(patient),
    expiresAt: entry.expiresAt instanceof Date
      ? entry.expiresAt.toISOString()
      : String(entry.expiresAt),
  }));
});

export default router;
