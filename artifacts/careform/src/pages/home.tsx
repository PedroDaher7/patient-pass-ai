import { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetPatient,
  useUpdatePatient,
  useCreateCode,
  useRevokeCode,
  useGetActivePass,
  useGetAccessHistory,
  getGetActivePassQueryKey,
  getGetAccessHistoryQueryKey,
} from "@workspace/api-client-react";
import type { PatientInput } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { QRCodeSVG } from "qrcode.react";
import { useDebounce } from "@/lib/use-debounce";
import {
  Plus, Trash2, CheckCircle2, Loader2, AlertCircle,
  QrCode, ShieldOff, Clock, History,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

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

function PassCard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: pass, isLoading: passLoading } = useGetActivePass(PATIENT_ID, {
    query: { queryKey: getGetActivePassQueryKey(PATIENT_ID), retry: false, refetchOnWindowFocus: false },
  });
  const { data: history, isLoading: historyLoading, refetch: refetchHistory } = useGetAccessHistory(PATIENT_ID, {
    query: { queryKey: getGetAccessHistoryQueryKey(PATIENT_ID), retry: false, refetchInterval: 8000 },
  });
  const createCode = useCreateCode();
  const revokeCode = useRevokeCode();
  const timeLeft = useCountdown(pass?.expiresAt);
  const providerUrl = pass
    ? `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/provider?code=${pass.code}`
    : "";

  const handleGenerate = () => {
    createCode.mutate({ data: { patientId: PATIENT_ID } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetActivePassQueryKey(PATIENT_ID) }); refetchHistory(); },
      onError: () => toast({ title: "Could not generate pass", variant: "destructive" }),
    });
  };
  const handleRevoke = () => {
    if (!pass) return;
    revokeCode.mutate({ code: pass.code }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetActivePassQueryKey(PATIENT_ID) }); toast({ title: "Pass revoked" }); },
      onError: () => toast({ title: "Could not revoke pass", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-4">
      <Card className="border-blue-100 overflow-hidden shadow-sm">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b border-blue-100 py-4 px-6 flex flex-row items-center gap-2">
          <QrCode className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg font-semibold text-slate-800">Provider Pass</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {passLoading || createCode.isPending || revokeCode.isPending ? (
            <div className="flex items-center justify-center py-10 gap-3 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">{createCode.isPending ? "Generating…" : revokeCode.isPending ? "Revoking…" : "Loading…"}</span>
            </div>
          ) : pass ? (
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
              <div className="flex-shrink-0 flex flex-col items-center">
                <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <QRCodeSVG value={providerUrl} size={164} level="H" />
                </div>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mt-3">Scan to open</p>
              </div>
              <div className="flex-1 flex flex-col gap-4 text-center md:text-left">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Access Code</p>
                  <div className="text-5xl font-mono font-bold tracking-widest text-primary select-all">
                    {pass.code.slice(0, 3)}-{pass.code.slice(3)}
                  </div>
                </div>
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-600">{timeLeft === "Expired" ? "Expired" : `Expires in ${timeLeft}`}</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 font-mono text-xs text-slate-500 break-all">{providerUrl}</div>
                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(providerUrl); toast({ title: "Link copied" }); }}>Copy Link</Button>
                  <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/5" onClick={handleRevoke}>
                    <ShieldOff className="w-4 h-4 mr-1.5" />Revoke Pass
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
              <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
                <QrCode className="w-7 h-7 text-primary/60" />
              </div>
              <div>
                <p className="font-medium text-slate-700">No active pass</p>
                <p className="text-sm text-slate-500 mt-1">Generate a pass to share your intake with a provider. Expires in 4 hours.</p>
              </div>
              <Button onClick={handleGenerate} className="gap-2"><QrCode className="w-4 h-4" />Generate Pass</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6 flex flex-row items-center gap-2">
          <History className="w-5 h-5 text-slate-400" />
          <CardTitle className="text-base font-semibold text-slate-700">Access History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {historyLoading ? (
            <div className="p-6 space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : !history || history.entries.length === 0 ? (
            <p className="px-6 py-5 text-sm text-slate-400 italic">No views yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {history.entries.map(entry => (
                <li key={entry.id} className="flex items-center justify-between px-6 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono text-xs px-2">{entry.code.slice(0, 3)}-{entry.code.slice(3)}</Badge>
                    <span className="text-slate-500">viewed by a provider</span>
                  </div>
                  <span className="text-slate-400 text-xs tabular-nums">
                    {new Date(entry.viewedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Home() {
  const { data: patient, isLoading, error } = useGetPatient(PATIENT_ID);
  const updatePatient = useUpdatePatient();
  const { toast } = useToast();

  const [formData, setFormData] = useState<PatientInput | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const initializedForId = useRef<string | null>(null);
  const lastSaved = useRef<string | null>(null);

  useEffect(() => {
    if (patient && initializedForId.current !== patient.id) {
      const initial: PatientInput = {
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth,
        biologicalSex: patient.biologicalSex,
        genderIdentity: patient.genderIdentity,
        preferredLanguage: patient.preferredLanguage,
        maritalStatus: patient.maritalStatus,
        bloodType: patient.bloodType,
        phone: patient.phone,
        email: patient.email,
        address: patient.address,
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
      setFormData(initial);
      lastSaved.current = JSON.stringify(initial);
      initializedForId.current = patient.id;
    }
  }, [patient]);

  const debouncedData = useDebounce(formData, 1000);

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

  const handleChange = (field: keyof PatientInput, value: unknown) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : prev);
  };

  const handleNested = (parent: string, field: string, value: string) => {
    setFormData(prev => {
      if (!prev) return prev;
      const map = prev as unknown as Record<string, unknown>;
      const cur = (map[parent] ?? {}) as Record<string, unknown>;
      return { ...prev, [parent]: { ...cur, [field]: value } } as PatientInput;
    });
  };

  const handleArrayChange = (arr: string, idx: number, field: string, value: unknown) => {
    setFormData(prev => {
      if (!prev) return prev;
      const map = prev as unknown as Record<string, unknown>;
      const list = [...(map[arr] as unknown[])] as Record<string, unknown>[];
      list[idx] = { ...list[idx], [field]: value };
      return { ...prev, [arr]: list } as PatientInput;
    });
  };

  const handleAdd = (arr: string, item: unknown) => {
    setFormData(prev => {
      if (!prev) return prev;
      const map = prev as unknown as Record<string, unknown>;
      const list = (map[arr] as unknown[]) ?? [];
      return { ...prev, [arr]: [...list, item] } as PatientInput;
    });
  };

  const handleRemove = (arr: string, idx: number) => {
    setFormData(prev => {
      if (!prev) return prev;
      const map = prev as unknown as Record<string, unknown>;
      const list = [...(map[arr] as unknown[])];
      list.splice(idx, 1);
      return { ...prev, [arr]: list } as PatientInput;
    });
  };

  if (isLoading) {
    return <Layout><div className="space-y-6">{[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full" />)}</div></Layout>;
  }

  if (error || !formData) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh]">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Data</h2>
        </div>
      </Layout>
    );
  }

  const bmi = calcBMI(formData.vitals.heightFt, formData.vitals.heightIn, formData.vitals.weightLbs);
  const age = calcAge(formData.dateOfBirth);

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Your Health Intake</h1>
          <p className="text-slate-500 mt-1">Keep your information up to date. Changes are saved automatically.</p>
        </div>
        <div className="text-sm font-medium text-slate-500 flex items-center min-w-[80px] justify-end">
          {saveStatus === "saving" && <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving</>}
          {saveStatus === "saved" && <><CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />Saved</>}
        </div>
      </div>

      <div className="space-y-8">
        <PassCard />

        {/* Demographics */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
            <CardTitle className="text-lg font-semibold text-slate-800">Demographics</CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2"><Label>First Name</Label><Input value={formData.firstName} onChange={e => handleChange("firstName", e.target.value)} /></div>
            <div className="space-y-2"><Label>Last Name</Label><Input value={formData.lastName} onChange={e => handleChange("lastName", e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Input type="date" value={formData.dateOfBirth} onChange={e => handleChange("dateOfBirth", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Age</Label>
              <Input value={age} readOnly className="bg-slate-50 text-slate-500 cursor-default" />
            </div>
            <div className="space-y-2">
              <Label>Biological Sex</Label>
              <Select value={formData.biologicalSex} onValueChange={v => handleChange("biologicalSex", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Intersex">Intersex</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Gender Identity</Label>
              <Input value={formData.genderIdentity} onChange={e => handleChange("genderIdentity", e.target.value)} placeholder="e.g. Woman, Man, Non-binary" />
            </div>
            <div className="space-y-2">
              <Label>Preferred Language</Label>
              <Input value={formData.preferredLanguage} onChange={e => handleChange("preferredLanguage", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Marital Status</Label>
              <Select value={formData.maritalStatus} onValueChange={v => handleChange("maritalStatus", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Single">Single</SelectItem>
                  <SelectItem value="Married">Married</SelectItem>
                  <SelectItem value="Divorced">Divorced</SelectItem>
                  <SelectItem value="Widowed">Widowed</SelectItem>
                  <SelectItem value="Domestic Partnership">Domestic Partnership</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Blood Type</Label>
              <Select value={formData.bloodType} onValueChange={v => handleChange("bloodType", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["A+","A−","B+","B−","AB+","AB−","O+","O−","Unknown"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Phone</Label><Input value={formData.phone} onChange={e => handleChange("phone", e.target.value)} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={formData.email} onChange={e => handleChange("email", e.target.value)} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Home Address</Label><Input value={formData.address} onChange={e => handleChange("address", e.target.value)} /></div>
          </CardContent>
        </Card>

        {/* Vitals */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
            <CardTitle className="text-lg font-semibold text-slate-800">Vitals <span className="text-sm font-normal text-slate-400">(patient-reported)</span></CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-2"><Label>Height (ft)</Label><Input type="number" min="3" max="8" value={formData.vitals.heightFt} onChange={e => handleNested("vitals", "heightFt", e.target.value)} /></div>
            <div className="space-y-2"><Label>Height (in)</Label><Input type="number" min="0" max="11" value={formData.vitals.heightIn} onChange={e => handleNested("vitals", "heightIn", e.target.value)} /></div>
            <div className="space-y-2"><Label>Weight (lbs)</Label><Input type="number" value={formData.vitals.weightLbs} onChange={e => handleNested("vitals", "weightLbs", e.target.value)} /></div>
            <div className="space-y-2">
              <Label>BMI</Label>
              <Input value={bmi} readOnly className="bg-slate-50 text-slate-500 cursor-default" />
            </div>
            <div className="space-y-2"><Label>Systolic BP (mmHg)</Label><Input type="number" value={formData.vitals.systolic} onChange={e => handleNested("vitals", "systolic", e.target.value)} /></div>
            <div className="space-y-2"><Label>Diastolic BP (mmHg)</Label><Input type="number" value={formData.vitals.diastolic} onChange={e => handleNested("vitals", "diastolic", e.target.value)} /></div>
          </CardContent>
        </Card>

        {/* Care Team */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
            <CardTitle className="text-lg font-semibold text-slate-800">Care Team &amp; Visit</CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2"><Label>Primary Care Provider</Label><Input value={formData.careTeam.pcp} onChange={e => handleNested("careTeam", "pcp", e.target.value)} placeholder="Dr. Name, MD — Practice" /></div>
            <div className="space-y-2"><Label>Referring Physician</Label><Input value={formData.careTeam.referringPhysician} onChange={e => handleNested("careTeam", "referringPhysician", e.target.value)} /></div>
            <div className="space-y-2"><Label>Today's Visit Specialty</Label><Input value={formData.careTeam.visitSpecialty} onChange={e => handleNested("careTeam", "visitSpecialty", e.target.value)} placeholder="e.g. Endocrinology" /></div>
            <div className="space-y-2"><Label>Preferred Pharmacy</Label><Input value={formData.careTeam.preferredPharmacy} onChange={e => handleNested("careTeam", "preferredPharmacy", e.target.value)} /></div>
            <div className="space-y-2"><Label>Pharmacy Phone</Label><Input value={formData.careTeam.pharmacyPhone} onChange={e => handleNested("careTeam", "pharmacyPhone", e.target.value)} /></div>
            <div className="space-y-2 md:col-span-2">
              <Label>Reason for Today's Visit</Label>
              <Textarea value={formData.careTeam.reasonForVisit} onChange={e => handleNested("careTeam", "reasonForVisit", e.target.value)} rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* Insurance */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
            <CardTitle className="text-lg font-semibold text-slate-800">Insurance</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Primary Insurance</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Plan Name</Label><Input value={formData.insurance.plan} onChange={e => handleNested("insurance", "plan", e.target.value)} /></div>
                <div className="space-y-2"><Label>Member ID</Label><Input value={formData.insurance.memberId} onChange={e => handleNested("insurance", "memberId", e.target.value)} /></div>
                <div className="space-y-2"><Label>Group Number</Label><Input value={formData.insurance.group} onChange={e => handleNested("insurance", "group", e.target.value)} /></div>
                <div className="space-y-2"><Label>Policyholder</Label><Input value={formData.insurance.policyholder} onChange={e => handleNested("insurance", "policyholder", e.target.value)} /></div>
                <div className="space-y-2"><Label>Provider Phone</Label><Input value={formData.insurance.phone} onChange={e => handleNested("insurance", "phone", e.target.value)} /></div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Secondary Insurance</p>
                {formData.insuranceSecondary === null ? (
                  <Button variant="outline" size="sm" onClick={() => handleChange("insuranceSecondary", { plan: "", memberId: "", group: "", policyholder: "", phone: "" })}>
                    <Plus className="w-4 h-4 mr-1" />Add Secondary
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" className="text-slate-400 hover:text-destructive" onClick={() => handleChange("insuranceSecondary", null)}>
                    <Trash2 className="w-4 h-4 mr-1" />Remove
                  </Button>
                )}
              </div>
              {formData.insuranceSecondary && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Plan Name</Label><Input value={formData.insuranceSecondary.plan} onChange={e => handleNested("insuranceSecondary", "plan", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Member ID</Label><Input value={formData.insuranceSecondary.memberId} onChange={e => handleNested("insuranceSecondary", "memberId", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Group Number</Label><Input value={formData.insuranceSecondary.group} onChange={e => handleNested("insuranceSecondary", "group", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Policyholder</Label><Input value={formData.insuranceSecondary.policyholder} onChange={e => handleNested("insuranceSecondary", "policyholder", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Provider Phone</Label><Input value={formData.insuranceSecondary.phone} onChange={e => handleNested("insuranceSecondary", "phone", e.target.value)} /></div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
            <CardTitle className="text-lg font-semibold text-slate-800">Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2"><Label>Name</Label><Input value={formData.emergencyContact.name} onChange={e => handleNested("emergencyContact", "name", e.target.value)} /></div>
            <div className="space-y-2"><Label>Relationship</Label><Input value={formData.emergencyContact.relationship} onChange={e => handleNested("emergencyContact", "relationship", e.target.value)} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={formData.emergencyContact.phone} onChange={e => handleNested("emergencyContact", "phone", e.target.value)} /></div>
          </CardContent>
        </Card>

        {/* Allergies */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between py-4 px-6">
            <CardTitle className="text-lg font-semibold text-slate-800">Allergies</CardTitle>
            <Button variant="outline" size="sm" onClick={() => handleAdd("allergies", { name: "", reaction: "", severity: "Mild" })}>
              <Plus className="w-4 h-4 mr-1" />Add
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {formData.allergies.length === 0 ? <p className="p-6 text-sm text-slate-500 text-center">No known allergies.</p> : (
              <div className="divide-y divide-slate-100">
                {(formData.allergies as { name: string; reaction: string; severity: string }[]).map((a, i) => (
                  <div key={i} className="p-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    <div className="md:col-span-4 space-y-2"><Label>Substance</Label><Input value={a.name} onChange={e => handleArrayChange("allergies", i, "name", e.target.value)} placeholder="e.g. Penicillin" /></div>
                    <div className="md:col-span-4 space-y-2"><Label>Reaction</Label><Input value={a.reaction} onChange={e => handleArrayChange("allergies", i, "reaction", e.target.value)} placeholder="e.g. Hives" /></div>
                    <div className="md:col-span-3 space-y-2">
                      <Label>Severity</Label>
                      <Select value={a.severity} onValueChange={v => handleArrayChange("allergies", i, "severity", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Mild">Mild</SelectItem>
                          <SelectItem value="Moderate">Moderate</SelectItem>
                          <SelectItem value="Severe">Severe</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-1 flex justify-end md:mt-8">
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-destructive" onClick={() => handleRemove("allergies", i)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Medications */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between py-4 px-6">
            <CardTitle className="text-lg font-semibold text-slate-800">Medications</CardTitle>
            <Button variant="outline" size="sm" onClick={() => handleAdd("medications", { name: "", dose: "", frequency: "", route: "Oral", prescriber: "", reason: "" })}>
              <Plus className="w-4 h-4 mr-1" />Add
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {formData.medications.length === 0 ? <p className="p-6 text-sm text-slate-500 text-center">No current medications.</p> : (
              <div className="divide-y divide-slate-100">
                {(formData.medications as { name: string; dose: string; frequency: string; route: string; prescriber: string; reason: string }[]).map((m, i) => (
                  <div key={i} className="p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                      <div className="md:col-span-3 space-y-2"><Label>Medication</Label><Input value={m.name} onChange={e => handleArrayChange("medications", i, "name", e.target.value)} placeholder="e.g. Metformin" /></div>
                      <div className="md:col-span-2 space-y-2"><Label>Dose</Label><Input value={m.dose} onChange={e => handleArrayChange("medications", i, "dose", e.target.value)} placeholder="1000 mg" /></div>
                      <div className="md:col-span-3 space-y-2"><Label>Frequency</Label><Input value={m.frequency} onChange={e => handleArrayChange("medications", i, "frequency", e.target.value)} placeholder="Twice daily" /></div>
                      <div className="md:col-span-2 space-y-2">
                        <Label>Route</Label>
                        <Select value={m.route} onValueChange={v => handleArrayChange("medications", i, "route", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["Oral","IV","IM","Topical","Inhaled","Sublingual","Transdermal","Other"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-1 flex justify-end md:mt-8">
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-destructive" onClick={() => handleRemove("medications", i)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Prescribing Doctor</Label><Input value={m.prescriber} onChange={e => handleArrayChange("medications", i, "prescriber", e.target.value)} placeholder="Dr. Name, MD" /></div>
                      <div className="space-y-2"><Label>Reason / Indication</Label><Input value={m.reason} onChange={e => handleArrayChange("medications", i, "reason", e.target.value)} placeholder="e.g. Type 2 diabetes" /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conditions */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between py-4 px-6">
            <CardTitle className="text-lg font-semibold text-slate-800">Medical Conditions</CardTitle>
            <Button variant="outline" size="sm" onClick={() => handleAdd("conditions", { name: "", diagnosedDate: "", status: "Active", notes: "" })}>
              <Plus className="w-4 h-4 mr-1" />Add
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {formData.conditions.length === 0 ? <p className="p-6 text-sm text-slate-500 text-center">No conditions listed.</p> : (
              <div className="divide-y divide-slate-100">
                {(formData.conditions as { name: string; diagnosedDate: string | null; status: string; notes: string | null }[]).map((c, i) => (
                  <div key={i} className="p-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    <div className="md:col-span-4 space-y-2"><Label>Condition</Label><Input value={c.name} onChange={e => handleArrayChange("conditions", i, "name", e.target.value)} placeholder="e.g. Type 2 Diabetes" /></div>
                    <div className="md:col-span-2 space-y-2"><Label>Date Diagnosed</Label><Input value={c.diagnosedDate || ""} onChange={e => handleArrayChange("conditions", i, "diagnosedDate", e.target.value)} placeholder="YYYY-MM" /></div>
                    <div className="md:col-span-2 space-y-2">
                      <Label>Status</Label>
                      <Select value={c.status} onValueChange={v => handleArrayChange("conditions", i, "status", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-3 space-y-2"><Label>Notes</Label><Input value={c.notes || ""} onChange={e => handleArrayChange("conditions", i, "notes", e.target.value)} placeholder="Optional context" /></div>
                    <div className="md:col-span-1 flex justify-end md:mt-8">
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-destructive" onClick={() => handleRemove("conditions", i)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Surgeries */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between py-4 px-6">
            <CardTitle className="text-lg font-semibold text-slate-800">Surgeries &amp; Procedures</CardTitle>
            <Button variant="outline" size="sm" onClick={() => handleAdd("surgeries", { procedure: "", date: "", facility: "" })}>
              <Plus className="w-4 h-4 mr-1" />Add
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {formData.surgeries.length === 0 ? <p className="p-6 text-sm text-slate-500 text-center">No surgeries or procedures.</p> : (
              <div className="divide-y divide-slate-100">
                {(formData.surgeries as { procedure: string; date: string | null; facility: string | null }[]).map((s, i) => (
                  <div key={i} className="p-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    <div className="md:col-span-5 space-y-2"><Label>Procedure</Label><Input value={s.procedure} onChange={e => handleArrayChange("surgeries", i, "procedure", e.target.value)} placeholder="e.g. Cholecystectomy" /></div>
                    <div className="md:col-span-2 space-y-2"><Label>Date</Label><Input type="date" value={s.date || ""} onChange={e => handleArrayChange("surgeries", i, "date", e.target.value)} /></div>
                    <div className="md:col-span-4 space-y-2"><Label>Facility</Label><Input value={s.facility || ""} onChange={e => handleArrayChange("surgeries", i, "facility", e.target.value)} placeholder="Hospital / Clinic" /></div>
                    <div className="md:col-span-1 flex justify-end md:mt-8">
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-destructive" onClick={() => handleRemove("surgeries", i)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Immunizations */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between py-4 px-6">
            <CardTitle className="text-lg font-semibold text-slate-800">Immunizations</CardTitle>
            <Button variant="outline" size="sm" onClick={() => handleAdd("immunizations", { vaccine: "", date: "" })}>
              <Plus className="w-4 h-4 mr-1" />Add
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {formData.immunizations.length === 0 ? <p className="p-6 text-sm text-slate-500 text-center">No immunizations recorded.</p> : (
              <div className="divide-y divide-slate-100">
                {(formData.immunizations as { vaccine: string; date: string }[]).map((imm, i) => (
                  <div key={i} className="p-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    <div className="md:col-span-8 space-y-2"><Label>Vaccine</Label><Input value={imm.vaccine} onChange={e => handleArrayChange("immunizations", i, "vaccine", e.target.value)} placeholder="e.g. Influenza" /></div>
                    <div className="md:col-span-3 space-y-2"><Label>Date</Label><Input type="date" value={imm.date} onChange={e => handleArrayChange("immunizations", i, "date", e.target.value)} /></div>
                    <div className="md:col-span-1 flex justify-end md:mt-8">
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-destructive" onClick={() => handleRemove("immunizations", i)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Family History */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between py-4 px-6">
            <CardTitle className="text-lg font-semibold text-slate-800">Family History</CardTitle>
            <Button variant="outline" size="sm" onClick={() => handleAdd("familyHistory", { relation: "", condition: "" })}>
              <Plus className="w-4 h-4 mr-1" />Add
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {formData.familyHistory.length === 0 ? <p className="p-6 text-sm text-slate-500 text-center">No family history recorded.</p> : (
              <div className="divide-y divide-slate-100">
                {(formData.familyHistory as { relation: string; condition: string }[]).map((fh, i) => (
                  <div key={i} className="p-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    <div className="md:col-span-4 space-y-2"><Label>Relation</Label><Input value={fh.relation} onChange={e => handleArrayChange("familyHistory", i, "relation", e.target.value)} placeholder="e.g. Father, Mother" /></div>
                    <div className="md:col-span-7 space-y-2"><Label>Condition</Label><Input value={fh.condition} onChange={e => handleArrayChange("familyHistory", i, "condition", e.target.value)} placeholder="e.g. Type 2 Diabetes" /></div>
                    <div className="md:col-span-1 flex justify-end md:mt-8">
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-destructive" onClick={() => handleRemove("familyHistory", i)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Social History */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
            <CardTitle className="text-lg font-semibold text-slate-800">Social History</CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2"><Label>Smoking / Tobacco</Label><Input value={formData.socialHistory.smoking} onChange={e => handleNested("socialHistory", "smoking", e.target.value)} placeholder="e.g. Never, Former smoker (quit 2010)" /></div>
            <div className="space-y-2"><Label>Alcohol Use</Label><Input value={formData.socialHistory.alcohol} onChange={e => handleNested("socialHistory", "alcohol", e.target.value)} placeholder="e.g. Occasional, 1-2 drinks/week" /></div>
            <div className="space-y-2"><Label>Occupation</Label><Input value={formData.socialHistory.occupation} onChange={e => handleNested("socialHistory", "occupation", e.target.value)} placeholder="e.g. Teacher" /></div>
            <div className="space-y-2"><Label>Exercise Frequency</Label><Input value={formData.socialHistory.exercise} onChange={e => handleNested("socialHistory", "exercise", e.target.value)} placeholder="e.g. 3×/week, 30-min walks" /></div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
