import { useState } from "react";
import type { PatientInput, ReviewOfSystems } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, X, Upload, Sparkles } from "lucide-react";

// ── AI normalize dictionaries ─────────────────────────────────────────────────
const MED_NORMALIZE_MAP: Record<string, { formal: string; description: string }> = {
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
};

const COND_NORMALIZE_MAP: Record<string, { formal: string; description: string }> = {
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
  "weak heart": { formal: "Congestive Heart Failure (CHF)", description: "reduced heart pumping capacity" },
  "depression": { formal: "Major Depressive Disorder (MDD)", description: "a mood disorder" },
  "anxiety": { formal: "Generalized Anxiety Disorder (GAD)", description: "an anxiety disorder" },
  "copd": { formal: "Chronic Obstructive Pulmonary Disease (COPD)", description: "a chronic lung condition" },
  "arthritis": { formal: "Osteoarthritis", description: "specify joint and type with your doctor" },
};

function findNormalize(
  text: string,
  map: Record<string, { formal: string; description: string }>
): { formal: string; description: string } | null {
  const lower = text.trim().toLowerCase();
  if (!lower) return null;
  return map[lower] ?? null;
}

function NormalizeSuggestion({
  suggestion,
  onApply,
}: {
  suggestion: { formal: string; description: string };
  onApply: () => void;
}) {
  return (
    <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
      <Sparkles className="w-3 h-3 text-blue-500 flex-shrink-0" />
      <span className="text-xs text-slate-600 flex-1 min-w-0">
        AI suggests: <strong className="text-slate-800">{suggestion.formal}</strong>
        <span className="text-slate-400 ml-1">({suggestion.description})</span>
      </span>
      <button
        type="button"
        onClick={onApply}
        className="text-xs font-semibold text-blue-700 hover:text-blue-900 transition-colors flex-shrink-0 whitespace-nowrap"
      >
        Use this ↵
      </button>
    </div>
  );
}

function MedNameInput({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [suggestion, setSuggestion] = useState<{ formal: string; description: string } | null>(null);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    setSuggestion(findNormalize(val, MED_NORMALIZE_MAP));
  };
  return (
    <div className="space-y-1.5">
      <Input value={value} onChange={handleChange} placeholder="e.g. Metformin, Lisinopril" />
      {suggestion && (
        <NormalizeSuggestion
          suggestion={suggestion}
          onApply={() => { onChange(suggestion.formal); setSuggestion(null); }}
        />
      )}
    </div>
  );
}

function CondNameInput({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [suggestion, setSuggestion] = useState<{ formal: string; description: string } | null>(null);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    setSuggestion(findNormalize(val, COND_NORMALIZE_MAP));
  };
  return (
    <div className="space-y-1.5">
      <Input value={value} onChange={handleChange} placeholder="e.g. Type 2 Diabetes, Hypertension" />
      {suggestion && (
        <NormalizeSuggestion
          suggestion={suggestion}
          onApply={() => { onChange(suggestion.formal); setSuggestion(null); }}
        />
      )}
    </div>
  );
}

export type Handlers = {
  handleChange: (field: keyof PatientInput, value: unknown) => void;
  handleNested: (parent: string, field: string, value: string) => void;
  handleArrayChange: (arr: string, idx: number, field: string, value: unknown) => void;
  handleAdd: (arr: string, item: unknown) => void;
  handleRemove: (arr: string, idx: number) => void;
  handleROS: (system: string, symptom: string, value: string) => void;
  bmi: string;
};

export const ROS_SYSTEMS: Record<string, string[]> = {
  constitutional: ["Fever", "Fatigue", "Night sweats", "Unexplained weight loss", "Weight gain", "Chills"],
  cardiovascular: ["Chest pain", "Palpitations", "Shortness of breath on exertion", "Lower extremity edema", "Orthopnea"],
  respiratory: ["Cough", "Wheezing", "Shortness of breath at rest", "Hemoptysis"],
  gastrointestinal: ["Nausea", "Vomiting", "Diarrhea", "Constipation", "Abdominal pain", "Heartburn / GERD"],
  neurological: ["Headaches", "Dizziness", "Numbness or tingling", "Seizures", "Memory changes"],
  musculoskeletal: ["Joint pain", "Muscle weakness", "Back pain", "Morning stiffness"],
  skin: ["Rash", "Itching", "Hair loss", "Wound healing changes"],
  psychiatric: ["Depression", "Anxiety", "Insomnia", "Suicidal ideation"],
};

