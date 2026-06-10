import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useValidateCode, getValidateCodeQueryKey } from "@workspace/api-client-react";
import type { Patient } from "@workspace/api-client-react";
import {
  AlertTriangle, AlertCircle, ShieldOff, Clock, FileText, Loader2,
  User, Calendar, Pill, HeartPulse, Brain, Sparkles,
  FileCheck, ClipboardList, Copy, Download, Printer, CheckCircle2,
  Building2, X, CheckCheck,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type AllergyT    = { name: string; severity: string; reaction: string };
type MedT        = { name: string; dose: string; route: string; frequency: string; prescriber: string; reason: string };
type ConditionT  = { name: string; status: string; diagnosedDate: string; notes: string };
type SurgeryT    = { procedure: string; date: string; facility: string };
type HospT       = { reason: string; date: string; facility: string; duration: string; outcome: string };
type FamilyT     = { relation: string; condition: string };
type ImmunizationT = { vaccine: string; date: string; notes: string };
type ConsentItemT = { agreed: boolean; date: string; signature: string };
type ApiErrorLike = { data?: { errorCode?: string } };
type RecentUpdateT = { category: string; label: string; updatedAt: string };

// ─── Constants ────────────────────────────────────────────────────────────────
const TODAY_PATIENTS = [
  { id: "P001", name: "Maria Lopez",    initials: "ML", time: "8:30 AM",  specialty: "Endocrinology",  status: "active"   as const },
  { id: "P002", name: "James Thornton", initials: "JT", time: "9:00 AM",  specialty: "Internal Med.",  status: "waiting"  as const },
  { id: "P003", name: "Aisha Rahman",   initials: "AR", time: "9:30 AM",  specialty: "Cardiology",     status: "waiting"  as const },
  { id: "P004", name: "Carlos Mendez",  initials: "CM", time: "10:15 AM", specialty: "Endocrinology",  status: "upcoming" as const },
  { id: "P005", name: "Jennifer Park",  initials: "JP", time: "11:00 AM", specialty: "Internal Med.",  status: "upcoming" as const },
];

const CONSENT_DEFS = [
  { key: "hipaa",          label: "HIPAA Privacy Practices" },
  { key: "consentToTreat", label: "Consent to Treat" },
  { key: "billingPolicy",  label: "Financial & Billing Policy" },
  { key: "releaseInfo",    label: "Authorization to Release" },
  { key: "telehealth",     label: "Telehealth Consent" },
] as const;

const TABS = [
  { value: "demographics",  label: "Demographics" },
  { value: "insurance",     label: "Insurance" },
  { value: "medications",   label: "Medications" },
  { value: "allergies",     label: "Allergies" },
  { value: "conditions",    label: "Conditions & History" },
  { value: "surgeries",     label: "Surgeries & Hosp." },
  { value: "family",        label: "Family & Social" },
  { value: "immunizations", label: "Immunizations" },
  { value: "ros",           label: "Review of Systems" },
  { value: "consents",      label: "Consents" },
];

const ROS_SYSTEMS: Record<string, string[]> = {
  constitutional:  ["Fatigue", "Weight gain", "Weight loss", "Fever", "Night sweats"],
  cardiovascular:  ["Chest pain", "Palpitations", "Edema", "Shortness of breath"],
  respiratory:     ["Cough", "Wheezing", "Dyspnea", "Hemoptysis"],
  gastrointestinal:["Nausea", "Vomiting", "Diarrhea", "Constipation", "Abdominal pain", "Heartburn/GERD"],
  neurological:    ["Headaches", "Dizziness", "Numbness", "Weakness", "Seizures"],
  musculoskeletal: ["Joint pain", "Back pain", "Muscle weakness", "Swelling"],
  skin:            ["Rash", "Itching", "Lesions", "Hair loss"],
  psychiatric:     ["Anxiety", "Depression", "Insomnia", "Memory issues"],
};

const SYSTEM_LABELS: Record<string, string> = {
  constitutional: "Constitutional", cardiovascular: "Cardiovascular",
  respiratory: "Respiratory", gastrointestinal: "Gastrointestinal",
  neurological: "Neurological", musculoskeletal: "Musculoskeletal",
  skin: "Skin", psychiatric: "Psychiatric",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcAge(dob: string): string {
  if (!dob) return "—";
  const today = new Date();
  const birth = new Date(dob + "T00:00:00");
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return isNaN(age) ? "—" : String(age);
}

function fmtDate(d: string | undefined | null): string {
  if (!d) return "—";
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return d; }
}

function fmtTS(ts: string): string {
  try { return new Date(ts).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return ts; }
}

function getErrorMessage(error: unknown) {
  const code = (error as ApiErrorLike)?.data?.errorCode;
  switch (code) {
    case "CODE_REVOKED": return { heading: "Pass revoked",    body: "The patient revoked this access code. Ask them to generate a new pass.",    icon: <ShieldOff className="w-4 h-4" /> };
    case "CODE_EXPIRED": return { heading: "Pass expired",    body: "This code is no longer valid. Ask the patient to generate a new pass.",      icon: <Clock className="w-4 h-4" /> };
    default:             return { heading: "Code not found",  body: "No matching code was found. Check the number and try again.",                icon: <AlertCircle className="w-4 h-4" /> };
  }
}

function calcBMI(ft: string, inches: string, lbs: string): string {
  const totalIn = (parseInt(ft) || 0) * 12 + (parseInt(inches) || 0);
  const weight = parseFloat(lbs) || 0;
  if (!totalIn || !weight) return "—";
  return ((weight * 703) / (totalIn * totalIn)).toFixed(1);
}

function formatPatientText(p: Patient): string {
  const ct  = p.careTeam as unknown as Record<string, string>;
  const ins = p.insurance as unknown as Record<string, string>;
  const ec  = p.emergencyContact as unknown as Record<string, string>;
  const v   = p.vitals as unknown as Record<string, string>;
  const consents = p.consents as unknown as Record<string, ConsentItemT>;
  const signed = Object.values(consents).filter(c => c?.agreed).length;
  const bmi = calcBMI(v.heightFt, v.heightIn, v.weightLbs);
  const lines = [
    "=== CAREFORM AI — PATIENT INTAKE RECORD ===",
    `Generated: ${new Date().toLocaleString()}`,
    "",
    `PATIENT: ${p.firstName} ${p.lastName}`,
    `DOB: ${p.dateOfBirth}  |  Age: ${calcAge(p.dateOfBirth)}  |  Sex: ${p.biologicalSex}  |  Blood Type: ${p.bloodType || "Unknown"}`,
    `Phone: ${p.phone}  |  Email: ${p.email}`,
    `Address: ${p.address}`,
    "",
    "VISIT",
    `Specialty: ${ct.visitSpecialty || "—"}  |  Reason: ${ct.reasonForVisit || "—"}  |  PCP: ${ct.pcp || "—"}`,
    "",
    "INSURANCE",
    `Primary: ${ins.plan || "—"}  |  Member ID: ${ins.memberId || "—"}  |  Group: ${ins.group || "—"}`,
    "",
    "EMERGENCY CONTACT",
    `${ec.name || "—"} (${ec.relationship || "—"}) ${ec.phone || "—"}`,
    "",
    "VITALS",
    `Height: ${v.heightFt ? `${v.heightFt}'${v.heightIn}"` : "—"}  |  Weight: ${v.weightLbs ? `${v.weightLbs} lbs` : "—"}  |  BMI: ${bmi}`,
    `BP: ${v.systolic && v.diastolic ? `${v.systolic}/${v.diastolic} mmHg` : "—"}`,
    "",
    `ALLERGIES (${(p.allergies as AllergyT[]).length})`,
    ...(p.allergies as AllergyT[]).map(a => `  • ${a.name} — ${a.severity} — ${a.reaction}`),
    "",
    `MEDICATIONS (${(p.medications as MedT[]).length})`,
    ...(p.medications as MedT[]).map(m => `  • ${m.name} ${m.dose} | ${m.frequency} | ${m.route}`),
    "",
    `ACTIVE CONDITIONS (${(p.conditions as ConditionT[]).filter(c => c.status === "Active").length})`,
    ...(p.conditions as ConditionT[]).filter(c => c.status === "Active").map(c => `  • ${c.name}${c.diagnosedDate ? ` (dx ${c.diagnosedDate})` : ""}`),
    "",
    `CONSENTS: ${signed} of 5 signed`,
    "",
    "=== END OF RECORD ===",
  ];
  return lines.join("\n");
}

// ─── Small UI atoms ───────────────────────────────────────────────────────────
function Row({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex gap-3 text-sm py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-slate-400 w-36 flex-shrink-0 text-xs">{label}</span>
      <span className={`font-medium text-slate-800 text-sm ${mono ? "font-mono text-xs mt-0.5" : ""}`}>{value || "—"}</span>
    </div>
  );
}

function SHead({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 mt-5 first:mt-0">{children}</p>;
}

function Empty({ label }: { label: string }) {
  return <p className="text-sm text-slate-400 italic py-6 text-center">{label}</p>;
}

// ─── Allergy Banner ───────────────────────────────────────────────────────────
function AllergyBanner({ allergies }: { allergies: AllergyT[] }) {
  const severe = allergies.filter(a => a.severity === "Severe");
  return (
    <div className={`flex items-start gap-3 px-6 py-3 text-white flex-shrink-0 ${severe.length > 0 ? "bg-rose-600" : "bg-amber-500"}`}>
      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span className="font-bold text-xs uppercase tracking-wide mr-1">Allergy Alert</span>
      {severe.length > 0 ? (
        <span className="text-sm opacity-95">
          Severe reaction{severe.length > 1 ? "s" : ""} to <strong>{severe.map(a => a.name).join(", ")}</strong> — verify before prescribing.
          {allergies.length > severe.length && ` ${allergies.length - severe.length} additional allerg${allergies.length - severe.length > 1 ? "ies" : "y"} on file.`}
        </span>
      ) : (
        <span className="text-sm opacity-95">{allergies.map(a => `${a.name} (${a.severity.toLowerCase()})`).join(" · ")}</span>
      )}
    </div>
  );
}

// ─── Tab Panels ───────────────────────────────────────────────────────────────
function DemographicsTab({ patient: p }: { patient: Patient }) {
  const ct = p.careTeam as unknown as Record<string, string>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
      <div>
        <SHead>Identity</SHead>
        <Row label="Full Name"       value={`${p.firstName} ${p.lastName}`} />
        <Row label="Preferred Name"  value={p.preferredName} />
        <Row label="Pronouns"        value={p.pronouns} />
        <Row label="Date of Birth"   value={`${fmtDate(p.dateOfBirth)} (age ${calcAge(p.dateOfBirth)})`} />
        <Row label="Biological Sex"  value={p.biologicalSex} />
        <Row label="Gender Identity" value={p.genderIdentity} />
        <Row label="Blood Type"      value={p.bloodType} />
        <Row label="Marital Status"  value={p.maritalStatus} />
        <SHead>Background</SHead>
        <Row label="Race"            value={p.race} />
        <Row label="Ethnicity"       value={p.ethnicity} />
        <Row label="Interpreter"     value={p.interpreterNeeded ? "Required" : "Not required"} />
        {p.ssnLastFour && <Row label="SSN (last 4)" value={`••••${p.ssnLastFour}`} mono />}
      </div>
      <div>
        <SHead>Contact</SHead>
        <Row label="Phone"    value={p.phone} />
        <Row label="Email"    value={p.email} />
        <Row label="Address"  value={p.address} />
        <Row label="Language" value={p.preferredLanguage} />
        <SHead>Care Team &amp; Visit</SHead>
        <Row label="Specialty"      value={ct.visitSpecialty} />
        <Row label="Reason"         value={ct.reasonForVisit} />
        <Row label="PCP"            value={ct.pcp} />
        <Row label="Referring"      value={ct.referringPhysician} />
        <Row label="Pharmacy"       value={ct.preferredPharmacy} />
        <Row label="Pharm. Phone"   value={ct.pharmacyPhone} />
      </div>
    </div>
  );
}

function InsuranceTab({ patient: p }: { patient: Patient }) {
  const ins = p.insurance as unknown as Record<string, string>;
  const sec = p.insuranceSecondary as unknown as Record<string, string> | null;
  const ec  = p.emergencyContact as unknown as Record<string, string>;
  const rp  = p.responsibleParty as unknown as Record<string, string> | null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
      <div>
        <SHead>Primary Insurance</SHead>
        <Row label="Plan"         value={ins.plan} />
        <Row label="Member ID"    value={ins.memberId} mono />
        <Row label="Group #"      value={ins.group} mono />
        <Row label="Policyholder" value={ins.policyholder} />
        <Row label="Relationship" value={ins.relationship} />
        <Row label="Phone"        value={ins.phone} />
        {sec && (
          <>
            <SHead>Secondary Insurance</SHead>
            <Row label="Plan"         value={sec.plan} />
            <Row label="Member ID"    value={sec.memberId} mono />
            <Row label="Group #"      value={sec.group} mono />
            <Row label="Policyholder" value={sec.policyholder} />
          </>
        )}
      </div>
      <div>
        <SHead>Emergency Contact</SHead>
        <Row label="Name"         value={ec.name} />
        <Row label="Relationship" value={ec.relationship} />
        <Row label="Phone"        value={ec.phone} />
        {rp && (
          <>
            <SHead>Responsible Party</SHead>
            <Row label="Name"         value={rp.name} />
            <Row label="Relationship" value={rp.relationship} />
            <Row label="Phone"        value={rp.phone} />
            <Row label="DOB"          value={rp.dateOfBirth ? fmtDate(rp.dateOfBirth) : undefined} />
          </>
        )}
      </div>
    </div>
  );
}

