import { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { QRCodeSVG } from "qrcode.react";
import {
  useGetPatient, useUpdatePatient, useCreateCode, useRevokeCode,
  useGetActivePass, useGetAccessHistory,
  getGetActivePassQueryKey, getGetAccessHistoryQueryKey,
} from "@workspace/api-client-react";
import type { PatientInput, Consents, ConsentItem, PatientSignature, ObgynHistory, ResponsibleParty } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useDebounce } from "@/lib/use-debounce";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, Loader2, AlertCircle, AlertTriangle,
  QrCode, ShieldOff, Clock, ExternalLink, Copy,
  User, Activity, Building2, Shield, Phone,
  Pill, HeartPulse, FileText, Syringe, Users,
  Briefcase, Pencil, History, ClipboardList, RotateCcw, Pen,
} from "lucide-react";
import { renderEditForm, type Handlers, ROS_SYSTEMS } from "./home-edit-forms";

const PATIENT_ID = "demo";
const TODAY = new Date().toISOString().split("T")[0];

// ── Demo data (used by Reset button) ──────────────────────────────────────────
const DEMO_FORM_DATA: PatientInput = {
  firstName: "Maria", lastName: "Lopez",
  dateOfBirth: "1972-03-15", biologicalSex: "Female",
  genderIdentity: "Woman", preferredName: "Maria", pronouns: "She/Her",
  preferredLanguage: "English", maritalStatus: "Married",
  bloodType: "O+", ssnLastFour: "4471", race: "Hispanic or Latino",
  ethnicity: "Mexican American", interpreterNeeded: "No",
  phone: "(512) 823-4471", email: "maria.lopez@email.com",
  address: "247 Maple Street, Austin, TX 78701",
  careTeam: {
    pcp: "Dr. Ramesh Patel, MD — Austin Family Health",
    referringPhysician: "Dr. Ramesh Patel, MD",
    visitSpecialty: "Endocrinology",
    reasonForVisit: "Type 2 diabetes management follow-up; HbA1c review and medication adjustment",
    preferredPharmacy: "HEB Pharmacy #47",
    pharmacyAddress: "1825 S Congress Ave, Austin TX 78704",
    pharmacyPhone: "(512) 444-7890",
  },
  insurance: {
    plan: "Blue Cross Blue Shield of Texas PPO",
    memberId: "BCBS-7743219-TX", group: "GRP-45892",
    policyholder: "Maria E. Lopez",
    policyholderDob: "1972-03-15", policyholderRelationship: "Self",
    phone: "(800) 521-2227",
  },
  insuranceSecondary: {
    plan: "Medicare Part B", memberId: "1EG4-TE5-MK72", group: "N/A",
    policyholder: "Maria E. Lopez",
    policyholderDob: "1972-03-15", policyholderRelationship: "Self",
    phone: "(800) 633-4227",
  },
  responsibleParty: {
    name: "Maria E. Lopez", relationship: "Self", dob: "1972-03-15",
    phone: "(512) 823-4471", address: "247 Maple Street, Austin, TX 78701",
    employer: "Austin Independent School District",
  },
  emergencyContact: { name: "Carlos Alberto Lopez", relationship: "Spouse", phone: "(512) 823-4472" },
  allergies: [
    { name: "Penicillin", reaction: "Hives (urticaria), pruritus", severity: "Moderate" },
    { name: "Shellfish (shrimp, crab, lobster)", reaction: "Throat tightening, urticaria, facial swelling", severity: "Severe" },
  ],
  medications: [
    { name: "Metformin", dose: "1000 mg", frequency: "Twice daily with meals", route: "Oral", prescriber: "Dr. Ramesh Patel, MD", reason: "Type 2 diabetes mellitus — glycemic control" },
    { name: "Lisinopril", dose: "10 mg", frequency: "Once daily", route: "Oral", prescriber: "Dr. Ramesh Patel, MD", reason: "Hypertension" },
    { name: "Atorvastatin", dose: "20 mg", frequency: "Once daily at bedtime", route: "Oral", prescriber: "Dr. Ramesh Patel, MD", reason: "Hyperlipidemia — cardiovascular risk reduction" },
    { name: "Aspirin", dose: "81 mg", frequency: "Once daily", route: "Oral", prescriber: "Dr. Ramesh Patel, MD", reason: "Cardiovascular prophylaxis" },
    { name: "Vitamin D3", dose: "2000 IU", frequency: "Once daily", route: "Oral", prescriber: "Self (OTC)", reason: "Vitamin D deficiency maintenance" },
  ],
  conditions: [
    { name: "Type 2 Diabetes Mellitus", diagnosedDate: "2018-03", status: "Active", notes: "HbA1c 7.1% at last visit; diet-modified and on Metformin" },
    { name: "Hypertension", diagnosedDate: "2019-07", status: "Active", notes: "BP stable at 128/82 on Lisinopril 10 mg" },
    { name: "Hyperlipidemia", diagnosedDate: "2020-01", status: "Active", notes: "LDL 98 mg/dL at last labs; on Atorvastatin" },
    { name: "Obesity (Class I)", diagnosedDate: "2018-03", status: "Active", notes: "BMI 30.4; diet counseling ongoing" },
    { name: "Vitamin D Deficiency", diagnosedDate: "2022-09", status: "Resolved", notes: "Corrected with supplementation; levels now normal" },
  ],
  surgeries: [
    { procedure: "Laparoscopic Cholecystectomy", date: "2019-08-14", facility: "St. David's Medical Center, Austin TX" },
    { procedure: "Cesarean Section (C-section)", date: "2001-05-20", facility: "Seton Medical Center, Austin TX" },
  ],
  hospitalizations: [
    { reason: "Cholecystectomy — gallbladder removal", date: "2019-08-12", facility: "St. David's Medical Center, Austin TX" },
    { reason: "Cesarean Section — delivery of son Miguel", date: "2001-05-19", facility: "Seton Medical Center, Austin TX" },
    { reason: "Gestational diabetes — inpatient monitoring", date: "2001-04-10", facility: "Seton Medical Center, Austin TX" },
  ],
  immunizations: [
    { vaccine: "COVID-19 (mRNA Bivalent Booster)", date: "2023-10-12" },
    { vaccine: "Influenza (Flu Shot)", date: "2025-10-02" },
    { vaccine: "Tdap (Tetanus, Diphtheria, Pertussis)", date: "2021-03-15" },
    { vaccine: "Pneumococcal PCV15 (Prevnar 15)", date: "2022-09-08" },
    { vaccine: "Hepatitis B (series complete)", date: "1998-06-01" },
    { vaccine: "MMR (series complete)", date: "1978-04-10" },
  ],
  familyHistory: [
    { relation: "Father", condition: "Type 2 Diabetes Mellitus" },
    { relation: "Father", condition: "Coronary Artery Disease (MI at age 62)" },
    { relation: "Mother", condition: "Hypertension" },
    { relation: "Mother", condition: "Breast Cancer (dx age 68, treated, in remission)" },
    { relation: "Maternal Grandmother", condition: "Type 2 Diabetes Mellitus" },
    { relation: "Brother (age 50)", condition: "Hyperlipidemia" },
  ],
  socialHistory: {
    smoking: "Former smoker — quit 2010; ~5 pack-year history",
    alcohol: "Social drinker — 1–2 drinks per week",
    occupation: "High school biology teacher",
    employer: "Austin Independent School District",
    exercise: "Moderate — 30-min walks 3×/week; mostly sedentary at work",
  },
  vitals: { heightFt: "5", heightIn: "4", weightLbs: "178", systolic: "128", diastolic: "82" },
  reviewOfSystems: {
    constitutional: { "Fever": "Denied", "Fatigue": "Present", "Night sweats": "Denied", "Unexplained weight loss": "Denied", "Weight gain": "Present", "Chills": "Denied" },
    cardiovascular: { "Chest pain": "Denied", "Palpitations": "Denied", "Shortness of breath on exertion": "Denied", "Lower extremity edema": "Denied", "Orthopnea": "Denied" },
    respiratory: { "Cough": "Denied", "Wheezing": "Denied", "Shortness of breath at rest": "Denied", "Hemoptysis": "Denied" },
    gastrointestinal: { "Nausea": "Denied", "Vomiting": "Denied", "Diarrhea": "Denied", "Constipation": "Denied", "Abdominal pain": "Denied", "Heartburn / GERD": "Present" },
    neurological: { "Headaches": "Present", "Dizziness": "Denied", "Numbness or tingling": "Denied", "Seizures": "Denied", "Memory changes": "Denied" },
    musculoskeletal: { "Joint pain": "Denied", "Muscle weakness": "Denied", "Back pain": "Present", "Morning stiffness": "Denied" },
    skin: { "Rash": "Denied", "Itching": "Denied", "Hair loss": "Denied", "Wound healing changes": "Denied" },
    psychiatric: { "Depression": "Denied", "Anxiety": "Present", "Insomnia": "Present", "Suicidal ideation": "Denied" },
  },
  obgynHistory: { lmp: "2023-11-15", pregnancies: "2", deliveries: "1", miscarriages: "1", abortions: "0", liveBirths: "1" },
  consents: {
    hipaa: { agreed: true, date: TODAY, signature: "Maria Lopez" },
    consentToTreat: { agreed: true, date: TODAY, signature: "Maria Lopez" },
    billingPolicy: { agreed: true, date: TODAY, signature: "Maria Lopez" },
    releaseInfo: { agreed: true, date: TODAY, signature: "Maria Lopez" },
    telehealth: { agreed: true, date: TODAY, signature: "Maria Lopez" },
  },
  signature: { mode: "typed", text: "Maria Lopez", dataUrl: "", date: TODAY },
};

