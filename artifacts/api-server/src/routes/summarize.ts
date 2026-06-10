import { Router, type IRouter } from "express";

const router: IRouter = Router();

type PatientRaw = Record<string, unknown>;

function calcAge(dob: string): number {
  if (!dob) return 0;
  const today = new Date();
  const birth = new Date(dob + "T00:00:00");
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return isNaN(age) ? 0 : age;
}

function calcBMI(ft: string, inches: string, lbs: string): string {
  const totalIn = (parseInt(ft) || 0) * 12 + (parseInt(inches) || 0);
  const weight = parseFloat(lbs) || 0;
  if (!totalIn || !weight) return "";
  return ((weight * 703) / (totalIn * totalIn)).toFixed(1);
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });
  } catch { return dateStr; }
}

function listItems(arr: string[], max = 3): string {
  if (arr.length === 0) return "none";
  const shown = arr.slice(0, max);
  const extra = arr.length - shown.length;
  return shown.join(", ") + (extra > 0 ? `, and ${extra} more` : "");
}

function generateClinicalSummary(patient: PatientRaw): string {
  const firstName = String(patient.firstName || "");
  const lastName = String(patient.lastName || "");
  const fullName = `${firstName} ${lastName}`.trim() || "The patient";
  const age = calcAge(String(patient.dateOfBirth || ""));
  const dob = fmtDate(String(patient.dateOfBirth || ""));
  const sex = String(patient.biologicalSex || "").toLowerCase();
  const bloodType = patient.bloodType ? `, blood type ${patient.bloodType}` : "";

  const careTeam = (patient.careTeam ?? {}) as Record<string, string>;
  const vitals = (patient.vitals ?? {}) as Record<string, string>;

  const allConditions = (patient.conditions ?? []) as PatientRaw[];
  const activeConditions = allConditions.filter(c => c.status === "Active");
  const medications = (patient.medications ?? []) as PatientRaw[];
  const allergies = (patient.allergies ?? []) as PatientRaw[];
  const severeAllergies = allergies.filter(a => a.severity === "Severe");
  const consents = (patient.consents ?? {}) as Record<string, { agreed?: boolean }>;
  const signedCount = Object.values(consents).filter(c => c?.agreed).length;
  const totalConsents = Object.keys(consents).length;

  const bmi = calcBMI(vitals.heightFt ?? "", vitals.heightIn ?? "", vitals.weightLbs ?? "");
  const bp = vitals.systolic && vitals.diastolic ? `${vitals.systolic}/${vitals.diastolic} mmHg` : "";

  const sentences: string[] = [];

  // S1: Patient demographics + reason for visit
  const specialty = careTeam.visitSpecialty || "this practice";
  const reason = careTeam.reasonForVisit || "an unspecified reason";
  sentences.push(
    `${fullName} is a ${age}-year-old ${sex} (DOB ${dob}${bloodType}) ` +
    `presenting to ${specialty} today for ${reason}.`
  );

  // S2: Active conditions and current medications
  const conditionNames = activeConditions.map(c => String(c.name || "")).filter(Boolean);
  const medNames = medications
    .map(m => [String(m.name || ""), String(m.dose || "")].filter(Boolean).join(" "))
    .filter(Boolean);

  if (activeConditions.length > 0 || medications.length > 0) {
    const parts: string[] = [];
    if (activeConditions.length > 0) {
      parts.push(
        `${activeConditions.length} active condition${activeConditions.length !== 1 ? "s" : ""} ` +
        `(${listItems(conditionNames)})`
      );
    }
    if (medications.length > 0) {
      parts.push(
        `${medications.length} current medication${medications.length !== 1 ? "s" : ""} ` +
        `(${listItems(medNames)})`
      );
    }
    sentences.push(`Medical history is notable for ${parts.join("; ")}.`);
  } else {
    sentences.push("No active conditions or current medications are on file.");
  }

  // S3: Allergies — flag severe prominently
  if (allergies.length === 0) {
    sentences.push("No known drug allergies (NKDA) are reported.");
  } else if (severeAllergies.length > 0) {
    const severeNames = severeAllergies.map(a => String(a.name || "")).filter(Boolean);
    const others = allergies.length - severeAllergies.length;
    sentences.push(
      `\u26A0 ALLERGY ALERT: severe reaction${severeAllergies.length !== 1 ? "s" : ""} to ` +
      `${severeNames.join(" and ")} — verify before prescribing.` +
      (others > 0 ? ` ${others} additional non-severe allerg${others !== 1 ? "ies" : "y"} also noted.` : "")
    );
  } else {
    const allergyList = allergies
      .map(a => `${a.name} (${String(a.severity || "").toLowerCase()})`)
      .map(String)
      .filter(Boolean);
    sentences.push(`Known allergies: ${listItems(allergyList, 4)}.`);
  }

  // S4: Vitals snapshot + consent status
  const vParts: string[] = [];
  if (vitals.weightLbs) vParts.push(`weight ${vitals.weightLbs} lbs`);
  if (bmi) vParts.push(`BMI ${bmi}`);
  if (bp) vParts.push(`BP ${bp}`);
  const vitalsStr = vParts.length > 0 ? `Vitals on file: ${vParts.join(", ")}.` : "No vitals on file.";
  const consentStr = totalConsents > 0
    ? `${signedCount} of ${totalConsents} consent${totalConsents !== 1 ? "s" : ""} signed.`
    : "";

  sentences.push([vitalsStr, consentStr].filter(Boolean).join(" "));

  return sentences.join(" ");
}

router.post("/summarize", (req, res) => {
  const patient = req.body?.patient as PatientRaw | undefined;
  if (!patient || typeof patient !== "object" || Array.isArray(patient)) {
    res.status(400).json({ error: "patient object is required in request body" });
    return;
  }
  const summary = generateClinicalSummary(patient);
  res.json({ summary });
});

export default router;
