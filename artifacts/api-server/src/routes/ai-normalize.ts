import { Router, type IRouter } from "express";
import { getOpenAI } from "../lib/openai-client.js";

const router: IRouter = Router();

const MED_MAP: Record<string, { formal: string; description: string }> = {
  "water pill": { formal: "Hydrochlorothiazide (HCTZ)", description: "a diuretic" },
  "water pills": { formal: "Hydrochlorothiazide (HCTZ)", description: "a diuretic" },
  "blood thinner": { formal: "Warfarin (Coumadin)", description: "an anticoagulant" },
  "blood thinners": { formal: "Warfarin (Coumadin)", description: "an anticoagulant" },
  "blood pressure pill": { formal: "Lisinopril", description: "an ACE inhibitor for hypertension" },
  "blood pressure medication": { formal: "Lisinopril", description: "an ACE inhibitor for hypertension" },
  "sugar pill": { formal: "Metformin", description: "an oral antidiabetic for Type 2 diabetes" },
  "diabetes pill": { formal: "Metformin", description: "an oral antidiabetic for Type 2 diabetes" },
  "cholesterol pill": { formal: "Atorvastatin (Lipitor)", description: "a statin" },
  "statin": { formal: "Atorvastatin (Lipitor)", description: "a statin for cholesterol" },
  "sleeping pill": { formal: "Zolpidem (Ambien)", description: "a sleep aid" },
  "sleep pill": { formal: "Zolpidem (Ambien)", description: "a sleep aid" },
  "anxiety pill": { formal: "Lorazepam (Ativan)", description: "a benzodiazepine for anxiety" },
  "acid pill": { formal: "Omeprazole (Prilosec)", description: "a proton pump inhibitor for acid reflux" },
  "antacid": { formal: "Omeprazole (Prilosec)", description: "a proton pump inhibitor" },
  "acid reflux pill": { formal: "Omeprazole (Prilosec)", description: "a proton pump inhibitor" },
  "thyroid pill": { formal: "Levothyroxine (Synthroid)", description: "a thyroid hormone" },
  "bone pill": { formal: "Alendronate (Fosamax)", description: "a bisphosphonate for osteoporosis" },
  "steroid": { formal: "Prednisone", description: "a corticosteroid" },
  "inhaler": { formal: "Albuterol", description: "a bronchodilator" },
  "pain pill": { formal: "Ibuprofen or Acetaminophen", description: "specify if prescription or OTC" },
  "heart pill": { formal: "Metoprolol", description: "a beta-blocker for heart conditions" },
  "heart medication": { formal: "Metoprolol", description: "a beta-blocker for heart conditions" },
  "the heart thing": { formal: "Metoprolol", description: "a beta-blocker for heart conditions" },
  "sugar medication": { formal: "Metformin", description: "an oral antidiabetic for Type 2 diabetes" },
  "sugar": { formal: "Metformin", description: "an oral antidiabetic for Type 2 diabetes" },
  "aspirin": { formal: "Aspirin (81mg)", description: "antiplatelet therapy" },
  "baby aspirin": { formal: "Aspirin (81mg)", description: "low-dose antiplatelet therapy" },
};

const COND_MAP: Record<string, { formal: string; description: string }> = {
  "high blood pressure": { formal: "Hypertension", description: "elevated blood pressure" },
  "high bp": { formal: "Hypertension", description: "elevated blood pressure" },
  "sugar diabetes": { formal: "Type 2 Diabetes Mellitus", description: "a metabolic disorder" },
  "high cholesterol": { formal: "Hyperlipidemia", description: "elevated blood lipids" },
  "overweight": { formal: "Obesity", description: "specify BMI class with your doctor" },
  "low thyroid": { formal: "Hypothyroidism", description: "underactive thyroid" },
  "underactive thyroid": { formal: "Hypothyroidism", description: "underactive thyroid" },
  "acid reflux": { formal: "Gastroesophageal Reflux Disease (GERD)", description: "a stomach acid disorder" },
  "heartburn": { formal: "Gastroesophageal Reflux Disease (GERD)", description: "a stomach acid disorder" },
  "irregular heartbeat": { formal: "Atrial Fibrillation (AFib)", description: "an irregular heart rhythm" },
  "heart flutter": { formal: "Atrial Fibrillation (AFib)", description: "an irregular heart rhythm" },
  "the heart thing": { formal: "Atrial Fibrillation (AFib)", description: "an irregular heart rhythm" },
  "weak heart": { formal: "Congestive Heart Failure (CHF)", description: "reduced heart pumping capacity" },
  "depression": { formal: "Major Depressive Disorder (MDD)", description: "a mood disorder" },
  "anxiety": { formal: "Generalized Anxiety Disorder (GAD)", description: "an anxiety disorder" },
  "copd": { formal: "Chronic Obstructive Pulmonary Disease (COPD)", description: "a chronic lung condition" },
  "arthritis": { formal: "Osteoarthritis", description: "specify joint and type with your doctor" },
  "sugar": { formal: "Type 2 Diabetes Mellitus", description: "a metabolic disorder" },
  "diabetes": { formal: "Type 2 Diabetes Mellitus", description: "a metabolic disorder" },
  "blood pressure": { formal: "Hypertension", description: "elevated blood pressure" },
  "stroke": { formal: "Cerebrovascular Accident (CVA)", description: "a stroke event" },
  "mini stroke": { formal: "Transient Ischemic Attack (TIA)", description: "a temporary stroke episode" },
  "heart attack": { formal: "Myocardial Infarction (MI)", description: "a prior cardiac event" },
  "bad knees": { formal: "Knee Osteoarthritis", description: "degenerative joint disease of the knee" },
  "bad back": { formal: "Lumbar Degenerative Disc Disease", description: "a spinal condition" },
};

router.post("/ai-normalize", async (req, res) => {
  const { text, type } = req.body as { text?: string; type?: string };
  if (!text || typeof text !== "string" || !type) {
    res.status(400).json({ error: "text and type are required" });
    return;
  }

  const lower = text.trim().toLowerCase();
  const map = type === "medication" ? MED_MAP : COND_MAP;
  if (map[lower]) {
    res.json({ ...map[lower], source: "dictionary" });
    return;
  }

  const ai = getOpenAI();
  if (ai) {
    try {
      const systemPrompt = type === "medication"
        ? "You are a pharmacist assistant. Convert the patient's colloquial medication name to the formal generic drug name. Return only valid JSON: {\"formal\": \"Generic Name (Brand)\", \"description\": \"brief plain-language description in 5-8 words\"}. If unrecognizable, make your best clinical guess."
        : "You are a clinical coder. Convert the patient's lay-language condition description to the formal medical diagnosis name. Return only valid JSON: {\"formal\": \"Formal Diagnosis Name\", \"description\": \"brief plain-language description in 5-8 words\"}. If unrecognizable, make your best clinical guess.";

      const completion = await ai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `"${text.trim()}"` },
        ],
        response_format: { type: "json_object" },
        max_tokens: 120,
        temperature: 0.2,
      });

      const raw = completion.choices[0]?.message?.content ?? "";
      const parsed = JSON.parse(raw) as { formal?: string; description?: string };
      if (parsed.formal) {
        res.json({ formal: parsed.formal, description: parsed.description ?? "", source: "ai" });
        return;
      }
    } catch {
      // fall through to graceful fallback
    }
  }

  res.json({ formal: text.trim(), description: "verify with your care team", source: "unrecognized" });
});

export default router;