const CONSENT_DEFS: Array<{ key: keyof Consents; title: string; summary: string }> = [
  { key: "hipaa", title: "HIPAA Privacy Practices", summary: "I acknowledge receipt of this practice's Notice of Privacy Practices and understand how my health information may be used and disclosed." },
  { key: "consentToTreat", title: "Consent to Treat", summary: "I authorize the providers at this practice to perform any medical services reasonably necessary for my care." },
  { key: "billingPolicy", title: "Financial & Billing Policy", summary: "I acknowledge responsibility for all charges, including co-pays, deductibles, and non-covered services, and agree to the practice's billing policy." },
  { key: "releaseInfo", title: "Authorization to Release", summary: "I authorize this practice to release my health information to insurance carriers and other treating providers as needed." },
  { key: "telehealth", title: "Telehealth Consent", summary: "I consent to the use of telehealth technologies and acknowledge the risks, benefits, and limitations of remote care services." },
];

// ── Helper functions ───────────────────────────────────────────────────────────
function calcBMI(ft: string, inches: string, lbs: string): string {
  const totalIn = (parseInt(ft) || 0) * 12 + (parseInt(inches) || 0);
  const weight = parseFloat(lbs) || 0;
  if (!totalIn || !weight) return "—";
  return ((weight * 703) / (totalIn * totalIn)).toFixed(1);
}

function calcAge(dob: string): string {
  if (!dob) return "—";
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return isNaN(age) ? "—" : String(age);
}

