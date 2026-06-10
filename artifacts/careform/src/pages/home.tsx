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
import { QRCodeSVG } from "qrcode.react";
import { useDebounce } from "@/lib/use-debounce";
import {
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  QrCode,
  ShieldOff,
  Clock,
  History,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const PATIENT_ID = "demo";

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

  const {
    data: pass,
    isLoading: passLoading,
  } = useGetActivePass(PATIENT_ID, {
    query: {
      queryKey: getGetActivePassQueryKey(PATIENT_ID),
      retry: false,
      refetchOnWindowFocus: false,
    },
  });

  const {
    data: history,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useGetAccessHistory(PATIENT_ID, {
    query: {
      queryKey: getGetAccessHistoryQueryKey(PATIENT_ID),
      retry: false,
      refetchInterval: 8000,
    },
  });

  const createCode = useCreateCode();
  const revokeCode = useRevokeCode();
  const timeLeft = useCountdown(pass?.expiresAt);

  const providerUrl = pass
    ? `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/provider?code=${pass.code}`
    : "";

  const handleGenerate = () => {
    createCode.mutate(
      { data: { patientId: PATIENT_ID } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetActivePassQueryKey(PATIENT_ID) });
          refetchHistory();
        },
        onError: () => {
          toast({ title: "Could not generate pass", description: "Please try again.", variant: "destructive" });
        },
      },
    );
  };

  const handleRevoke = () => {
    if (!pass) return;
    revokeCode.mutate(
      { code: pass.code },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetActivePassQueryKey(PATIENT_ID) });
          toast({ title: "Pass revoked", description: "The access code is no longer valid." });
        },
        onError: () => {
          toast({ title: "Could not revoke pass", variant: "destructive" });
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      {/* Active pass card */}
      <Card className="border-blue-100 overflow-hidden shadow-sm">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b border-blue-100 py-4 px-6 flex flex-row items-center gap-2">
          <QrCode className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg font-semibold text-slate-800">Provider Pass</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {passLoading || createCode.isPending || revokeCode.isPending ? (
            <div className="flex items-center justify-center py-10 gap-3 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">
                {createCode.isPending ? "Generating pass…" : revokeCode.isPending ? "Revoking…" : "Loading…"}
              </span>
            </div>
          ) : pass ? (
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
              {/* QR code */}
              <div className="flex-shrink-0 flex flex-col items-center">
                <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <QRCodeSVG value={providerUrl} size={164} level="H" />
                </div>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mt-3">Scan to open</p>
              </div>

              {/* Code + meta + actions */}
              <div className="flex-1 flex flex-col gap-4 text-center md:text-left">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Access Code</p>
                  <div className="text-5xl font-mono font-bold tracking-widest text-primary select-all">
                    {pass.code.slice(0, 3)}-{pass.code.slice(3)}
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-600">
                    {timeLeft === "Expired" ? "Expired" : `Expires in ${timeLeft}`}
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 font-mono text-xs text-slate-500 break-all">
                  {providerUrl}
                </div>

                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { navigator.clipboard.writeText(providerUrl); toast({ title: "Link copied" }); }}
                  >
                    Copy Link
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/30 hover:bg-destructive/5"
                    onClick={handleRevoke}
                  >
                    <ShieldOff className="w-4 h-4 mr-1.5" />
                    Revoke Pass
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
                <p className="text-sm text-slate-500 mt-1">
                  Generate a pass to share your intake with a provider. It expires in 4 hours.
                </p>
              </div>
              <Button onClick={handleGenerate} className="gap-2">
                <QrCode className="w-4 h-4" />
                Generate Pass
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Access history */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6 flex flex-row items-center gap-2">
          <History className="w-5 h-5 text-slate-400" />
          <CardTitle className="text-base font-semibold text-slate-700">Access History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {historyLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : !history || history.entries.length === 0 ? (
            <p className="px-6 py-5 text-sm text-slate-400 italic">No views yet. Share your pass with a provider to see history here.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {history.entries.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between px-6 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono text-xs px-2">
                      {entry.code.slice(0, 3)}-{entry.code.slice(3)}
                    </Badge>
                    <span className="text-slate-500">viewed by a provider</span>
                  </div>
                  <span className="text-slate-400 text-xs tabular-nums">
                    {new Date(entry.viewedAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
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
        gender: patient.gender,
        phone: patient.phone,
        email: patient.email,
        address: patient.address,
        insurance: { ...patient.insurance },
        emergencyContact: { ...patient.emergencyContact },
        allergies: patient.allergies.map(a => ({ ...a })),
        medications: patient.medications.map(m => ({ ...m })),
        conditions: patient.conditions.map(c => ({ ...c })),
        surgeries: patient.surgeries.map(s => ({ ...s })),
      };
      setFormData(initial);
      lastSaved.current = JSON.stringify(initial);
      initializedForId.current = patient.id;
    }
  }, [patient]);

  const debouncedData = useDebounce(formData, 1000);

  const saveForm = useCallback(
    async (data: PatientInput) => {
      const dataStr = JSON.stringify(data);
      if (dataStr === lastSaved.current) return;
      setSaveStatus("saving");
      try {
        await updatePatient.mutateAsync({ id: PATIENT_ID, data });
        lastSaved.current = dataStr;
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch {
        toast({ title: "Failed to save", description: "There was an error saving your intake form.", variant: "destructive" });
        setSaveStatus("idle");
      }
    },
    [updatePatient, toast],
  );

  useEffect(() => {
    if (debouncedData && initializedForId.current) {
      saveForm(debouncedData);
    }
  }, [debouncedData, saveForm]);

  const handleChange = (field: keyof PatientInput, value: unknown) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : prev);
  };

  const handleNestedChange = (parent: "insurance" | "emergencyContact", field: string, value: string) => {
    setFormData(prev => prev ? { ...prev, [parent]: { ...prev[parent], [field]: value } } : prev);
  };

  const handleArrayChange = <T,>(
    arrayName: "allergies" | "medications" | "conditions" | "surgeries",
    index: number,
    field: keyof T,
    value: unknown,
  ) => {
    setFormData(prev => {
      if (!prev) return prev;
      const arr = [...prev[arrayName]] as unknown as Record<string, unknown>[];
      arr[index] = { ...arr[index], [field as string]: value };
      return { ...prev, [arrayName]: arr };
    });
  };

  const handleAddArrayItem = (arrayName: "allergies" | "medications" | "conditions" | "surgeries", emptyItem: unknown) => {
    setFormData(prev => prev ? { ...prev, [arrayName]: [...prev[arrayName], emptyItem] } : prev);
  };

  const handleRemoveArrayItem = (arrayName: "allergies" | "medications" | "conditions" | "surgeries", index: number) => {
    setFormData(prev => {
      if (!prev) return prev;
      const arr = [...prev[arrayName]];
      arr.splice(index, 1);
      return { ...prev, [arrayName]: arr };
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (error || !formData) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh]">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Data</h2>
          <p className="text-slate-500">Please try again later.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Your Health Intake</h1>
          <p className="text-slate-500 mt-1">Keep your information up to date. Changes are saved automatically.</p>
        </div>
        <div className="text-sm font-medium text-slate-500 flex items-center min-w-[80px] justify-end">
          {saveStatus === "saving" && <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving</>}
          {saveStatus === "saved" && <><CheckCircle2 className="w-4 h-4 mr-2 text-green-600" /> Saved</>}
        </div>
      </div>

      <div className="space-y-8">
        {/* Pass + history panel */}
        <PassCard />

        {/* Personal Information */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-lg font-semibold text-slate-800">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input value={formData.firstName} onChange={e => handleChange("firstName", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input value={formData.lastName} onChange={e => handleChange("lastName", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Input type="date" value={formData.dateOfBirth} onChange={e => handleChange("dateOfBirth", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={formData.gender} onValueChange={val => handleChange("gender", val)}>
                <SelectTrigger><SelectValue placeholder="Select Gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                  <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={formData.phone} onChange={e => handleChange("phone", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={formData.email} onChange={e => handleChange("email", e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Address</Label>
              <Input value={formData.address} onChange={e => handleChange("address", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Insurance + Emergency Contact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg font-semibold text-slate-800">Insurance</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Plan Name</Label>
                <Input value={formData.insurance.plan} onChange={e => handleNestedChange("insurance", "plan", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Member ID</Label>
                <Input value={formData.insurance.memberId} onChange={e => handleNestedChange("insurance", "memberId", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Group Number</Label>
                <Input value={formData.insurance.group} onChange={e => handleNestedChange("insurance", "group", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Provider Phone</Label>
                <Input value={formData.insurance.phone} onChange={e => handleNestedChange("insurance", "phone", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg font-semibold text-slate-800">Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={formData.emergencyContact.name} onChange={e => handleNestedChange("emergencyContact", "name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Relationship</Label>
                <Input value={formData.emergencyContact.relationship} onChange={e => handleNestedChange("emergencyContact", "relationship", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={formData.emergencyContact.phone} onChange={e => handleNestedChange("emergencyContact", "phone", e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Allergies */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between py-4">
            <CardTitle className="text-lg font-semibold text-slate-800">Allergies</CardTitle>
            <Button variant="outline" size="sm" onClick={() => handleAddArrayItem("allergies", { name: "", severity: "Mild", reaction: "" })}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {formData.allergies.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">No known allergies.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {formData.allergies.map((allergy, i) => (
                  <div key={i} className="p-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    <div className="md:col-span-4 space-y-2">
                      <Label>Allergen</Label>
                      <Input value={allergy.name} onChange={e => handleArrayChange("allergies", i, "name" as never, e.target.value)} placeholder="e.g. Penicillin" />
                    </div>
                    <div className="md:col-span-4 space-y-2">
                      <Label>Reaction</Label>
                      <Input value={allergy.reaction} onChange={e => handleArrayChange("allergies", i, "reaction" as never, e.target.value)} placeholder="e.g. Hives" />
                    </div>
                    <div className="md:col-span-3 space-y-2">
                      <Label>Severity</Label>
                      <Select value={allergy.severity} onValueChange={val => handleArrayChange("allergies", i, "severity" as never, val)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Mild">Mild</SelectItem>
                          <SelectItem value="Moderate">Moderate</SelectItem>
                          <SelectItem value="Severe">Severe</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-1 flex justify-end md:mt-8">
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-destructive" onClick={() => handleRemoveArrayItem("allergies", i)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Medications */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between py-4">
            <CardTitle className="text-lg font-semibold text-slate-800">Medications</CardTitle>
            <Button variant="outline" size="sm" onClick={() => handleAddArrayItem("medications", { name: "", dose: "", frequency: "", prescriber: "" })}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {formData.medications.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">No current medications.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {formData.medications.map((med, i) => (
                  <div key={i} className="p-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    <div className="md:col-span-3 space-y-2">
                      <Label>Medication</Label>
                      <Input value={med.name} onChange={e => handleArrayChange("medications", i, "name" as never, e.target.value)} placeholder="e.g. Lisinopril" />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label>Dose</Label>
                      <Input value={med.dose} onChange={e => handleArrayChange("medications", i, "dose" as never, e.target.value)} placeholder="e.g. 10mg" />
                    </div>
                    <div className="md:col-span-3 space-y-2">
                      <Label>Frequency</Label>
                      <Input value={med.frequency} onChange={e => handleArrayChange("medications", i, "frequency" as never, e.target.value)} placeholder="e.g. Twice daily" />
                    </div>
                    <div className="md:col-span-3 space-y-2">
                      <Label>Prescriber</Label>
                      <Input value={med.prescriber} onChange={e => handleArrayChange("medications", i, "prescriber" as never, e.target.value)} placeholder="e.g. Dr. Smith" />
                    </div>
                    <div className="md:col-span-1 flex justify-end md:mt-8">
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-destructive" onClick={() => handleRemoveArrayItem("medications", i)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conditions */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between py-4">
            <CardTitle className="text-lg font-semibold text-slate-800">Medical Conditions</CardTitle>
            <Button variant="outline" size="sm" onClick={() => handleAddArrayItem("conditions", { name: "", diagnosedDate: "", notes: "" })}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {formData.conditions.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">No ongoing conditions.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {formData.conditions.map((condition, i) => (
                  <div key={i} className="p-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    <div className="md:col-span-4 space-y-2">
                      <Label>Condition</Label>
                      <Input value={condition.name} onChange={e => handleArrayChange("conditions", i, "name" as never, e.target.value)} placeholder="e.g. Asthma" />
                    </div>
                    <div className="md:col-span-3 space-y-2">
                      <Label>Date Diagnosed</Label>
                      <Input type="date" value={condition.diagnosedDate || ""} onChange={e => handleArrayChange("conditions", i, "diagnosedDate" as never, e.target.value)} />
                    </div>
                    <div className="md:col-span-4 space-y-2">
                      <Label>Notes</Label>
                      <Input value={condition.notes || ""} onChange={e => handleArrayChange("conditions", i, "notes" as never, e.target.value)} placeholder="Optional context" />
                    </div>
                    <div className="md:col-span-1 flex justify-end md:mt-8">
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-destructive" onClick={() => handleRemoveArrayItem("conditions", i)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Surgeries */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between py-4">
            <CardTitle className="text-lg font-semibold text-slate-800">Surgeries &amp; Procedures</CardTitle>
            <Button variant="outline" size="sm" onClick={() => handleAddArrayItem("surgeries", { procedure: "", date: "", hospital: "", notes: "" })}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {formData.surgeries.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">No prior surgeries.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {formData.surgeries.map((surgery, i) => (
                  <div key={i} className="p-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    <div className="md:col-span-4 space-y-2">
                      <Label>Procedure</Label>
                      <Input value={surgery.procedure} onChange={e => handleArrayChange("surgeries", i, "procedure" as never, e.target.value)} placeholder="e.g. Appendectomy" />
                    </div>
                    <div className="md:col-span-3 space-y-2">
                      <Label>Date</Label>
                      <Input type="date" value={surgery.date || ""} onChange={e => handleArrayChange("surgeries", i, "date" as never, e.target.value)} />
                    </div>
                    <div className="md:col-span-4 space-y-2">
                      <Label>Hospital / Clinic</Label>
                      <Input value={surgery.hospital || ""} onChange={e => handleArrayChange("surgeries", i, "hospital" as never, e.target.value)} />
                    </div>
                    <div className="md:col-span-1 flex justify-end md:mt-8">
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-destructive" onClick={() => handleRemoveArrayItem("surgeries", i)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
