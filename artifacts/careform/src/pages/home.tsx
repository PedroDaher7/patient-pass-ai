import { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { QRCodeSVG } from "qrcode.react";
import {
  useGetPatient, useUpdatePatient, useCreateCode, useRevokeCode,
  useGetActivePass, useGetAccessHistory,
  getGetActivePassQueryKey, getGetAccessHistoryQueryKey,
} from "@workspace/api-client-react";
import type { PatientInput } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/lib/use-debounce";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, Loader2, AlertCircle, AlertTriangle,
  QrCode, ShieldOff, Clock, ExternalLink, Copy,
  User, Activity, Building2, Shield, Phone,
  Pill, HeartPulse, FileText, Syringe, Users,
  Briefcase, Plus, Trash2, Pencil, History, X,
} from "lucide-react";

const PATIENT_ID = "demo";

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

function CompletenessRing({ pct }: { pct: number }) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative w-[68px] h-[68px] flex-shrink-0">
      <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="5" />
        <circle
          cx="32" cy="32" r={r} fill="none"
          stroke="white" strokeWidth="5"
          strokeDasharray={circ}
          strokeDashoffset={circ - (pct / 100) * circ}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-white font-bold text-sm leading-none">{pct}%</span>
        <span className="text-white/60 text-[8px] leading-none mt-0.5">complete</span>
      </div>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  count,
  accentClass,
  preview,
  onEdit,
}: {
  icon: React.ElementType;
  title: string;
  count: string;
  accentClass: string;
  preview: React.ReactNode;
  onEdit: () => void;
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
        <button
          onClick={onEdit}
          className="flex items-center gap-1 text-xs font-medium text-blue-600 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
        >
          <Pencil className="w-3 h-3" />Edit
        </button>
      </div>
      <div className="px-5 pb-5 flex-1 space-y-1.5 min-h-[72px]">
        {preview}
      </div>
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
  const initializedForId = useRef<string | null>(null);
  const lastSaved = useRef<string | null>(null);

  useEffect(() => {
    if (patient && initializedForId.current !== patient.id) {
      const init: PatientInput = {
        firstName: patient.firstName, lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth, biologicalSex: patient.biologicalSex,
        genderIdentity: patient.genderIdentity, preferredLanguage: patient.preferredLanguage,
        maritalStatus: patient.maritalStatus, bloodType: patient.bloodType,
        phone: patient.phone, email: patient.email, address: patient.address,
        careTeam: { ...patient.careTeam },
        insurance: { ...patient.insurance },
        insuranceSecondary: patient.insuranceSecondary ? { ...patient.insuranceSecondary } : null,
        emergencyContact: { ...patient.emergencyContact },
        allergies: patient.allergies.map(a => ({ ...a })),
        medications: patient.medications.map(m => ({ ...m })),
        conditions: patient.conditions.map(c => ({ ...c })),
        surgeries: patient.surgeries.map(s => ({ ...s })),
        immunizations: patient.immunizations.map(i => ({ ...i })),
        familyHistory: patient.familyHistory.map(f => ({ ...f })),
        socialHistory: { ...patient.socialHistory },
        vitals: { ...patient.vitals },
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

  const handleChange = (field: keyof PatientInput, value: unknown) =>
    setFormData(prev => prev ? { ...prev, [field]: value } : prev);

  const handleNested = (parent: string, field: string, value: string) =>
    setFormData(prev => {
      if (!prev) return prev;
      const map = prev as unknown as Record<string, unknown>;
      const cur = (map[parent] ?? {}) as Record<string, unknown>;
      return { ...prev, [parent]: { ...cur, [field]: value } } as PatientInput;
    });

  const handleArrayChange = (arr: string, idx: number, field: string, value: unknown) =>
    setFormData(prev => {
      if (!prev) return prev;
      const map = prev as unknown as Record<string, unknown>;
      const list = [...(map[arr] as unknown[])] as Record<string, unknown>[];
      list[idx] = { ...list[idx], [field]: value };
      return { ...prev, [arr]: list } as PatientInput;
    });

  const handleAdd = (arr: string, item: unknown) =>
    setFormData(prev => {
      if (!prev) return prev;
      const map = prev as unknown as Record<string, unknown>;
      return { ...prev, [arr]: [...((map[arr] as unknown[]) ?? []), item] } as PatientInput;
    });

  const handleRemove = (arr: string, idx: number) =>
    setFormData(prev => {
      if (!prev) return prev;
      const map = prev as unknown as Record<string, unknown>;
      const list = [...(map[arr] as unknown[])];
      list.splice(idx, 1);
      return { ...prev, [arr]: list } as PatientInput;
    });

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

  if (isLoading || !formData) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex flex-col">
        <PatientHeader saveStatus="idle" />
        <div className="flex-1 max-w-6xl mx-auto w-full p-6 space-y-4">
          <Skeleton className="h-40 w-full rounded-3xl" />
          <Skeleton className="h-52 w-full rounded-2xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex flex-col">
        <PatientHeader saveStatus="idle" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-12">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="font-semibold text-slate-700">Failed to load patient data</p>
          </div>
        </div>
      </div>
    );
  }

  const age = calcAge(formData.dateOfBirth);
  const bmi = calcBMI(formData.vitals.heightFt, formData.vitals.heightIn, formData.vitals.weightLbs);
  const completeness = calcCompleteness(formData);
  const hasSevereAllergy = (formData.allergies as { severity: string }[]).some(a => a.severity === "Severe");
  const activeConditions = (formData.conditions as { status: string }[]).filter(c => c.status === "Active").length;

  const sectionCards = [
    {
      id: "demographics", title: "Demographics", icon: User,
      accentClass: "bg-blue-50 text-blue-600",
      count: `${formData.firstName} ${formData.lastName}`,
      preview: (
        <>
          <PreviewRow value={`${age} y/o · ${formData.biologicalSex} · ${formData.bloodType || "Blood type not set"}`} />
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
      id: "surgeries", title: "Surgeries", icon: FileText,
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
          <PreviewRow label="Work" value={formData.socialHistory.occupation || "—"} />
        </>
      ),
    },
  ];

  const sectionTitles: Record<string, string> = {
    demographics: "Demographics", vitals: "Vitals",
    careTeam: "Care Team & Visit", insurance: "Insurance",
    emergencyContact: "Emergency Contact", allergies: "Allergies",
    medications: "Medications", conditions: "Medical Conditions",
    surgeries: "Surgeries & Procedures", immunizations: "Immunizations",
    familyHistory: "Family History", socialHistory: "Social History",
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col">
      <PatientHeader saveStatus={saveStatus} />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-8 pb-12">
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
              <h2 className="text-sm font-semibold text-slate-800">Your CareForm Pass</h2>
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
                  <Button
                    onClick={() => window.open(providerUrl, "_blank")}
                    className="gap-2 shadow-sm shadow-blue-200"
                  >
                    <ExternalLink className="w-4 h-4" />Open Provider View
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { navigator.clipboard.writeText(providerUrl); toast({ title: "Link copied" }); }}
                    className="gap-2"
                  >
                    <Copy className="w-4 h-4" />Copy Link
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRevoke}
                    className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5"
                  >
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
            { icon: FileText, label: "Procedures", value: formData.surgeries.length, color: "text-slate-500 bg-slate-100" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-4.5 h-4.5" strokeWidth={1.75} />
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
              key={s.id}
              icon={s.icon}
              title={s.title}
              count={s.count}
              accentClass={s.accentClass}
              preview={s.preview}
              onEdit={() => setEditingSection(s.id)}
            />
          ))}
        </div>
      </main>

      {/* Edit Dialog */}
      <Dialog open={!!editingSection} onOpenChange={open => { if (!open) setEditingSection(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">{editingSection ? sectionTitles[editingSection] : ""}</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            {editingSection && renderEditForm(editingSection, formData, { handleChange, handleNested, handleArrayChange, handleAdd, handleRemove, bmi })}
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
    </div>
  );
}

function PatientHeader({ saveStatus }: { saveStatus: "idle" | "saving" | "saved" }) {
  return (
    <header className="border-b bg-white border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <Link href="/" className="font-bold text-xl tracking-tight text-primary hover:opacity-80 transition-opacity">
          CareForm AI
        </Link>
        <span className="hidden sm:block text-xs font-medium bg-blue-50 text-blue-600 px-2 py-1 rounded-full">Your Intake</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-xs text-slate-400 hidden sm:flex items-center gap-1.5 min-w-[80px] justify-end">
          {saveStatus === "saving" && <><Loader2 className="w-3 h-3 animate-spin" />Saving</>}
          {saveStatus === "saved" && <><CheckCircle2 className="w-3 h-3 text-green-500" />Saved</>}
        </div>
        <Link href="/" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">← Home</Link>
      </div>
    </header>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center bg-white/15 text-white text-xs font-medium px-3 py-1 rounded-full border border-white/20 backdrop-blur-sm">
      {children}
    </span>
  );
}

type Handlers = {
  handleChange: (field: keyof PatientInput, value: unknown) => void;
  handleNested: (parent: string, field: string, value: string) => void;
  handleArrayChange: (arr: string, idx: number, field: string, value: unknown) => void;
  handleAdd: (arr: string, item: unknown) => void;
  handleRemove: (arr: string, idx: number) => void;
  bmi: string;
};

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</Label>
      {children}
    </div>
  );
}