function calcCompleteness(data: PatientInput): number {
  const rosMap = data.reviewOfSystems as unknown as Record<string, Record<string, string>>;
  const allPresent = Object.values(ROS_SYSTEMS).every(symptoms => {
    const sysKey = Object.keys(ROS_SYSTEMS).find(k => ROS_SYSTEMS[k] === symptoms) || "";
    const sysData = rosMap[sysKey] ?? {};
    return symptoms.every(s => sysData[s] === "Present" || sysData[s] === "Denied");
  });
  const consentCount = CONSENT_DEFS.filter(d => data.consents[d.key]?.agreed).length;
  const checks = [
    !!(data.firstName && data.lastName && data.dateOfBirth && data.phone && data.email && data.address),
    !!(data.vitals.heightFt && data.vitals.weightLbs && data.vitals.systolic),
    !!(data.careTeam.pcp && data.careTeam.visitSpecialty && data.careTeam.reasonForVisit),
    !!(data.insurance.plan && data.insurance.memberId),
    !!(data.emergencyContact.name && data.emergencyContact.phone),
    data.allergies.length > 0,
    data.medications.length > 0,
    data.conditions.length > 0,
    data.immunizations.length > 0,
    !!(data.socialHistory.smoking && data.socialHistory.occupation),
    !!(data.preferredName && data.race),
    allPresent,
    consentCount === 5,
    !!(data.signature?.text),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function useCountdown(expiresAt: string | null | undefined) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    if (!expiresAt) { setTimeLeft(""); return; }
    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Expired"); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setTimeLeft(h > 0 ? `${h}h ${m}m` : `${m}:${s.toString().padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return timeLeft;
}

// ── Small display components ───────────────────────────────────────────────────
function CompletenessRing({ pct }: { pct: number }) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative w-[68px] h-[68px] flex-shrink-0">
      <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="5" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="white" strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-white font-bold text-sm leading-none">{pct}%</span>
        <span className="text-white/60 text-[8px] leading-none mt-0.5">complete</span>
      </div>
    </div>
  );
}

