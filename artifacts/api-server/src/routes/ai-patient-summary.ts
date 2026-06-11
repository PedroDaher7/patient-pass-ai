import { Router, type IRouter } from "express";
import { getOpenAI } from "../lib/openai-client.js";

const router: IRouter = Router();

type PatientRaw = Record<string, unknown>;

function fmtList(items: string[], max = 3): string {
  if (items.length === 0) return "none";
  const shown = items.slice(0, max);
  const extra = items.length - shown.length;
  return shown.join(", ") + (extra > 0 ? `, and ${extra} more` : "");
}

function buildPatientAIPrompt(patient: PatientRaw): string {
  const firstName = String(patient.firstName || "there");
  const conditions = (patient.conditions ?? []) as PatientRaw[];
  const activeConditions = conditions.filter(c => c.status === "Active");
  const medications = (patient.medications ?? []) as PatientRaw[];
  const allergies = (patient.allergies ?? []) as PatientRaw[];
  const severeAllergies = allergies.filter(a => a.severity === "Severe");
  const careTeam = (patient.careTeam ?? {}) as Record<string, string>;
  const consents = (patient.consents ?? {}) as Record<string, { agreed?: boolean }>;
  const signedCount = Object.values(consents).filter(c => c?.agreed).length;
  const totalConsents = Object.keys(consents).length;

  const conditionNames = activeConditions.map(c => String(c.name || "")).filter(Boolean);
  const medNames = medications.map(m => String(m.name || "")).filter(Boolean);
  const severeAllergyNames = severeAllergies.map(a => String(a.name || "")).filter(Boolean);
  const pendingConsents = totalConsents - signedCount;

  return `Patient first name: ${firstName}
Active conditions: ${conditionNames.length > 0 ? conditionNames.join(", ") : "none"}
Current medications: ${medNames.length > 0 ? medNames.join(", ") : "none"}
Severe allergies: ${severeAllergyNames.length > 0 ? severeAllergyNames.join(", ") : "none"}
Visit reason: ${careTeam.reasonForVisit || "not specified"}
Visit specialty: ${careTeam.visitSpecialty || "not specified"}
Consent forms pending: ${pendingConsents} of ${totalConsents}`;
}

function generateTemplateSummary(patient: PatientRaw): { summary: string; questions: string[] } {
  const firstName = String(patient.firstName || "there");
  const conditions = (patient.conditions ?? []) as PatientRaw[];
  const activeConditions = conditions.filter(c => c.status === "Active");
  const medications = (patient.medications ?? []) as PatientRaw[];
  const allergies = (patient.allergies ?? []) as PatientRaw[];
  const severeAllergies = allergies.filter(a => a.severity === "Severe");
  const careTeam = (patient.careTeam ?? {}) as Record<string, string>;
  const consents = (patient.consents ?? {}) as Record<string, { agreed?: boolean }>;
  const signedCount = Object.values(consents).filter(c => c?.agreed).length;
  const totalConsents = Object.keys(consents).length;

  const conditionNames = activeConditions.map(c => String(c.name || "")).filter(Boolean);
  const medNames = medications.map(m => String(m.name || "")).filter(Boolean);

  const parts: string[] = [];
  parts.push(`Hi ${firstName}! Here's a quick snapshot of your PatientPass before your visit.`);

  if (activeConditions.length > 0 && medications.length > 0) {
    parts.push(`You have ${activeConditions.length} active condition${activeConditions.length !== 1 ? "s" : ""} on file — ${fmtList(conditionNames)} — and ${medications.length} medication${medications.length !== 1 ? "s" : ""} listed (${fmtList(medNames)}).`);
  } else if (activeConditions.length > 0) {
    parts.push(`You have ${activeConditions.length} active condition${activeConditions.length !== 1 ? "s" : ""} on file: ${fmtList(conditionNames)}.`);
  } else if (medications.length > 0) {
    parts.push(`You have ${medications.length} medication${medications.length !== 1 ? "s" : ""} listed: ${fmtList(medNames)}.`);
  } else {
    parts.push("No active conditions or medications are currently on file.");
  }

  if (careTeam.reasonForVisit && careTeam.visitSpecialty) {
    parts.push(`Today's visit is for ${careTeam.visitSpecialty}: ${careTeam.reasonForVisit}.`);
  } else if (careTeam.reasonForVisit) {
    parts.push(`Your visit reason: ${careTeam.reasonForVisit}.`);
  }

  if (severeAllergies.length > 0) {
    const names = severeAllergies.map(a => String(a.name || "")).filter(Boolean);
    parts.push(`Important: you have severe allergies on file — ${names.join(" and ")}. Make sure your care team is aware before any treatment.`);
  }

  if (totalConsents > 0 && signedCount < totalConsents) {
    const remaining = totalConsents - signedCount;
    parts.push(`You have ${remaining} consent form${remaining !== 1 ? "s" : ""} left to sign before your visit.`);
  } else if (totalConsents > 0 && signedCount === totalConsents) {
    parts.push("All consent forms are signed and ready.");
  }

  const condLower = conditionNames.map(c => c.toLowerCase());
  const questions: string[] = [];
  if (condLower.some(c => c.includes("diabetes"))) questions.push("What is my target HbA1c for this visit, and is my current diabetes medication still the right dose?");
  if (condLower.some(c => c.includes("hypertension") || c.includes("blood pressure"))) questions.push("Is my blood pressure in a healthy range, and should I make any changes to my current medication?");
  if (condLower.some(c => c.includes("hyperlipidemia") || c.includes("cholesterol"))) questions.push("Are my cholesterol levels where they should be, and do I need any lab work today?");
  if (condLower.some(c => c.includes("obesity") || c.includes("weight"))) questions.push("What weight-management steps would you recommend given my current health goals?");
  questions.push("Are there any vaccines, screenings, or preventive care items I should schedule this year?");
  if (medications.length >= 3 && questions.length < 3) questions.push(`I'm currently taking ${medications.length} medications — are all of them still the right choice for me?`);
  if (questions.length < 3) questions.push("Are there lifestyle changes that could improve my overall health given my current conditions?");

  return { summary: parts.join(" "), questions: questions.slice(0, 3) };
}

router.post("/ai-patient-summary", async (req, res) => {
  const patient = req.body?.patient as PatientRaw | undefined;
  if (!patient || typeof patient !== "object" || Array.isArray(patient)) {
    res.status(400).json({ error: "patient object is required in request body" });
    return;
  }

  const ai = getOpenAI();
  if (ai) {
    try {
      const prompt = buildPatientAIPrompt(patient);
      const completion = await ai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a friendly patient health navigator at a clinic. Write a warm, plain-language 2-3 sentence pre-visit summary for the patient, plus 3 good questions they should ask their doctor today based on their conditions. Format your response as JSON: {\"summary\": \"...\", \"questions\": [\"...\", \"...\", \"...\"]}. Use the patient's first name. Be encouraging and specific — mention their actual conditions and medications by name. Do not provide medical advice, diagnoses, or treatment recommendations.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 500,
        temperature: 0.4,
      });
      const raw = completion.choices[0]?.message?.content ?? "";
      const parsed = JSON.parse(raw) as { summary?: string; questions?: string[] };
      if (parsed.summary && Array.isArray(parsed.questions)) {
        res.json({ summary: parsed.summary, questions: parsed.questions.slice(0, 3), source: "ai" });
        return;
      }
    } catch {
      // fall through to template
    }
  }

  res.json({ ...generateTemplateSummary(patient), source: "template" });
});

export default router;