const SYSTEM_LABELS: Record<string, string> = {
  constitutional: "Constitutional",
  cardiovascular: "Cardiovascular",
  respiratory: "Respiratory",
  gastrointestinal: "Gastrointestinal",
  neurological: "Neurological",
  musculoskeletal: "Musculoskeletal",
  skin: "Skin",
  psychiatric: "Psychiatric",
};

const DEFAULT_OBGYN = { lmp: "", pregnancies: "0", deliveries: "0", miscarriages: "0", abortions: "0", liveBirths: "0" };

export function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</Label>
      {children}
    </div>
  );
}

export function ListEditor({
  items, onAdd, onRemove, addLabel, emptyLabel, renderItem,
}: {
  items: Record<string, string>[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  addLabel: string;
  emptyLabel: string;
  renderItem: (item: Record<string, string>, idx: number) => React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="text-sm text-slate-400 italic py-4 text-center">{emptyLabel}</p>
      )}
      {items.map((item, i) => (
        <div key={i} className="relative bg-slate-50/50 border border-slate-100 rounded-xl p-4 pr-12">
          {renderItem(item, i)}
          <button onClick={() => onRemove(i)} className="absolute top-3 right-3 text-slate-300 hover:text-red-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={onAdd} className="w-full border-dashed gap-1.5 text-slate-500 hover:text-slate-700">
        <Plus className="w-4 h-4" />{addLabel}
      </Button>
    </div>
  );
}

export function renderEditForm(section: string, data: PatientInput, h: Handlers): React.ReactNode {
  switch (section) {
    case "registration":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Fld label="Preferred Name"><Input value={data.preferredName} onChange={e => h.handleChange("preferredName", e.target.value)} placeholder="e.g. Maria" /></Fld>
          <Fld label="Pronouns"><Input value={data.pronouns} onChange={e => h.handleChange("pronouns", e.target.value)} placeholder="e.g. She/Her, They/Them" /></Fld>
          <Fld label="SSN Last 4 Digits"><Input value={data.ssnLastFour} onChange={e => h.handleChange("ssnLastFour", e.target.value)} maxLength={4} placeholder="••••" /></Fld>
          <Fld label="Interpreter Needed">
            <Select value={data.interpreterNeeded} onValueChange={v => h.handleChange("interpreterNeeded", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="No">No</SelectItem>
                <SelectItem value="Yes — Spanish">Yes — Spanish</SelectItem>
                <SelectItem value="Yes — French">Yes — French</SelectItem>
                <SelectItem value="Yes — Mandarin">Yes — Mandarin</SelectItem>
                <SelectItem value="Yes — Other">Yes — Other</SelectItem>
              </SelectContent>
            </Select>
          </Fld>
          <Fld label="Race">
            <Select value={data.race} onValueChange={v => h.handleChange("race", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {["American Indian or Alaska Native","Asian","Black or African American","Hispanic or Latino","Native Hawaiian or Other Pacific Islander","White","Two or More Races","Other","Prefer not to say"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </Fld>
          <Fld label="Ethnicity"><Input value={data.ethnicity} onChange={e => h.handleChange("ethnicity", e.target.value)} placeholder="e.g. Mexican American, Cuban, Puerto Rican" /></Fld>
        </div>
      );

    case "demographics":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Fld label="First Name"><Input value={data.firstName} onChange={e => h.handleChange("firstName", e.target.value)} /></Fld>
          <Fld label="Last Name"><Input value={data.lastName} onChange={e => h.handleChange("lastName", e.target.value)} /></Fld>
          <Fld label="Date of Birth"><Input type="date" value={data.dateOfBirth} onChange={e => h.handleChange("dateOfBirth", e.target.value)} /></Fld>
          <Fld label="Biological Sex">
            <Select value={data.biologicalSex} onValueChange={v => h.handleChange("biologicalSex", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Female">Female</SelectItem><SelectItem value="Male">Male</SelectItem><SelectItem value="Intersex">Intersex</SelectItem></SelectContent>
            </Select>
          </Fld>
          <Fld label="Gender Identity"><Input value={data.genderIdentity} onChange={e => h.handleChange("genderIdentity", e.target.value)} /></Fld>
          <Fld label="Preferred Language"><Input value={data.preferredLanguage} onChange={e => h.handleChange("preferredLanguage", e.target.value)} /></Fld>
          <Fld label="Marital Status">
            <Select value={data.maritalStatus} onValueChange={v => h.handleChange("maritalStatus", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{["Single","Married","Divorced","Widowed","Domestic Partnership"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Fld>
          <Fld label="Blood Type">
            <Select value={data.bloodType} onValueChange={v => h.handleChange("bloodType", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{["A+","A−","B+","B−","AB+","AB−","O+","O−","Unknown"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </Fld>
          <Fld label="Phone"><Input value={data.phone} onChange={e => h.handleChange("phone", e.target.value)} /></Fld>
          <Fld label="Email"><Input type="email" value={data.email} onChange={e => h.handleChange("email", e.target.value)} /></Fld>
          <div className="sm:col-span-2"><Fld label="Address"><Input value={data.address} onChange={e => h.handleChange("address", e.target.value)} /></Fld></div>
        </div>
      );

    case "vitals":
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Fld label="Height (ft)"><Input type="number" min="3" max="8" value={data.vitals.heightFt} onChange={e => h.handleNested("vitals","heightFt",e.target.value)} /></Fld>
            <Fld label="Height (in)"><Input type="number" min="0" max="11" value={data.vitals.heightIn} onChange={e => h.handleNested("vitals","heightIn",e.target.value)} /></Fld>
            <Fld label="Weight (lbs)"><Input type="number" value={data.vitals.weightLbs} onChange={e => h.handleNested("vitals","weightLbs",e.target.value)} /></Fld>
            <Fld label="BMI (calc)"><Input value={h.bmi} readOnly className="bg-slate-50 text-slate-500" /></Fld>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Fld label="Systolic (mmHg)"><Input type="number" value={data.vitals.systolic} onChange={e => h.handleNested("vitals","systolic",e.target.value)} /></Fld>
            <Fld label="Diastolic (mmHg)"><Input type="number" value={data.vitals.diastolic} onChange={e => h.handleNested("vitals","diastolic",e.target.value)} /></Fld>
          </div>
        </div>
      );

    case "pharmacy":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Fld label="Pharmacy Name"><Input value={data.careTeam.preferredPharmacy} onChange={e => h.handleNested("careTeam","preferredPharmacy",e.target.value)} placeholder="e.g. CVS Pharmacy, Walgreens" /></Fld></div>
          <div className="sm:col-span-2"><Fld label="Pharmacy Address"><Input value={data.careTeam.pharmacyAddress} onChange={e => h.handleNested("careTeam","pharmacyAddress",e.target.value)} placeholder="Street, City, State ZIP" /></Fld></div>
          <Fld label="Pharmacy Phone"><Input value={data.careTeam.pharmacyPhone} onChange={e => h.handleNested("careTeam","pharmacyPhone",e.target.value)} /></Fld>
        </div>
      );

    case "careTeam":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Fld label="Primary Care Provider"><Input value={data.careTeam.pcp} onChange={e => h.handleNested("careTeam","pcp",e.target.value)} /></Fld>
          <Fld label="Referring Physician"><Input value={data.careTeam.referringPhysician} onChange={e => h.handleNested("careTeam","referringPhysician",e.target.value)} /></Fld>
          <Fld label="Visit Specialty"><Input value={data.careTeam.visitSpecialty} onChange={e => h.handleNested("careTeam","visitSpecialty",e.target.value)} /></Fld>
          <div className="sm:col-span-2"><Fld label="Reason for Today's Visit"><Textarea rows={2} value={data.careTeam.reasonForVisit} onChange={e => h.handleNested("careTeam","reasonForVisit",e.target.value)} /></Fld></div>
        </div>
      );

    case "insurance":
      return (
        <div className="space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Primary Insurance</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Fld label="Plan Name"><Input value={data.insurance.plan} onChange={e => h.handleNested("insurance","plan",e.target.value)} /></Fld>
              <Fld label="Member ID"><Input value={data.insurance.memberId} onChange={e => h.handleNested("insurance","memberId",e.target.value)} /></Fld>
              <Fld label="Group Number"><Input value={data.insurance.group} onChange={e => h.handleNested("insurance","group",e.target.value)} /></Fld>
              <Fld label="Provider Phone"><Input value={data.insurance.phone} onChange={e => h.handleNested("insurance","phone",e.target.value)} /></Fld>
              <Fld label="Policyholder Name"><Input value={data.insurance.policyholder} onChange={e => h.handleNested("insurance","policyholder",e.target.value)} /></Fld>
              <Fld label="Policyholder DOB"><Input type="date" value={data.insurance.policyholderDob} onChange={e => h.handleNested("insurance","policyholderDob",e.target.value)} /></Fld>
              <Fld label="Relationship to Patient"><Input value={data.insurance.policyholderRelationship} onChange={e => h.handleNested("insurance","policyholderRelationship",e.target.value)} placeholder="Self, Spouse, Child…" /></Fld>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Secondary Insurance</p>
              {data.insuranceSecondary === null
                ? <Button variant="outline" size="sm" onClick={() => h.handleChange("insuranceSecondary", { plan:"",memberId:"",group:"",policyholder:"",policyholderDob:"",policyholderRelationship:"",phone:"" })}><Plus className="w-3 h-3 mr-1" />Add</Button>
                : <Button variant="ghost" size="sm" className="text-destructive" onClick={() => h.handleChange("insuranceSecondary", null)}><X className="w-3 h-3 mr-1" />Remove</Button>
              }
            </div>
            {data.insuranceSecondary && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Fld label="Plan Name"><Input value={data.insuranceSecondary.plan} onChange={e => h.handleNested("insuranceSecondary","plan",e.target.value)} /></Fld>
                <Fld label="Member ID"><Input value={data.insuranceSecondary.memberId} onChange={e => h.handleNested("insuranceSecondary","memberId",e.target.value)} /></Fld>
                <Fld label="Group Number"><Input value={data.insuranceSecondary.group} onChange={e => h.handleNested("insuranceSecondary","group",e.target.value)} /></Fld>
                <Fld label="Policyholder"><Input value={data.insuranceSecondary.policyholder} onChange={e => h.handleNested("insuranceSecondary","policyholder",e.target.value)} /></Fld>
                <Fld label="Policyholder DOB"><Input type="date" value={data.insuranceSecondary.policyholderDob} onChange={e => h.handleNested("insuranceSecondary","policyholderDob",e.target.value)} /></Fld>
                <Fld label="Relationship"><Input value={data.insuranceSecondary.policyholderRelationship} onChange={e => h.handleNested("insuranceSecondary","policyholderRelationship",e.target.value)} /></Fld>
              </div>
            )}
          </div>
          <div className="border-t border-slate-100 pt-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Document Uploads</p>
            <div className="grid grid-cols-3 gap-3">
              {["Photo ID", "Ins. Card (Front)", "Ins. Card (Back)"].map(label => (
                <div key={label} className="border-2 border-dashed border-slate-200 rounded-xl p-3 text-center hover:border-blue-200 hover:bg-blue-50/20 transition-colors cursor-pointer">
                  <Upload className="w-5 h-5 mx-auto mb-1 text-slate-300" />
                  <p className="text-xs text-slate-400 leading-tight">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case "responsibleParty":
      return (
        <div className="space-y-4">
          {!data.responsibleParty ? (
            <div className="text-center py-6 space-y-3">
              <p className="text-sm text-slate-500">No responsible party set. The patient is their own guarantor by default.</p>
              <Button variant="outline" onClick={() => h.handleChange("responsibleParty", { name:"",relationship:"Self",dob:"",phone:"",address:"",employer:"" })}>
                Add Responsible Party
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Fld label="Full Name"><Input value={data.responsibleParty.name} onChange={e => h.handleNested("responsibleParty","name",e.target.value)} /></Fld>
                <Fld label="Relationship to Patient"><Input value={data.responsibleParty.relationship} onChange={e => h.handleNested("responsibleParty","relationship",e.target.value)} placeholder="Self, Spouse, Parent…" /></Fld>
                <Fld label="Date of Birth"><Input type="date" value={data.responsibleParty.dob} onChange={e => h.handleNested("responsibleParty","dob",e.target.value)} /></Fld>
                <Fld label="Phone"><Input value={data.responsibleParty.phone} onChange={e => h.handleNested("responsibleParty","phone",e.target.value)} /></Fld>
                <div className="sm:col-span-2"><Fld label="Address"><Input value={data.responsibleParty.address} onChange={e => h.handleNested("responsibleParty","address",e.target.value)} /></Fld></div>
                <div className="sm:col-span-2"><Fld label="Employer"><Input value={data.responsibleParty.employer} onChange={e => h.handleNested("responsibleParty","employer",e.target.value)} /></Fld></div>
              </div>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => h.handleChange("responsibleParty", null)}>
                <X className="w-3 h-3 mr-1" />Remove
              </Button>
            </>
          )}
        </div>
      );

    case "emergencyContact":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Fld label="Name"><Input value={data.emergencyContact.name} onChange={e => h.handleNested("emergencyContact","name",e.target.value)} /></Fld>
          <Fld label="Relationship"><Input value={data.emergencyContact.relationship} onChange={e => h.handleNested("emergencyContact","relationship",e.target.value)} /></Fld>
          <Fld label="Phone"><Input value={data.emergencyContact.phone} onChange={e => h.handleNested("emergencyContact","phone",e.target.value)} /></Fld>
        </div>
      );

    case "allergies":
      return (
        <ListEditor
          items={data.allergies as unknown as Record<string, string>[]}
          onAdd={() => h.handleAdd("allergies", { name:"", reaction:"", severity:"Mild" })}
          onRemove={i => h.handleRemove("allergies", i)}
          addLabel="Add Allergy" emptyLabel="No allergies recorded"
          renderItem={(a, i) => (
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-4"><Fld label="Substance"><Input value={a.name} onChange={e => h.handleArrayChange("allergies",i,"name",e.target.value)} /></Fld></div>
              <div className="col-span-4"><Fld label="Reaction"><Input value={a.reaction} onChange={e => h.handleArrayChange("allergies",i,"reaction",e.target.value)} /></Fld></div>
              <div className="col-span-4"><Fld label="Severity">
                <Select value={a.severity} onValueChange={v => h.handleArrayChange("allergies",i,"severity",v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Mild">Mild</SelectItem><SelectItem value="Moderate">Moderate</SelectItem><SelectItem value="Severe">Severe</SelectItem></SelectContent>
                </Select>
              </Fld></div>
            </div>
          )}
        />
      );

    case "medications":
      return (
        <ListEditor
          items={data.medications as unknown as Record<string, string>[]}
          onAdd={() => h.handleAdd("medications", { name:"",dose:"",frequency:"",route:"Oral",prescriber:"",reason:"" })}
          onRemove={i => h.handleRemove("medications", i)}
          addLabel="Add Medication" emptyLabel="No medications recorded"
          renderItem={(m, i) => (
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-4"><Fld label="Name"><MedNameInput value={m.name} onChange={val => h.handleArrayChange("medications",i,"name",val)} /></Fld></div>
                <div className="col-span-3"><Fld label="Dose"><Input value={m.dose} onChange={e => h.handleArrayChange("medications",i,"dose",e.target.value)} /></Fld></div>
                <div className="col-span-3"><Fld label="Frequency"><Input value={m.frequency} onChange={e => h.handleArrayChange("medications",i,"frequency",e.target.value)} /></Fld></div>
                <div className="col-span-2"><Fld label="Route">
                  <Select value={m.route} onValueChange={v => h.handleArrayChange("medications",i,"route",v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["Oral","IV","IM","Topical","Inhaled","Sublingual","Transdermal","Other"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </Fld></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Fld label="Prescriber"><Input value={m.prescriber} onChange={e => h.handleArrayChange("medications",i,"prescriber",e.target.value)} /></Fld>
                <Fld label="Reason"><Input value={m.reason} onChange={e => h.handleArrayChange("medications",i,"reason",e.target.value)} /></Fld>
              </div>
            </div>
          )}
        />
      );

    case "conditions":
      return (
        <ListEditor
          items={data.conditions as unknown as Record<string, string>[]}
          onAdd={() => h.handleAdd("conditions", { name:"",diagnosedDate:"",status:"Active",notes:"" })}
          onRemove={i => h.handleRemove("conditions", i)}
          addLabel="Add Condition" emptyLabel="No conditions recorded"
          renderItem={(c, i) => (
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-5"><Fld label="Condition"><CondNameInput value={c.name} onChange={val => h.handleArrayChange("conditions",i,"name",val)} /></Fld></div>
              <div className="col-span-2"><Fld label="Diagnosed"><Input value={c.diagnosedDate || ""} onChange={e => h.handleArrayChange("conditions",i,"diagnosedDate",e.target.value)} placeholder="YYYY-MM" /></Fld></div>
              <div className="col-span-2"><Fld label="Status">
                <Select value={c.status} onValueChange={v => h.handleArrayChange("conditions",i,"status",v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Resolved">Resolved</SelectItem></SelectContent>
                </Select>
              </Fld></div>
              <div className="col-span-3"><Fld label="Notes"><Input value={c.notes || ""} onChange={e => h.handleArrayChange("conditions",i,"notes",e.target.value)} /></Fld></div>
            </div>
          )}
        />
      );

    case "surgeries":
      return (
        <ListEditor
          items={data.surgeries as unknown as Record<string, string>[]}
          onAdd={() => h.handleAdd("surgeries", { procedure:"",date:"",facility:"" })}
          onRemove={i => h.handleRemove("surgeries", i)}
          addLabel="Add Procedure" emptyLabel="No procedures recorded"
          renderItem={(s, i) => (
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-5"><Fld label="Procedure"><Input value={s.procedure} onChange={e => h.handleArrayChange("surgeries",i,"procedure",e.target.value)} /></Fld></div>
              <div className="col-span-3"><Fld label="Date"><Input type="date" value={s.date || ""} onChange={e => h.handleArrayChange("surgeries",i,"date",e.target.value)} /></Fld></div>
              <div className="col-span-4"><Fld label="Facility"><Input value={s.facility || ""} onChange={e => h.handleArrayChange("surgeries",i,"facility",e.target.value)} /></Fld></div>
            </div>
          )}
        />
      );

    case "hospitalizations":
      return (
        <ListEditor
          items={data.hospitalizations as unknown as Record<string, string>[]}
          onAdd={() => h.handleAdd("hospitalizations", { reason:"",date:"",facility:"" })}
          onRemove={i => h.handleRemove("hospitalizations", i)}
          addLabel="Add Admission" emptyLabel="No hospitalizations recorded"
          renderItem={(entry, i) => (
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-5"><Fld label="Reason / Diagnosis"><Input value={entry.reason} onChange={e => h.handleArrayChange("hospitalizations",i,"reason",e.target.value)} /></Fld></div>
              <div className="col-span-3"><Fld label="Admission Date"><Input type="date" value={entry.date} onChange={e => h.handleArrayChange("hospitalizations",i,"date",e.target.value)} /></Fld></div>
              <div className="col-span-4"><Fld label="Facility"><Input value={entry.facility} onChange={e => h.handleArrayChange("hospitalizations",i,"facility",e.target.value)} /></Fld></div>
            </div>
          )}
        />
      );

    case "immunizations":
      return (
        <ListEditor
          items={data.immunizations as unknown as Record<string, string>[]}
          onAdd={() => h.handleAdd("immunizations", { vaccine:"",date:"" })}
          onRemove={i => h.handleRemove("immunizations", i)}
          addLabel="Add Vaccine" emptyLabel="No immunizations recorded"
          renderItem={(v, i) => (
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-8"><Fld label="Vaccine"><Input value={v.vaccine} onChange={e => h.handleArrayChange("immunizations",i,"vaccine",e.target.value)} /></Fld></div>
              <div className="col-span-4"><Fld label="Date"><Input type="date" value={v.date} onChange={e => h.handleArrayChange("immunizations",i,"date",e.target.value)} /></Fld></div>
            </div>
          )}
        />
      );

    case "familyHistory":
      return (
        <ListEditor
          items={data.familyHistory as unknown as Record<string, string>[]}
          onAdd={() => h.handleAdd("familyHistory", { relation:"",condition:"" })}
          onRemove={i => h.handleRemove("familyHistory", i)}
          addLabel="Add Entry" emptyLabel="No family history recorded"
          renderItem={(f, i) => (
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-4"><Fld label="Relation"><Input value={f.relation} onChange={e => h.handleArrayChange("familyHistory",i,"relation",e.target.value)} placeholder="e.g. Father" /></Fld></div>
              <div className="col-span-8"><Fld label="Condition"><Input value={f.condition} onChange={e => h.handleArrayChange("familyHistory",i,"condition",e.target.value)} /></Fld></div>
            </div>
          )}
        />
      );

    case "socialHistory":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Fld label="Smoking / Tobacco"><Input value={data.socialHistory.smoking} onChange={e => h.handleNested("socialHistory","smoking",e.target.value)} /></Fld>
          <Fld label="Alcohol Use"><Input value={data.socialHistory.alcohol} onChange={e => h.handleNested("socialHistory","alcohol",e.target.value)} /></Fld>
          <Fld label="Occupation"><Input value={data.socialHistory.occupation} onChange={e => h.handleNested("socialHistory","occupation",e.target.value)} /></Fld>
          <Fld label="Employer"><Input value={data.socialHistory.employer} onChange={e => h.handleNested("socialHistory","employer",e.target.value)} /></Fld>
          <div className="sm:col-span-2"><Fld label="Exercise Frequency"><Input value={data.socialHistory.exercise} onChange={e => h.handleNested("socialHistory","exercise",e.target.value)} /></Fld></div>
        </div>
      );

    case "obgynHistory":
      if (!data.obgynHistory) {
        return (
          <div className="text-center py-8 space-y-3">
            <p className="text-sm text-slate-500">No OB/GYN history recorded.</p>
            <Button variant="outline" onClick={() => h.handleChange("obgynHistory", DEFAULT_OBGYN)}>Add OB/GYN History</Button>
          </div>
        );
      }
      return (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Fld label="Last Menstrual Period (LMP)"><Input type="date" value={data.obgynHistory.lmp} onChange={e => h.handleNested("obgynHistory","lmp",e.target.value)} /></Fld>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Pregnancy History</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {[
                { key: "pregnancies", label: "Pregnancies (G)" },
                { key: "deliveries", label: "Deliveries (P)" },
                { key: "liveBirths", label: "Live Births" },
                { key: "miscarriages", label: "Miscarriages" },
                { key: "abortions", label: "Terminations" },
              ].map(({ key, label }) => (
                <Fld key={key} label={label}>
                  <Input
                    type="number" min="0"
                    value={(data.obgynHistory as unknown as Record<string, string>)[key]}
                    onChange={e => h.handleNested("obgynHistory", key, e.target.value)}
                  />
                </Fld>
              ))}
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => h.handleChange("obgynHistory", null)}>
            <X className="w-3 h-3 mr-1" />Remove OB/GYN History
          </Button>
        </div>
      );

    case "reviewOfSystems":
      return (
        <div className="space-y-6">
          <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
            Click a symptom to mark as <span className="font-semibold text-blue-600">Present</span>, click again to mark as <span className="font-semibold text-slate-500 line-through">Denied</span>, click once more to clear.
          </p>
          {Object.entries(ROS_SYSTEMS).map(([systemKey, symptoms]) => {
            const ros = data.reviewOfSystems as ReviewOfSystems;
            const systemData = ros[systemKey as keyof ReviewOfSystems] ?? {};
            return (
              <div key={systemKey}>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {SYSTEM_LABELS[systemKey]}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {symptoms.map(symptom => {
                    const val = systemData[symptom] ?? "";
                    return (
                      <button
                        key={symptom}
                        type="button"
                        onClick={() => {
                          const next = val === "Present" ? "Denied" : val === "Denied" ? "" : "Present";
                          h.handleROS(systemKey, symptom, next);
                        }}
                        className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-all border ${
                          val === "Present"
                            ? "bg-blue-50 border-blue-200 text-blue-800"
                            : val === "Denied"
                              ? "bg-slate-50 border-slate-200 text-slate-400 line-through"
                              : "border-slate-100 text-slate-500 hover:bg-slate-50 hover:border-slate-200"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          val === "Present" ? "bg-blue-500" : val === "Denied" ? "bg-slate-300" : "bg-slate-200"
                        }`} />
                        {symptom}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      );

    default:
      return null;
  }
}
