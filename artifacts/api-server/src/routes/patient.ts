import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, patientsTable } from "@workspace/db";
import {
  GetPatientParams,
  GetPatientResponse,
  UpdatePatientParams,
  UpdatePatientBody,
  UpdatePatientResponse,
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

router.get("/patient/:id", async (req, res): Promise<void> => {
  const params = GetPatientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [patient] = await db
    .select()
    .from(patientsTable)
    .where(eq(patientsTable.id, params.data.id));

  if (!patient) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  res.json(GetPatientResponse.parse(serializePatient(patient)));
});

router.put("/patient/:id", async (req, res): Promise<void> => {
  const params = UpdatePatientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdatePatientBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [existing] = await db
    .select({ id: patientsTable.id })
    .from(patientsTable)
    .where(eq(patientsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  const [updated] = await db
    .update(patientsTable)
    .set({
      ...body.data,
      updatedAt: new Date(),
    })
    .where(eq(patientsTable.id, params.data.id))
    .returning();

  req.log.info({ patientId: params.data.id }, "Patient updated");
  res.json(UpdatePatientResponse.parse(serializePatient(updated)));
});

export default router;