function SectionCard({ icon: Icon, title, count, accentClass, preview, onEdit }: {
  icon: React.ElementType; title: string; count: string;
  accentClass: string; preview: React.ReactNode; onEdit: () => void;
}) {
  return (
    <div className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-200 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${accentClass}`}>
            <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 leading-tight">{title}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{count}</p>
          </div>
        </div>
        <button onClick={onEdit} className="flex items-center gap-1 text-xs font-medium text-blue-600 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
          <Pencil className="w-3 h-3" />Edit
        </button>
      </div>
      <div className="px-5 pb-5 flex-1 space-y-1.5 min-h-[72px]">{preview}</div>
    </div>
  );
}

function PreviewRow({ label, value }: { label?: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 text-sm leading-snug">
      {label && <span className="text-slate-400 text-xs flex-shrink-0">{label}</span>}
      <span className="text-slate-700 truncate">{value || <span className="text-slate-300 italic">Not set</span>}</span>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center bg-white/15 text-white text-xs font-medium px-3 py-1 rounded-full border border-white/20 backdrop-blur-sm">
      {children}
    </span>
  );
}

// ── Signature Pad ──────────────────────────────────────────────────────────────
function SignaturePad({ onSave }: { onSave: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getXY = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    if ("touches" in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    lastPos.current = getXY(e);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !lastPos.current) return;
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.strokeStyle = "#1e3a5f";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const pos = getXY(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDraw = () => { isDrawing.current = false; lastPos.current = null; };

  const handleClear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef} width={480} height={120}
        className="w-full border-2 border-dashed border-slate-200 rounded-xl cursor-crosshair bg-slate-50 touch-none"
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
      />
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={handleClear}>Clear</Button>
        <Button size="sm" className="flex-1" onClick={() => onSave(canvasRef.current!.toDataURL())}>Use This Signature</Button>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Home() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: patient, isLoading, error } = useGetPatient(PATIENT_ID);
  const updatePatient = useUpdatePatient();
  const { data: pass, isLoading: passLoading } = useGetActivePass(PATIENT_ID, {
    query: { queryKey: getGetActivePassQueryKey(PATIENT_ID), retry: false },
  });
  const { data: history, refetch: refetchHistory } = useGetAccessHistory(PATIENT_ID, {
    query: { queryKey: getGetAccessHistoryQueryKey(PATIENT_ID), retry: false, refetchInterval: 8000 },
  });
  const createCode = useCreateCode();
  const revokeCode = useRevokeCode();
  const timeLeft = useCountdown(pass?.expiresAt);

  const [formData, setFormData] = useState<PatientInput | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  // Signature signing state
  const [signingMode, setSigningMode] = useState(false);
  const [signTab, setSignTab] = useState<"typed" | "drawn">("typed");
  const [typedName, setTypedName] = useState("Maria Lopez");
  const initializedForId = useRef<string | null>(null);
  const lastSaved = useRef<string | null>(null);

  useEffect(() => {
    if (patient && initializedForId.current !== patient.id) {
      const init: PatientInput = {
        firstName: patient.firstName, lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth, biologicalSex: patient.biologicalSex,
        genderIdentity: patient.genderIdentity, preferredName: patient.preferredName,
        pronouns: patient.pronouns, preferredLanguage: patient.preferredLanguage,
        maritalStatus: patient.maritalStatus, bloodType: patient.bloodType,
        ssnLastFour: patient.ssnLastFour, race: patient.race,
        ethnicity: patient.ethnicity, interpreterNeeded: patient.interpreterNeeded,
        phone: patient.phone, email: patient.email, address: patient.address,
        careTeam: { ...patient.careTeam },
        insurance: { ...patient.insurance },
        insuranceSecondary: patient.insuranceSecondary ? { ...patient.insuranceSecondary } : null,
        responsibleParty: patient.responsibleParty ? { ...(patient.responsibleParty as ResponsibleParty) } : null,
        emergencyContact: { ...patient.emergencyContact },
        allergies: patient.allergies.map(a => ({ ...a })),
        medications: patient.medications.map(m => ({ ...m })),
        conditions: patient.conditions.map(c => ({ ...c })),
        surgeries: patient.surgeries.map(s => ({ ...s })),
        hospitalizations: patient.hospitalizations.map(h => ({ ...h })),
        immunizations: patient.immunizations.map(i => ({ ...i })),
        familyHistory: patient.familyHistory.map(f => ({ ...f })),
        socialHistory: { ...patient.socialHistory },
        vitals: { ...patient.vitals },
        reviewOfSystems: { ...patient.reviewOfSystems },
        obgynHistory: patient.obgynHistory ? { ...(patient.obgynHistory as ObgynHistory) } : null,
        consents: { ...patient.consents },
        signature: patient.signature ? { ...(patient.signature as PatientSignature) } : null,
      };
      setFormData(init);
      lastSaved.current = JSON.stringify(init);
      initializedForId.current = patient.id;
    }
  }, [patient]);

  const debouncedData = useDebounce(formData, 1200);

  const saveForm = useCallback(async (data: PatientInput) => {
    const s = JSON.stringify(data);
    if (s === lastSaved.current) return;
    setSaveStatus("saving");
    try {
      await updatePatient.mutateAsync({ id: PATIENT_ID, data });
      lastSaved.current = s;
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
      setSaveStatus("idle");
    }
  }, [updatePatient, toast]);

  useEffect(() => {
    if (debouncedData && initializedForId.current) saveForm(debouncedData);
  }, [debouncedData, saveForm]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleChange = useCallback((field: keyof PatientInput, value: unknown) =>
    setFormData(prev => prev ? { ...prev, [field]: value } : prev), []);

  const handleNested = useCallback((parent: string, field: string, value: string) =>
    setFormData(prev => {
      if (!prev) return prev;
      const map = prev as unknown as Record<string, unknown>;
      const cur = (map[parent] ?? {}) as Record<string, unknown>;
      return { ...prev, [parent]: { ...cur, [field]: value } } as PatientInput;
    }), []);

  const handleArrayChange = useCallback((arr: string, idx: number, field: string, value: unknown) =>
    setFormData(prev => {
      if (!prev) return prev;
      const map = prev as unknown as Record<string, unknown>;
      const list = [...(map[arr] as unknown[])] as Record<string, unknown>[];
      list[idx] = { ...list[idx], [field]: value };
      return { ...prev, [arr]: list } as PatientInput;
    }), []);

  const handleAdd = useCallback((arr: string, item: unknown) =>
    setFormData(prev => {
      if (!prev) return prev;
      const map = prev as unknown as Record<string, unknown>;
      return { ...prev, [arr]: [...((map[arr] as unknown[]) ?? []), item] } as PatientInput;
    }), []);

  const handleRemove = useCallback((arr: string, idx: number) =>
    setFormData(prev => {
      if (!prev) return prev;
      const map = prev as unknown as Record<string, unknown>;
      const list = [...(map[arr] as unknown[])];
      list.splice(idx, 1);
      return { ...prev, [arr]: list } as PatientInput;
    }), []);

  const handleROS = useCallback((system: string, symptom: string, value: string) =>
    setFormData(prev => {
      if (!prev) return prev;
      const ros = prev.reviewOfSystems as unknown as Record<string, Record<string, string>>;
      const updated: Record<string, Record<string, string>> = { ...ros, [system]: { ...(ros[system] ?? {}), [symptom]: value } };
      return { ...prev, reviewOfSystems: updated as unknown as typeof prev.reviewOfSystems };
    }), []);

  const handleConsent = useCallback((key: keyof Consents, field: keyof ConsentItem, value: unknown) =>
    setFormData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        consents: { ...prev.consents, [key]: { ...prev.consents[key], [field]: value } },
      };
    }), []);

  const handleReset = useCallback(() => {
    setFormData(DEMO_FORM_DATA);
    lastSaved.current = null;
    toast({ title: "Demo data restored" });
  }, [toast]);

  const handleApplySignature = useCallback(() => {
    if (signTab === "typed" && typedName.trim()) {
      setFormData(prev => prev ? { ...prev, signature: { mode: "typed", text: typedName.trim(), dataUrl: "", date: TODAY } } : prev);
    }
    setSigningMode(false);
  }, [signTab, typedName]);

  const handleDrawnSignature = useCallback((dataUrl: string) => {
    setFormData(prev => prev ? { ...prev, signature: { mode: "drawn", text: "", dataUrl, date: TODAY } } : prev);
    setSigningMode(false);
  }, []);

  // ── Pass handlers ──────────────────────────────────────────────────────────
  const providerUrl = pass
    ? `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/provider?code=${pass.code}`
    : "";

  const handleGenerate = () =>
    createCode.mutate({ data: { patientId: PATIENT_ID } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetActivePassQueryKey(PATIENT_ID) });
        refetchHistory();
      },
      onError: () => toast({ title: "Could not generate pass", variant: "destructive" }),
    });

  const handleRevoke = () => {
    if (!pass) return;
    revokeCode.mutate({ code: pass.code }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetActivePassQueryKey(PATIENT_ID) });
        toast({ title: "Pass revoked" });
      },
      onError: () => toast({ title: "Could not revoke pass", variant: "destructive" }),
    });
  };

  // ── Loading / error ────────────────────────────────────────────────────────
  if (isLoading || !formData) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex flex-col">
        <PatientHeader saveStatus="idle" onReset={() => {}} />
        <div className="flex-1 max-w-6xl mx-auto w-full p-6 space-y-4">
          <Skeleton className="h-40 w-full rounded-3xl" />
          <Skeleton className="h-52 w-full rounded-2xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex flex-col">
        <PatientHeader saveStatus="idle" onReset={() => {}} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-12">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="font-semibold text-slate-700">Failed to load patient data</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Derived values ─────────────────────────────────────────────────────────
  const age = calcAge(formData.dateOfBirth);
  const bmi = calcBMI(formData.vitals.heightFt, formData.vitals.heightIn, formData.vitals.weightLbs);
  const completeness = calcCompleteness(formData);
  const hasSevereAllergy = (formData.allergies as { severity: string }[]).some(a => a.severity === "Severe");
  const activeConditions = (formData.conditions as { status: string }[]).filter(c => c.status === "Active").length;
  const rosView = formData.reviewOfSystems as unknown as Record<string, Record<string, string>>;
  const presentSymptoms = Object.entries(rosView)
    .flatMap(([, body]) => Object.entries(body).filter(([, v]) => v === "Present").map(([sym]) => sym));
  const deniedCount = Object.entries(rosView)
    .flatMap(([, body]) => Object.values(body).filter(v => v === "Denied")).length;
  const consentCount = CONSENT_DEFS.filter(d => formData.consents[d.key]?.agreed).length;

  const handlers: Handlers = { handleChange, handleNested, handleArrayChange, handleAdd, handleRemove, handleROS, bmi };

  // ── Section cards ──────────────────────────────────────────────────────────
  const sectionCards = [
    {
      id: "registration", title: "Patient Registration", icon: ClipboardList,
      accentClass: "bg-sky-50 text-sky-600",
      count: formData.pronouns ? `${formData.preferredName || formData.firstName} · ${formData.pronouns}` : formData.preferredName || formData.firstName,
      preview: (
        <>
          <PreviewRow label="Preferred" value={formData.preferredName || formData.firstName} />
          <PreviewRow label="Race" value={formData.race || "Not specified"} />
          <PreviewRow label="SSN" value={formData.ssnLastFour ? `•••• ${formData.ssnLastFour}` : "Not set"} />
        </>
      ),
    },
    {
      id: "demographics", title: "Demographics", icon: User,
      accentClass: "bg-blue-50 text-blue-600",
      count: `${formData.firstName} ${formData.lastName}`,
      preview: (
        <>
          <PreviewRow value={`${age} y/o · ${formData.biologicalSex} · ${formData.bloodType || "No blood type"}`} />
          <PreviewRow value={formData.phone} />
          <PreviewRow value={formData.address} />
        </>
      ),
    },
    {
      id: "vitals", title: "Vitals", icon: Activity,
      accentClass: "bg-emerald-50 text-emerald-600",
      count: "Patient-reported",
      preview: (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {[
            { label: "Height", v: formData.vitals.heightFt ? `${formData.vitals.heightFt}'${formData.vitals.heightIn}"` : "—" },
            { label: "Weight", v: formData.vitals.weightLbs ? `${formData.vitals.weightLbs} lbs` : "—" },
            { label: "BMI", v: bmi },
            { label: "BP", v: formData.vitals.systolic ? `${formData.vitals.systolic}/${formData.vitals.diastolic}` : "—" },
          ].map(({ label, v }) => (
            <div key={label}>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
              <p className="text-sm font-semibold text-slate-800">{v}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "careTeam", title: "Care Team", icon: Building2,
      accentClass: "bg-indigo-50 text-indigo-600",
      count: formData.careTeam.visitSpecialty || "No specialty set",
      preview: (
        <>
          <PreviewRow label="PCP" value={formData.careTeam.pcp?.split("—")[0]?.trim() || "Not set"} />
          <PreviewRow label="Today" value={formData.careTeam.reasonForVisit || "No reason set"} />
        </>
      ),
    },
    {
      id: "pharmacy", title: "Pharmacy", icon: Pill,
      accentClass: "bg-lime-50 text-lime-700",
      count: formData.careTeam.preferredPharmacy || "Not set",
      preview: (
        <>
          <PreviewRow value={formData.careTeam.preferredPharmacy || "No pharmacy"} />
          <PreviewRow value={formData.careTeam.pharmacyAddress || "—"} />
          <PreviewRow value={formData.careTeam.pharmacyPhone || "—"} />
        </>
      ),
    },
    {
      id: "insurance", title: "Insurance", icon: Shield,
      accentClass: "bg-violet-50 text-violet-600",
      count: formData.insuranceSecondary ? "2 plans" : "1 plan",
      preview: (
        <>
          <PreviewRow label="Primary" value={formData.insurance.plan || "Not set"} />
          <PreviewRow label="ID" value={formData.insurance.memberId || "—"} />
          {formData.insuranceSecondary && <PreviewRow label="Secondary" value={formData.insuranceSecondary.plan} />}
        </>
      ),
    },
    {
      id: "responsibleParty", title: "Responsible Party", icon: Users,
      accentClass: "bg-pink-50 text-pink-600",
      count: formData.responsibleParty ? formData.responsibleParty.relationship : "Not set",
      preview: formData.responsibleParty ? (
        <>
          <PreviewRow value={formData.responsibleParty.name} />
          <PreviewRow label="Relation" value={formData.responsibleParty.relationship} />
          <PreviewRow label="Phone" value={formData.responsibleParty.phone} />
        </>
      ) : <p className="text-sm text-slate-300 italic">Not configured</p>,
    },
    {
      id: "emergencyContact", title: "Emergency Contact", icon: Phone,
      accentClass: "bg-rose-50 text-rose-500",
      count: formData.emergencyContact.name || "Not set",
      preview: (
        <>
          <PreviewRow label="Relation" value={formData.emergencyContact.relationship || "—"} />
          <PreviewRow label="Phone" value={formData.emergencyContact.phone || "—"} />
        </>
      ),
    },
    {
      id: "allergies", title: "Allergies", icon: AlertTriangle,
      accentClass: hasSevereAllergy ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-500",
      count: formData.allergies.length === 0 ? "None recorded" : `${formData.allergies.length} listed`,
      preview: formData.allergies.length === 0
        ? <p className="text-sm text-slate-300 italic">No allergies recorded</p>
        : (
          <>
            {(formData.allergies as { name: string; severity: string }[]).slice(0, 2).map((a, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="text-sm text-slate-700 truncate">{a.name}</span>
                <Badge variant={a.severity === "Severe" ? "destructive" : "secondary"} className="text-[10px] px-1.5 flex-shrink-0">{a.severity}</Badge>
              </div>
            ))}
            {formData.allergies.length > 2 && <p className="text-xs text-slate-400">+{formData.allergies.length - 2} more</p>}
          </>
        ),
    },
    {
      id: "medications", title: "Medications", icon: Pill,
      accentClass: "bg-teal-50 text-teal-600",
      count: formData.medications.length === 0 ? "None" : `${formData.medications.length} active`,
      preview: formData.medications.length === 0
        ? <p className="text-sm text-slate-300 italic">No medications</p>
        : (
          <>
            {(formData.medications as { name: string; dose: string }[]).slice(0, 3).map((m, i) => (
              <div key={i} className="text-sm leading-snug">
                <span className="text-slate-800 font-medium">{m.name}</span>{" "}
                <span className="text-slate-400">{m.dose}</span>
              </div>
            ))}
            {formData.medications.length > 3 && <p className="text-xs text-slate-400">+{formData.medications.length - 3} more</p>}
          </>
        ),
    },
    {
      id: "conditions", title: "Conditions", icon: HeartPulse,
      accentClass: "bg-purple-50 text-purple-600",
      count: `${activeConditions} active`,
      preview: formData.conditions.length === 0
        ? <p className="text-sm text-slate-300 italic">None reported</p>
        : (
          <>
            {(formData.conditions as { name: string; status: string }[]).slice(0, 3).map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.status === "Active" ? "bg-purple-500" : "bg-slate-300"}`} />
                <span className="text-slate-700 truncate">{c.name}</span>
              </div>
            ))}
            {formData.conditions.length > 3 && <p className="text-xs text-slate-400">+{formData.conditions.length - 3} more</p>}
          </>
        ),
    },
    {
      id: "surgeries", title: "Surgeries & Procedures", icon: FileText,
      accentClass: "bg-slate-100 text-slate-500",
      count: formData.surgeries.length === 0 ? "None" : `${formData.surgeries.length} recorded`,
      preview: formData.surgeries.length === 0
        ? <p className="text-sm text-slate-300 italic">None reported</p>
        : (
          <>
            {(formData.surgeries as { procedure: string; date: string | null }[]).slice(0, 2).map((s, i) => (
              <div key={i} className="text-sm leading-snug">
                <p className="text-slate-700 truncate">{s.procedure}</p>
                {s.date && <p className="text-xs text-slate-400">{s.date}</p>}
              </div>
            ))}
          </>
        ),
    },
    {
      id: "hospitalizations", title: "Hospitalizations", icon: Building2,
      accentClass: "bg-red-50 text-red-500",
      count: formData.hospitalizations.length === 0 ? "None recorded" : `${formData.hospitalizations.length} admission${formData.hospitalizations.length !== 1 ? "s" : ""}`,
      preview: formData.hospitalizations.length === 0
        ? <p className="text-sm text-slate-300 italic">None recorded</p>
        : (
          <>
            {(formData.hospitalizations as { reason: string; date: string; facility: string }[]).slice(0, 2).map((h, i) => (
              <div key={i} className="text-sm leading-snug">
                <p className="text-slate-700 truncate">{h.reason}</p>
                <p className="text-xs text-slate-400">{h.date}</p>
              </div>
            ))}
            {formData.hospitalizations.length > 2 && <p className="text-xs text-slate-400">+{formData.hospitalizations.length - 2} more</p>}
          </>
        ),
    },
    {
      id: "immunizations", title: "Immunizations", icon: Syringe,
      accentClass: "bg-green-50 text-green-600",
      count: formData.immunizations.length === 0 ? "None recorded" : `${formData.immunizations.length} on record`,
      preview: formData.immunizations.length === 0
        ? <p className="text-sm text-slate-300 italic">None recorded</p>
        : (
          <>
            {(formData.immunizations as { vaccine: string; date: string }[]).slice(0, 2).map((v, i) => (
              <div key={i} className="text-sm leading-snug">
                <p className="text-slate-700 truncate">{v.vaccine}</p>
                <p className="text-xs text-slate-400">{v.date}</p>
              </div>
            ))}
            {formData.immunizations.length > 2 && <p className="text-xs text-slate-400">+{formData.immunizations.length - 2} more</p>}
          </>
        ),
    },
    {
      id: "familyHistory", title: "Family History", icon: Users,
      accentClass: "bg-cyan-50 text-cyan-600",
      count: formData.familyHistory.length === 0 ? "None recorded" : `${formData.familyHistory.length} entries`,
      preview: formData.familyHistory.length === 0
        ? <p className="text-sm text-slate-300 italic">None recorded</p>
        : (
          <>
            {(formData.familyHistory as { relation: string; condition: string }[]).slice(0, 2).map((f, i) => (
              <div key={i} className="text-sm">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{f.relation}</span>
                <p className="text-slate-700 truncate">{f.condition}</p>
              </div>
            ))}
            {formData.familyHistory.length > 2 && <p className="text-xs text-slate-400">+{formData.familyHistory.length - 2} more</p>}
          </>
        ),
    },
    {
      id: "socialHistory", title: "Social History", icon: Briefcase,
      accentClass: "bg-orange-50 text-orange-500",
      count: "Lifestyle",
      preview: (
        <>
          <PreviewRow label="Smoking" value={formData.socialHistory.smoking || "—"} />
          <PreviewRow label="Employer" value={formData.socialHistory.employer || "—"} />
        </>
      ),
    },
    {
      id: "reviewOfSystems", title: "Review of Systems", icon: ClipboardList,
      accentClass: "bg-yellow-50 text-yellow-600",
      count: `${presentSymptoms.length} present · ${deniedCount} denied`,
      preview: presentSymptoms.length > 0 ? (
        <>
          {presentSymptoms.slice(0, 3).map((sym, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
              <span className="text-slate-700">{sym}</span>
            </div>
          ))}
          {presentSymptoms.length > 3 && <p className="text-xs text-slate-400">+{presentSymptoms.length - 3} more reported</p>}
        </>
      ) : <p className="text-sm text-slate-300 italic">All systems reviewed & denied</p>,
    },
    ...(formData.biologicalSex === "Female" ? [{
      id: "obgynHistory", title: "OB/GYN History", icon: HeartPulse,
      accentClass: "bg-pink-50 text-pink-600",
      count: formData.obgynHistory
        ? `G${formData.obgynHistory.pregnancies} P${formData.obgynHistory.deliveries}`
        : "Not set",
      preview: formData.obgynHistory ? (
        <>
          <PreviewRow label="LMP" value={(formData.obgynHistory as ObgynHistory).lmp || "—"} />
          <PreviewRow label="Pregnancies" value={(formData.obgynHistory as ObgynHistory).pregnancies} />
          <PreviewRow label="Live births" value={(formData.obgynHistory as ObgynHistory).liveBirths} />
        </>
      ) : <p className="text-sm text-slate-300 italic">Not recorded</p>,
    }] : []),
  ];

  const sectionTitles: Record<string, string> = {
    registration: "Patient Registration", demographics: "Demographics",
    vitals: "Vitals", careTeam: "Care Team & Visit", pharmacy: "Preferred Pharmacy",
    insurance: "Insurance & Billing", responsibleParty: "Responsible Party / Guarantor",
    emergencyContact: "Emergency Contact", allergies: "Allergies",
    medications: "Medications", conditions: "Medical Conditions",
    surgeries: "Surgeries & Procedures", hospitalizations: "Hospitalizations",
    immunizations: "Immunizations", familyHistory: "Family History",
    socialHistory: "Social History", reviewOfSystems: "Review of Systems",
    obgynHistory: "OB/GYN History",
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col">
      <PatientHeader saveStatus={saveStatus} onReset={handleReset} />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-8 pb-16">

        {/* Hero */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-3xl p-7 md:p-9 mt-6 text-white shadow-xl shadow-blue-500/20">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-blue-200 text-sm font-medium mb-1 tracking-wide">Your Health Profile</p>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-none">
                {formData.firstName} {formData.lastName}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <Chip>{age} y/o · {formData.biologicalSex}</Chip>
                {formData.bloodType && <Chip>{formData.bloodType}</Chip>}
                {formData.careTeam.visitSpecialty && <Chip>{formData.careTeam.visitSpecialty}</Chip>}
                {formData.maritalStatus && <Chip>{formData.maritalStatus}</Chip>}
                {hasSevereAllergy && (
                  <span className="inline-flex items-center gap-1.5 bg-red-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    <AlertTriangle className="w-3 h-3" />Severe Allergy
                  </span>
                )}
              </div>
              <p className="text-blue-200/80 text-sm mt-4 max-w-md leading-relaxed line-clamp-2">
                {formData.careTeam.reasonForVisit || "No visit reason set"}
              </p>
            </div>
            <CompletenessRing pct={completeness} />
          </div>
        </div>

        {/* Pass Panel */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mt-5 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-800">Your CarePass</h2>
            </div>
            {(history?.entries?.length ?? 0) > 0 && (
              <button onClick={() => setShowHistory(h => !h)} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors">
                <History className="w-3.5 h-3.5" />
                {history?.entries.length} view{(history?.entries.length ?? 0) !== 1 ? "s" : ""}
              </button>
            )}
          </div>

          {passLoading || createCode.isPending || revokeCode.isPending ? (
            <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">{createCode.isPending ? "Generating pass…" : revokeCode.isPending ? "Revoking…" : "Loading…"}</span>
            </div>
          ) : pass ? (
            <div className="flex flex-col md:flex-row gap-8 items-center p-6">
              <div className="flex-shrink-0 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <QRCodeSVG value={providerUrl} size={156} level="H" />
              </div>
              <div className="flex-1 flex flex-col gap-5 text-center md:text-left w-full">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Access Code</p>
                  <div className="text-5xl font-mono font-bold tracking-[0.15em] text-slate-900 select-all">
                    {pass.code.slice(0, 3)}-{pass.code.slice(3)}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 justify-center md:justify-start">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-sm text-amber-600 font-medium">
                      {timeLeft === "Expired" ? "Expired" : `Expires in ${timeLeft}`}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2.5 justify-center md:justify-start">
                  <Button onClick={() => window.open(providerUrl, "_blank")} className="gap-2 shadow-sm shadow-blue-200">
                    <ExternalLink className="w-4 h-4" />Open Provider View
                  </Button>
                  <Button variant="outline" onClick={() => { navigator.clipboard.writeText(providerUrl); toast({ title: "Link copied" }); }} className="gap-2">
                    <Copy className="w-4 h-4" />Copy Link
                  </Button>
                  <Button variant="outline" onClick={handleRevoke} className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5">
                    <ShieldOff className="w-4 h-4" />Revoke
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
                <QrCode className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">No active pass</p>
                <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                  Generate a one-time access pass to share your intake with your provider. Valid for 4 hours.
                </p>
              </div>
              <Button onClick={handleGenerate} className="gap-2 shadow-sm shadow-blue-200">
                <QrCode className="w-4 h-4" />Generate Pass
              </Button>
            </div>
          )}

          {showHistory && (history?.entries?.length ?? 0) > 0 && (
            <div className="border-t border-slate-50">
              {history!.entries.map(e => (
                <div key={e.id} className="flex items-center justify-between px-6 py-2.5 text-xs text-slate-500 hover:bg-slate-50/50 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[10px] px-1.5">{e.code.slice(0, 3)}-{e.code.slice(3)}</Badge>
                    <span>Viewed by a provider</span>
                  </div>
                  <span className="text-slate-400">{new Date(e.viewedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          {[
            { icon: Pill, label: "Medications", value: formData.medications.length, color: "text-teal-600 bg-teal-50" },
            { icon: AlertTriangle, label: "Allergies", value: formData.allergies.length, color: "text-amber-500 bg-amber-50" },
            { icon: HeartPulse, label: "Conditions", value: formData.conditions.length, color: "text-purple-600 bg-purple-50" },
            { icon: FileText, label: "Procedures", value: formData.surgeries.length + formData.hospitalizations.length, color: "text-slate-500 bg-slate-100" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-4 h-4" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800 leading-none">{value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Section Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
          {sectionCards.map(s => (
            <SectionCard
              key={s.id} icon={s.icon} title={s.title} count={s.count}
              accentClass={s.accentClass} preview={s.preview}
              onEdit={() => setEditingSection(s.id)}
            />
          ))}
        </div>

        {/* ── Consents & Acknowledgments ──────────────────────────────────── */}
        <div className="mt-6 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-800">Consents &amp; Acknowledgments</h2>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${consentCount === 5 ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>
              {consentCount}/5 signed
            </span>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {CONSENT_DEFS.map(({ key, title, summary }) => {
              const item = formData.consents[key] as ConsentItem;
              return (
                <div key={key} className={`rounded-xl border p-4 flex flex-col gap-3 transition-colors ${item?.agreed ? "border-green-100 bg-green-50/30" : "border-slate-100 bg-white"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-800 leading-tight">{title}</p>
                    <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center ${item?.agreed ? "bg-green-100" : "bg-slate-100"}`}>
                      {item?.agreed
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        : <div className="w-2 h-2 rounded-full bg-slate-300" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed flex-1">{summary}</p>
                  <div className="space-y-2 mt-auto">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item?.agreed ?? false}
                        onChange={e => handleConsent(key, "agreed", e.target.checked)}
                        className="w-4 h-4 rounded accent-blue-600"
                      />
                      <span className="text-xs font-medium text-slate-600">I agree</span>
                    </label>
                    {item?.agreed && (
                      <>
                        <Input
                          value={item.date}
                          onChange={e => handleConsent(key, "date", e.target.value)}
                          className="text-xs h-7 border-slate-100 bg-white/60"
                          placeholder="Date"
                          type="date"
                        />
                        <Input
                          value={item.signature}
                          onChange={e => handleConsent(key, "signature", e.target.value)}
                          className="text-xs h-7 border-slate-100 bg-white/60"
                          style={{ fontFamily: "'Dancing Script', cursive" }}
                          placeholder="Signature"
                        />
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Signature Block ─────────────────────────────────────────────── */}
        <div className="mt-4 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pen className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-800">Patient Signature</h2>
            </div>
            {formData.signature?.text || formData.signature?.dataUrl ? (
              <Button variant="ghost" size="sm" onClick={() => { setSignTab("typed"); setSigningMode(true); }} className="text-xs text-slate-400 gap-1.5">
                <RotateCcw className="w-3 h-3" />Clear &amp; Re-sign
              </Button>
            ) : null}
          </div>

          {formData.signature?.text || formData.signature?.dataUrl ? (
            <div className="px-8 py-6 flex flex-col sm:flex-row items-start sm:items-end gap-6">
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Signature</p>
                {formData.signature.mode === "drawn" && formData.signature.dataUrl ? (
                  <img src={formData.signature.dataUrl} alt="Patient signature" className="max-h-16 border-b-2 border-slate-200 pb-1" />
                ) : (
                  <p style={{ fontFamily: "'Dancing Script', cursive", fontSize: "2.4rem", color: "#1e3a5f", lineHeight: 1.2 }}>
                    {formData.signature.text}
                  </p>
                )}
                <div className="mt-2 border-t border-slate-200 pt-1" />
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Date</p>
                <p className="text-sm font-semibold text-slate-800">{formData.signature.date}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Pen className="w-8 h-8 text-blue-300" />
              </div>
              <div>
                <p className="font-semibold text-slate-700">Sign your intake form</p>
                <p className="text-sm text-slate-400 mt-1">Required to complete your patient registration</p>
              </div>
              <Button onClick={() => setSigningMode(true)} className="gap-2">
                <Pen className="w-4 h-4" />Sign Now
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* ── Edit Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={!!editingSection} onOpenChange={open => { if (!open) setEditingSection(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">{editingSection ? (sectionTitles[editingSection] ?? editingSection) : ""}</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            {editingSection && renderEditForm(editingSection, formData, handlers)}
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              {saveStatus === "saving" && <><Loader2 className="w-3 h-3 animate-spin" />Saving…</>}
              {saveStatus === "saved" && <><CheckCircle2 className="w-3 h-3 text-green-500" />Saved</>}
              {saveStatus === "idle" && "Changes save automatically"}
            </span>
            <Button onClick={() => setEditingSection(null)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Signing Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={signingMode} onOpenChange={open => { if (!open) setSigningMode(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sign Your Intake Form</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="flex rounded-lg border border-slate-100 overflow-hidden">
              {(["typed", "drawn"] as const).map(tab => (
                <button key={tab} type="button"
                  className={`flex-1 py-2 text-sm font-medium transition-colors capitalize ${signTab === tab ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}
                  onClick={() => setSignTab(tab)}
                >
                  {tab === "typed" ? "Type Name" : "Draw Signature"}
                </button>
              ))}
            </div>

            {signTab === "typed" ? (
              <div className="space-y-3">
                <Input
                  value={typedName}
                  onChange={e => setTypedName(e.target.value)}
                  placeholder="Type your full legal name"
                  className="text-base"
                  autoFocus
                />
                <div className="border-2 border-dashed border-slate-100 rounded-xl p-5 bg-slate-50 min-h-[88px] flex items-center justify-center">
                  {typedName ? (
                    <p style={{ fontFamily: "'Dancing Script', cursive", fontSize: "2.2rem", color: "#1e3a5f", lineHeight: 1.2 }}>
                      {typedName}
                    </p>
                  ) : (
                    <p className="text-slate-300 text-sm italic">Your signature will appear here</p>
                  )}
                </div>
                <Button className="w-full gap-2" disabled={!typedName.trim()} onClick={handleApplySignature}>
                  <Pen className="w-4 h-4" />Apply Signature
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">Draw your signature in the box below using your mouse or finger.</p>
                <SignaturePad onSave={handleDrawnSignature} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────────
function PatientHeader({ saveStatus, onReset }: { saveStatus: "idle" | "saving" | "saved"; onReset: () => void }) {
  return (
    <header className="border-b bg-white border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <Link href="/" className="font-bold text-xl tracking-tight text-primary hover:opacity-80 transition-opacity">
          CarePass AI
        </Link>
        <span className="hidden sm:block text-xs font-medium bg-blue-50 text-blue-600 px-2 py-1 rounded-full">Your Intake</span>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onReset} className="text-xs text-slate-400 gap-1.5 hidden sm:flex hover:text-slate-600">
          <RotateCcw className="w-3 h-3" />Reset Demo
        </Button>
        <div className="text-xs text-slate-400 hidden sm:flex items-center gap-1.5 min-w-[60px] justify-end">
          {saveStatus === "saving" && <><Loader2 className="w-3 h-3 animate-spin" />Saving</>}
          {saveStatus === "saved" && <><CheckCircle2 className="w-3 h-3 text-green-500" />Saved</>}
        </div>
        <Link href="/" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">← Home</Link>
      </div>
    </header>
  );
}