function UpdatesBanner({ updates }: { updates: RecentUpdateT[] }) {
  const grouped = updates.reduce((acc, u) => {
    (acc[u.category] ??= []).push(u.label);
    return acc;
  }, {} as Record<string, string[]>);
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-5 py-3">
      <div className="max-w-4xl flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800">Updated since last visit</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
            {Object.entries(grouped).map(([cat, labels]) => (
              <span key={cat} className="text-xs text-amber-700">
                <span className="capitalize font-medium">{cat}</span>: {labels.join(", ")}
              </span>
            ))}
          </div>
          <p className="text-xs text-amber-600 mt-1 italic">No new paperwork needed — patient updated their record directly.</p>
        </div>
      </div>
    </div>
  );
}

function MedicationsTab({ patient: p, updatedLabels }: { patient: Patient; updatedLabels: Set<string> }) {
  const meds = p.medications as MedT[];
  if (!meds.length) return <Empty label="No medications on file" />;
  return (
    <div className="divide-y divide-slate-100">
      {meds.map((m, i) => {
        const isUpdated = updatedLabels.has(m.name) || updatedLabels.has(`${m.name} ${m.dose}`);
        return (
          <div key={i} className={`py-4 ${isUpdated ? "bg-amber-50/40 -mx-6 px-6 rounded" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-900">{m.name}</p>
                {isUpdated && <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border border-amber-300">Updated</Badge>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {m.dose      && <Badge variant="secondary" className="font-mono text-xs">{m.dose}</Badge>}
                {m.route     && <Badge variant="outline"   className="text-xs">{m.route}</Badge>}
                {m.frequency && <Badge variant="outline"   className="text-xs">{m.frequency}</Badge>}
              </div>
            </div>
            {m.reason     && <p className="text-sm text-slate-500 mt-1">{m.reason}</p>}
            {m.prescriber && <p className="text-xs text-slate-400 mt-0.5">Prescriber: {m.prescriber}</p>}
          </div>
        );
      })}
    </div>
  );
}

function AllergiesTab({ patient: p }: { patient: Patient }) {
  const allergies = p.allergies as AllergyT[];
  if (!allergies.length) return <Empty label="No known allergies (NKDA)" />;
  return (
    <div className="divide-y divide-slate-100">
      {allergies.map((a, i) => (
        <div key={i} className="py-4 flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-slate-900">{a.name}</p>
            {a.reaction && <p className="text-sm text-slate-500 mt-0.5">Reaction: {a.reaction}</p>}
          </div>
          <Badge variant={a.severity === "Severe" ? "destructive" : a.severity === "Moderate" ? "default" : "secondary"} className="flex-shrink-0 text-xs capitalize">
            {a.severity}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function ConditionsTab({ patient: p }: { patient: Patient }) {
  const all      = p.conditions as ConditionT[];
  const active   = all.filter(c => c.status === "Active");
  const inactive = all.filter(c => c.status !== "Active");
  if (!all.length) return <Empty label="No conditions on file" />;
  return (
    <div>
      {active.length > 0 && (
        <>
          <SHead>Active Conditions</SHead>
          <div className="divide-y divide-slate-100 mb-4">
            {active.map((c, i) => (
              <div key={i} className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{c.name}</p>
                  <Badge variant="default" className="text-xs flex-shrink-0">Active</Badge>
                </div>
                {c.diagnosedDate && <p className="text-xs text-slate-400 mt-0.5">Diagnosed: {fmtDate(c.diagnosedDate)}</p>}
                {c.notes && <p className="text-sm text-slate-600 mt-1 bg-slate-50 rounded px-3 py-2">{c.notes}</p>}
              </div>
            ))}
          </div>
        </>
      )}
      {inactive.length > 0 && (
        <>
          <SHead>Historical / Resolved</SHead>
          <div className="divide-y divide-slate-100">
            {inactive.map((c, i) => (
              <div key={i} className="py-3 flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-500">{c.name}</p>
                  {c.diagnosedDate && <p className="text-xs text-slate-400 mt-0.5">Diagnosed: {fmtDate(c.diagnosedDate)}</p>}
                </div>
                <Badge variant="secondary" className="text-xs flex-shrink-0">{c.status}</Badge>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SurgeriesTab({ patient: p }: { patient: Patient }) {
  const surgeries = p.surgeries as SurgeryT[];
  const hosps     = p.hospitalizations as HospT[];
  return (
    <div>
      <SHead>Surgeries &amp; Procedures ({surgeries.length})</SHead>
      {!surgeries.length ? <Empty label="None reported" /> : (
        <div className="divide-y divide-slate-100 mb-4">
          {surgeries.map((s, i) => (
            <div key={i} className="py-3">
              <p className="font-medium text-slate-900">{s.procedure}</p>
              <div className="flex gap-4 mt-1 text-xs text-slate-400">
                {s.date     && <span className="flex items-center gap-1"><Calendar   className="w-3 h-3" />{fmtDate(s.date)}</span>}
                {s.facility && <span className="flex items-center gap-1"><Building2  className="w-3 h-3" />{s.facility}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      <SHead>Hospitalizations ({hosps.length})</SHead>
      {!hosps.length ? <Empty label="None reported" /> : (
        <div className="divide-y divide-slate-100">
          {hosps.map((h, i) => (
            <div key={i} className="py-3">
              <p className="font-medium text-slate-900">{h.reason}</p>
              <div className="flex flex-wrap gap-4 mt-1 text-xs text-slate-400">
                {h.date     && <span>{fmtDate(h.date)}</span>}
                {h.facility && <span>{h.facility}</span>}
                {h.duration && <span>{h.duration}</span>}
                {h.outcome  && <span className="text-slate-600">Outcome: {h.outcome}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FamilySocialTab({ patient: p }: { patient: Patient }) {
  const fh = p.familyHistory as { relation: string; condition: string }[];
  const sh = p.socialHistory as unknown as Record<string, string>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
      <div>
        <SHead>Family History ({fh.length})</SHead>
        {!fh.length ? <Empty label="None reported" /> : (
          <div className="divide-y divide-slate-100">
            {fh.map((f, i) => (
              <div key={i} className="py-2.5 flex items-start gap-3">
                <Badge variant="outline" className="text-xs flex-shrink-0 mt-0.5">{f.relation}</Badge>
                <span className="text-sm text-slate-700">{f.condition}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <SHead>Social History</SHead>
        <Row label="Smoking / Tobacco" value={sh.smoking} />
        <Row label="Alcohol Use"        value={sh.alcohol} />
        <Row label="Recreational Drugs" value={sh.drugs} />
        <Row label="Exercise"           value={sh.exercise} />
        <Row label="Occupation"         value={sh.occupation} />
        <Row label="Employer"           value={sh.employer} />
        <Row label="Living Situation"   value={sh.livingSituation} />
      </div>
    </div>
  );
}

function ImmunizationsTab({ patient: p }: { patient: Patient }) {
  const imms = p.immunizations as ImmunizationT[];
  if (!imms.length) return <Empty label="No immunizations on file" />;
  return (
    <div className="divide-y divide-slate-100">
      {imms.map((imm, i) => (
        <div key={i} className="py-3 flex items-center justify-between gap-4">
          <p className="font-medium text-slate-900">{imm.vaccine}</p>
          <div className="flex items-center gap-3 text-xs text-slate-400 flex-shrink-0">
            {imm.notes && <span>{imm.notes}</span>}
            {imm.date  && <span className="font-mono">{fmtDate(imm.date)}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function ROSTab({ patient: p }: { patient: Patient }) {
  const ros = p.reviewOfSystems as unknown as Record<string, Record<string, string>>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Object.entries(ROS_SYSTEMS).map(([sysKey, symptoms]) => {
        const sysData = ros[sysKey] ?? {};
        const presentCount = symptoms.filter(s => sysData[s] === "Present").length;
        const deniedCount  = symptoms.filter(s => sysData[s] === "Denied").length;
        return (
          <div key={sysKey} className="rounded-lg border border-slate-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-sm text-slate-700">{SYSTEM_LABELS[sysKey]}</p>
              <div className="flex gap-1.5 text-xs">
                {presentCount > 0 && <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded font-medium">{presentCount} present</span>}
                {deniedCount  > 0 && <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{deniedCount} denied</span>}
                {presentCount === 0 && deniedCount === 0 && <span className="text-slate-300">Not reviewed</span>}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {symptoms.map(s => {
                const val = sysData[s];
                if (!val) return <span key={s} className="text-xs text-slate-300 px-2 py-0.5 border border-slate-100 rounded">{s}</span>;
                const cls = val === "Present"
                  ? "bg-rose-50 text-rose-700 border-rose-200 font-medium"
                  : "bg-slate-50 text-slate-400 border-slate-100 line-through";
                return <span key={s} className={`text-xs px-2 py-0.5 border rounded ${cls}`}>{s}</span>;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ConsentsTab({ patient: p }: { patient: Patient }) {
  const consents = p.consents as unknown as Record<string, ConsentItemT>;
  const sig = p.signature as { text?: string; dataUrl?: string; date?: string } | null;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CONSENT_DEFS.map(({ key, label }) => {
          const item   = consents[key as string] as ConsentItemT | undefined;
          const signed = item?.agreed === true;
          return (
            <div key={key} className={`rounded-xl border p-4 ${signed ? "border-emerald-100 bg-emerald-50/30" : "border-slate-200 bg-slate-50/50"}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm font-semibold text-slate-800 leading-snug">{label}</p>
                {signed
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  : <X            className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />
                }
              </div>
              {signed && item ? (
                <>
                  {item.date && <p className="text-xs text-slate-500 mb-2">{fmtDate(item.date)}</p>}
                  {item.signature && (
                    <p style={{ fontFamily: "'Dancing Script', cursive", fontSize: "1.15rem" }} className="text-slate-700 leading-tight">
                      {item.signature}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-400 italic">Not signed</p>
              )}
            </div>
          );
        })}
      </div>

      {sig && (
        <div className="rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Patient Signature</p>
          {sig.dataUrl
            ? <img src={sig.dataUrl} alt="Patient signature" className="max-h-16 object-contain" />
            : sig.text && <p style={{ fontFamily: "'Dancing Script', cursive", fontSize: "1.75rem" }} className="text-slate-800">{sig.text}</p>
          }
          {sig.date && <p className="text-xs text-slate-400 mt-2">{fmtDate(sig.date)}</p>}
        </div>
      )}
    </div>
  );
}

// ─── AI Summary Panel ─────────────────────────────────────────────────────────
function AISummaryPanel({
  summary, loading, error, onGenerate,
}: { summary: string | null; loading: boolean; error: string | null; onGenerate: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <Brain className="w-4 h-4" />
          <span className="font-semibold text-sm tracking-wide">AI Clinician Summary</span>
        </div>
        <Button
          size="sm"
          onClick={onGenerate}
          disabled={loading}
          className="h-7 text-xs bg-white/15 hover:bg-white/25 text-white border border-white/25 shadow-none gap-1.5"
        >
          {loading
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <Sparkles className="w-3 h-3" />
          }
          {summary ? "Refresh" : "Generate"}
        </Button>
      </div>
      <div className="px-5 py-4 min-h-[64px]">
        {loading && (
          <div className="flex items-center gap-2.5 text-slate-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            Generating clinical summary…
          </div>
        )}
        {!loading && !summary && !error && (
          <p className="text-sm text-slate-400 italic">
            Click <span className="font-medium text-slate-500 not-italic">Generate</span> for a structured narrative from this patient's intake data.
          </p>
        )}
        {!loading && summary && (
          <p className="text-sm text-slate-700 leading-relaxed">{summary}</p>
        )}
        {!loading && error && (
          <p className="text-sm text-rose-600">{error}</p>
        )}
      </div>
    </div>
  );
}

// ─── Provider Dashboard ───────────────────────────────────────────────────────
function ProviderDashboard({ data, onClose }: { data: { patient: Patient; expiresAt: string; lastViewedAt: string | null }; onClose: () => void }) {
  const p = data.patient;

  const [activeTab,    setActiveTab]    = useState("demographics");
  const [summary,      setSummary]      = useState<string | null>(null);
  const [summLoading,  setSummLoading]  = useState(false);
  const [summError,    setSummError]    = useState<string | null>(null);
  const [isReviewed,   setIsReviewed]   = useState(false);
  const [copied,       setCopied]       = useState(false);
  const [notes,        setNotes]        = useState(() => localStorage.getItem(`pnotes-${p.id}`) ?? "");

  useEffect(() => { localStorage.setItem(`pnotes-${p.id}`, notes); }, [notes, p.id]);

  const allergies   = p.allergies  as AllergyT[];
  const medications = p.medications as MedT[];
  const conditions  = p.conditions  as ConditionT[];
  const consentsObj = p.consents    as unknown as Record<string, ConsentItemT>;
  const ct          = p.careTeam    as unknown as Record<string, string>;
  const activeCount = conditions.filter(c => c.status === "Active").length;
  const signedCount = Object.values(consentsObj).filter(c => c?.agreed).length;

  const recentUpdates = (p.recentUpdates ?? []) as RecentUpdateT[];
  const lastViewedDate = data.lastViewedAt ? data.lastViewedAt.split("T")[0] : null;
  const newUpdates = recentUpdates.filter(u => !lastViewedDate || u.updatedAt >= lastViewedDate);
  const medUpdatedLabels = new Set(newUpdates.filter(u => u.category === "medications").map(u => u.label));

  const generateSummary = useCallback(async () => {
    setSummLoading(true);
    setSummError(null);
    try {
      const res  = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient: p }),
      });
      if (!res.ok) throw new Error("server error");
      const json = await res.json() as { summary: string };
      setSummary(json.summary);
    } catch {
      setSummError("Unable to generate summary. Please try again.");
    } finally {
      setSummLoading(false);
    }
  }, [p]);

  const handleCopyEHR = useCallback(async () => {
    await navigator.clipboard.writeText(formatPatientText(p));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [p]);

  const handleExport = useCallback(() => {
    const blob = new Blob([formatPatientText(p)], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `${p.lastName}_${p.firstName}_intake.txt`; a.click();
    URL.revokeObjectURL(url);
  }, [p]);

  return (
    <div className="h-dvh bg-slate-50 flex flex-col font-sans text-slate-900 overflow-hidden">
      {/* ── Top bar ── */}
      <header className="bg-white border-b border-slate-200 px-5 h-14 flex items-center gap-3 flex-shrink-0 shadow-sm z-20">
        <span className="font-bold text-base tracking-tight text-primary flex-shrink-0">CarePass AI</span>
        <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full flex-shrink-0">Provider View</span>
        <span className="hidden md:block text-slate-300 text-sm">|</span>
        <span className="hidden md:block font-semibold text-slate-800 truncate">{p.firstName} {p.lastName}</span>
        <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 hidden sm:flex" onClick={handleCopyEHR}>
            {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied!" : "Copy to EHR"}
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 hidden sm:flex" onClick={handleExport}>
            <Download className="w-3.5 h-3.5" />Export
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 hidden md:flex" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5" />Print
          </Button>
          <Button
            size="sm"
            className={`h-8 text-xs gap-1.5 ${isReviewed ? "bg-emerald-600 hover:bg-emerald-700 border-emerald-600" : ""}`}
            onClick={() => setIsReviewed(r => !r)}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isReviewed ? "Reviewed ✓" : "Mark Reviewed"}</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Sidebar ── */}
        <aside className="w-52 bg-white border-r border-slate-200 flex-col overflow-y-auto flex-shrink-0 hidden lg:flex">
          <div className="px-4 pt-5 pb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Today's Patients</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
          </div>
          <div className="flex-1 px-2 pb-4 space-y-0.5">
            {TODAY_PATIENTS.map(pt => {
              const active   = pt.status === "active";
              const waiting  = pt.status === "waiting";
              return (
                <div key={pt.id} className={`rounded-lg px-3 py-2.5 ${active ? "bg-blue-50 border border-blue-200" : "hover:bg-slate-50"}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                      active ? "bg-blue-600 text-white" : waiting ? "bg-slate-200 text-slate-600" : "bg-slate-100 text-slate-400"
                    }`}>{pt.initials}</div>
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold truncate ${active ? "text-blue-800" : "text-slate-700"}`}>{pt.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{pt.specialty}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1 pl-9">
                    <span className="text-[10px] text-slate-400">{pt.time}</span>
                    {active  && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium">Active</span>}
                    {waiting && <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-medium">Waiting</span>}
                    {pt.status === "upcoming" && <span className="text-[10px] text-slate-300">Upcoming</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-slate-100 px-4 py-3 text-[10px] text-slate-400">
            Pass expires {new Date(data.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="flex-1 overflow-y-auto">
          {allergies.length > 0 && <AllergyBanner allergies={allergies} />}
          {newUpdates.length > 0 && <UpdatesBanner updates={newUpdates} />}

          <div className="p-5 space-y-4 max-w-4xl">

            {/* Patient header */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{p.firstName} {p.lastName}</h1>
                  <div className="flex flex-wrap items-center gap-2 mt-2.5">
                    <span className="text-sm text-slate-500 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {calcAge(p.dateOfBirth)} y/o {p.biologicalSex} · DOB {fmtDate(p.dateOfBirth)}
                    </span>
                    {p.bloodType    && <Badge variant="secondary" className="font-mono text-xs">{p.bloodType}</Badge>}
                    {ct.visitSpecialty && <Badge variant="outline" className="text-xs text-blue-700 border-blue-200 bg-blue-50/80">{ct.visitSpecialty}</Badge>}
                  </div>
                  {ct.reasonForVisit && <p className="text-sm text-slate-500 mt-1.5 italic">{ct.reasonForVisit}</p>}
                </div>
                <div className="text-xs text-slate-400 flex-shrink-0 space-y-1">
                  <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3" />Updated {fmtTS(p.updatedAt)}</div>
                  {isReviewed && <div className="flex items-center gap-1.5 text-emerald-500"><CheckCircle2 className="w-3 h-3" />Marked reviewed</div>}
                </div>
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: HeartPulse, value: activeCount,        label: "Active Conditions", border: "border-rose-100",    bg: "bg-rose-50",    color: "text-rose-500"    },
                { icon: Pill,       value: medications.length,  label: "Medications",       border: "border-blue-100",    bg: "bg-blue-50",    color: "text-blue-500"    },
                { icon: AlertCircle,value: allergies.length,    label: "Known Allergies",   border: allergies.length ? "border-amber-100" : "border-slate-100",  bg: allergies.length ? "bg-amber-50" : "bg-slate-50", color: allergies.length ? "text-amber-500" : "text-slate-400" },
                { icon: FileCheck,  value: `${signedCount}/5`,  label: "Consents Signed",   border: signedCount === 5 ? "border-emerald-100" : "border-slate-100", bg: signedCount === 5 ? "bg-emerald-50" : "bg-slate-50", color: signedCount === 5 ? "text-emerald-500" : "text-slate-400" },
              ].map(({ icon: Icon, value, label, border, bg, color }) => (
                <div key={label} className={`bg-white rounded-xl border ${border} p-4 flex items-center gap-3 shadow-sm`}>
                  <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-[18px] h-[18px] ${color}`} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900 leading-none">{value}</div>
                    <div className="text-xs text-slate-500 mt-1">{label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* AI Summary */}
            <AISummaryPanel summary={summary} loading={summLoading} error={summError} onGenerate={generateSummary} />

            {/* Tabbed intake */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="border-b border-slate-100 overflow-x-auto">
                  <TabsList className="h-auto bg-transparent p-0 flex min-w-max rounded-none">
                    {TABS.map(tab => (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="h-10 px-4 text-xs font-medium rounded-none border-b-2 border-transparent
                          data-[state=active]:border-blue-600 data-[state=active]:text-blue-700
                          data-[state=active]:bg-transparent data-[state=active]:shadow-none
                          text-slate-500 hover:text-slate-700 whitespace-nowrap transition-colors"
                      >
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
                <div className="p-6">
                  <TabsContent value="demographics"  className="mt-0"><DemographicsTab  patient={p} /></TabsContent>
                  <TabsContent value="insurance"     className="mt-0"><InsuranceTab     patient={p} /></TabsContent>
                  <TabsContent value="medications"   className="mt-0"><MedicationsTab   patient={p} updatedLabels={medUpdatedLabels} /></TabsContent>
                  <TabsContent value="allergies"     className="mt-0"><AllergiesTab     patient={p} /></TabsContent>
                  <TabsContent value="conditions"    className="mt-0"><ConditionsTab    patient={p} /></TabsContent>
                  <TabsContent value="surgeries"     className="mt-0"><SurgeriesTab     patient={p} /></TabsContent>
                  <TabsContent value="family"        className="mt-0"><FamilySocialTab  patient={p} /></TabsContent>
                  <TabsContent value="immunizations" className="mt-0"><ImmunizationsTab patient={p} /></TabsContent>
                  <TabsContent value="ros"           className="mt-0"><ROSTab           patient={p} /></TabsContent>
                  <TabsContent value="consents"      className="mt-0"><ConsentsTab      patient={p} /></TabsContent>
                </div>
              </Tabs>
            </div>

            {/* Provider Notes */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <ClipboardList className="w-4 h-4 text-slate-400" />
                <p className="text-sm font-semibold text-slate-700">Provider Notes</p>
                <span className="ml-auto text-xs text-slate-400">Not shared with patient · Saved locally</span>
              </div>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add a clinical note for this visit…"
                className="text-sm resize-none border-slate-200 focus:border-blue-300 min-h-[72px]"
                rows={3}
              />
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

// ─── Code Entry (default export) ─────────────────────────────────────────────
export default function Provider() {
  const codeParam = new URLSearchParams(window.location.search).get("code") ?? "";
  const [inputCode, setInputCode] = useState(codeParam);
  const [activeCode, setActiveCode] = useState(codeParam);

  const { data, isLoading, error, isError } = useValidateCode(activeCode, {
    query: { queryKey: getValidateCodeQueryKey(activeCode), enabled: !!activeCode, retry: false },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputCode.replace(/\D/g, "").slice(0, 6);
    if (trimmed.length === 6) setActiveCode(trimmed);
  };

  if (data) {
    return <ProviderDashboard data={data} onClose={() => { setActiveCode(""); setInputCode(""); }} />;
  }

  const errInfo = isError ? getErrorMessage(error) : null;

  return (
    <Layout>
      <div className="max-w-sm mx-auto mt-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-50 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Provider Access</h1>
          <p className="text-slate-500 mt-2 text-sm max-w-xs mx-auto">
            Enter the 6-digit code shared by the patient to view their intake record.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            value={inputCode}
            onChange={e => setInputCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className="text-center text-3xl font-mono tracking-[0.5em] h-16 border-2 focus:border-primary"
            autoFocus
            inputMode="numeric"
          />
          <Button
            type="submit"
            className="w-full h-12 text-base shadow-sm shadow-primary/20"
            disabled={inputCode.replace(/\D/g, "").length !== 6 || isLoading}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "View Patient Record"}
          </Button>
        </form>

        {errInfo && (
          <div className="mt-4 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-start gap-3 text-sm">
            <span className="text-rose-500 mt-0.5 flex-shrink-0">{errInfo.icon}</span>
            <div>
              <p className="font-semibold text-rose-700">{errInfo.heading}</p>
              <p className="text-rose-600 mt-0.5 text-xs">{errInfo.body}</p>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 mt-6">All patient data is read-only on this side.</p>
      </div>
    </Layout>
  );
}