function renderEditForm(section: string, data: PatientInput, h: Handlers): React.ReactNode {
  switch (section) {
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
          <Fld label="Gender Identity"><Input value={data.genderIdentity} onChange={e => h.handleChange("genderIdentity", e.target.value)} placeholder="e.g. Woman, Man, Non-binary" /></Fld>
          <Fld label="Preferred Language"><Input value={data.preferredLanguage} onChange={e => h.handleChange("preferredLanguage", e.target.value)} /></Fld>
          <Fld label="Marital Status">
            <Select value={data.maritalStatus} onValueChange={v => h.handleChange("maritalStatus", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {["Single","Married","Divorced","Widowed","Domestic Partnership"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
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
            <Fld label="Systolic BP (mmHg)"><Input type="number" value={data.vitals.systolic} onChange={e => h.handleNested("vitals","systolic",e.target.value)} /></Fld>
            <Fld label="Diastolic BP (mmHg)"><Input type="number" value={data.vitals.diastolic} onChange={e => h.handleNested("vitals","diastolic",e.target.value)} /></Fld>
          </div>
        </div>
      );

    case "careTeam":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Fld label="Primary Care Provider"><Input value={data.careTeam.pcp} onChange={e => h.handleNested("careTeam","pcp",e.target.value)} /></Fld>
          <Fld label="Referring Physician"><Input value={data.careTeam.referringPhysician} onChange={e => h.handleNested("careTeam","referringPhysician",e.target.value)} /></Fld>
          <Fld label="Visit Specialty"><Input value={data.careTeam.visitSpecialty} onChange={e => h.handleNested("careTeam","visitSpecialty",e.target.value)} /></Fld>
          <Fld label="Preferred Pharmacy"><Input value={data.careTeam.preferredPharmacy} onChange={e => h.handleNested("careTeam","preferredPharmacy",e.target.value)} /></Fld>
          <Fld label="Pharmacy Phone"><Input value={data.careTeam.pharmacyPhone} onChange={e => h.handleNested("careTeam","pharmacyPhone",e.target.value)} /></Fld>
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
              <Fld label="Policyholder"><Input value={data.insurance.policyholder} onChange={e => h.handleNested("insurance","policyholder",e.target.value)} /></Fld>
              <Fld label="Provider Phone"><Input value={data.insurance.phone} onChange={e => h.handleNested("insurance","phone",e.target.value)} /></Fld>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Secondary Insurance</p>
              {data.insuranceSecondary === null
                ? <Button variant="outline" size="sm" onClick={() => h.handleChange("insuranceSecondary", { plan:"",memberId:"",group:"",policyholder:"",phone:"" })}><Plus className="w-3 h-3 mr-1" />Add</Button>
                : <Button variant="ghost" size="sm" className="text-destructive" onClick={() => h.handleChange("insuranceSecondary", null)}><Trash2 className="w-3 h-3 mr-1" />Remove</Button>
              }
            </div>
            {data.insuranceSecondary && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Fld label="Plan Name"><Input value={data.insuranceSecondary.plan} onChange={e => h.handleNested("insuranceSecondary","plan",e.target.value)} /></Fld>
                <Fld label="Member ID"><Input value={data.insuranceSecondary.memberId} onChange={e => h.handleNested("insuranceSecondary","memberId",e.target.value)} /></Fld>
                <Fld label="Group Number"><Input value={data.insuranceSecondary.group} onChange={e => h.handleNested("insuranceSecondary","group",e.target.value)} /></Fld>
                <Fld label="Policyholder"><Input value={data.insuranceSecondary.policyholder} onChange={e => h.handleNested("insuranceSecondary","policyholder",e.target.value)} /></Fld>
                <Fld label="Provider Phone"><Input value={data.insuranceSecondary.phone} onChange={e => h.handleNested("insuranceSecondary","phone",e.target.value)} /></Fld>
              </div>
            )}
          </div>
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
          addLabel="Add Allergy"
          emptyLabel="No allergies recorded"
          renderItem={(a, i) => (
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-4"><Fld label="Substance"><Input value={a.name} onChange={e => h.handleArrayChange("allergies",i,"name",e.target.value)} placeholder="e.g. Penicillin" /></Fld></div>
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
          addLabel="Add Medication"
          emptyLabel="No medications recorded"
          renderItem={(m, i) => (
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-4"><Fld label="Name"><Input value={m.name} onChange={e => h.handleArrayChange("medications",i,"name",e.target.value)} /></Fld></div>
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
          addLabel="Add Condition"
          emptyLabel="No conditions recorded"
          renderItem={(c, i) => (
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-5"><Fld label="Condition"><Input value={c.name} onChange={e => h.handleArrayChange("conditions",i,"name",e.target.value)} /></Fld></div>
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
          addLabel="Add Procedure"
          emptyLabel="No procedures recorded"
          renderItem={(s, i) => (
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-5"><Fld label="Procedure"><Input value={s.procedure} onChange={e => h.handleArrayChange("surgeries",i,"procedure",e.target.value)} /></Fld></div>
              <div className="col-span-3"><Fld label="Date"><Input type="date" value={s.date || ""} onChange={e => h.handleArrayChange("surgeries",i,"date",e.target.value)} /></Fld></div>
              <div className="col-span-4"><Fld label="Facility"><Input value={s.facility || ""} onChange={e => h.handleArrayChange("surgeries",i,"facility",e.target.value)} /></Fld></div>
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
          addLabel="Add Vaccine"
          emptyLabel="No immunizations recorded"
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
          addLabel="Add Entry"
          emptyLabel="No family history recorded"
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
          <Fld label="Smoking / Tobacco"><Input value={data.socialHistory.smoking} onChange={e => h.handleNested("socialHistory","smoking",e.target.value)} placeholder="e.g. Former smoker, quit 2010" /></Fld>
          <Fld label="Alcohol Use"><Input value={data.socialHistory.alcohol} onChange={e => h.handleNested("socialHistory","alcohol",e.target.value)} placeholder="e.g. Social, 1–2 drinks/week" /></Fld>
          <Fld label="Occupation"><Input value={data.socialHistory.occupation} onChange={e => h.handleNested("socialHistory","occupation",e.target.value)} /></Fld>
          <Fld label="Exercise Frequency"><Input value={data.socialHistory.exercise} onChange={e => h.handleNested("socialHistory","exercise",e.target.value)} placeholder="e.g. 3× /week, 30-min walks" /></Fld>
        </div>
      );

    default: return null;
  }
}

function ListEditor({
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
          <button
            onClick={() => onRemove(i)}
            className="absolute top-3 right-3 text-slate-300 hover:text-red-400 transition-colors"
          >
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
