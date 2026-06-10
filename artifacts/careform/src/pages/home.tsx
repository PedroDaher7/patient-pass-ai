import { useState, useEffect, useRef, useCallback } from "react";
import { useGetPatient, useUpdatePatient, useCreateCode } from "@workspace/api-client-react";
import type { PatientInput, Patient, Allergy, Medication, Condition, Surgery } from "@workspace/api-client-react/src/generated/api.schemas";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { useDebounce } from "@/lib/use-debounce";
import { Plus, Trash2, CheckCircle2, Share2, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function Home() {
  const { data: patient, isLoading, error } = useGetPatient("demo");
  const updatePatient = useUpdatePatient();
  const { toast } = useToast();

  const [formData, setFormData] = useState<PatientInput | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [shareOpen, setShareOpen] = useState(false);

  const initializedForId = useRef<string | null>(null);
  const lastSaved = useRef<string | null>(null);

  useEffect(() => {
    if (patient && initializedForId.current !== patient.id) {
      const initialData: PatientInput = {
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
      setFormData(initialData);
      lastSaved.current = JSON.stringify(initialData);
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
        await updatePatient.mutateAsync({ id: "demo", data });
        lastSaved.current = dataStr;
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (err) {
        toast({
          title: "Failed to save",
          description: "There was an error saving your intake form.",
          variant: "destructive",
        });
        setSaveStatus("idle");
      }
    },
    [updatePatient, toast]
  );

  useEffect(() => {
    if (debouncedData && initializedForId.current) {
      saveForm(debouncedData);
    }
  }, [debouncedData, saveForm]);

  const handleChange = (field: keyof PatientInput, value: any) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : prev);
  };

  const handleNestedChange = (parent: "insurance" | "emergencyContact", field: string, value: string) => {
    setFormData(prev => prev ? { ...prev, [parent]: { ...prev[parent], [field]: value } } : prev);
  };

  const handleArrayChange = <T extends any>(arrayName: "allergies" | "medications" | "conditions" | "surgeries", index: number, field: keyof T, value: any) => {
    setFormData(prev => {
      if (!prev) return prev;
      const newArray = [...prev[arrayName]];
      newArray[index] = { ...newArray[index], [field]: value };
      return { ...prev, [arrayName]: newArray };
    });
  };

  const handleAddArrayItem = (arrayName: "allergies" | "medications" | "conditions" | "surgeries", emptyItem: any) => {
    setFormData(prev => prev ? { ...prev, [arrayName]: [...prev[arrayName], emptyItem] } : prev);
  };

  const handleRemoveArrayItem = (arrayName: "allergies" | "medications" | "conditions" | "surgeries", index: number) => {
    setFormData(prev => {
      if (!prev) return prev;
      const newArray = [...prev[arrayName]];
      newArray.splice(index, 1);
      return { ...prev, [arrayName]: newArray };
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-64 w-full" />
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
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium text-slate-500 flex items-center min-w-[80px] justify-end transition-opacity duration-300">
            {saveStatus === "saving" && <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving</>}
            {saveStatus === "saved" && <><CheckCircle2 className="w-4 h-4 mr-2 text-green-600" /> Saved</>}
          </div>
          <Button onClick={() => setShareOpen(true)} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
            <Share2 className="w-4 h-4" />
            Share with Provider
          </Button>
        </div>
      </div>

      <div className="space-y-8">
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
                <SelectTrigger>
                  <SelectValue placeholder="Select Gender" />
                </SelectTrigger>
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
              <div className="divide-y border-slate-100">
                {formData.allergies.map((allergy, i) => (
                  <div key={i} className="p-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    <div className="md:col-span-4 space-y-2">
                      <Label>Allergen</Label>
                      <Input value={allergy.name} onChange={e => handleArrayChange("allergies", i, "name", e.target.value)} placeholder="e.g. Penicillin" />
                    </div>
                    <div className="md:col-span-4 space-y-2">
                      <Label>Reaction</Label>
                      <Input value={allergy.reaction} onChange={e => handleArrayChange("allergies", i, "reaction", e.target.value)} placeholder="e.g. Hives" />
                    </div>
                    <div className="md:col-span-3 space-y-2">
                      <Label>Severity</Label>
                      <Select value={allergy.severity} onValueChange={val => handleArrayChange("allergies", i, "severity", val)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
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
              <div className="divide-y border-slate-100">
                {formData.medications.map((med, i) => (
                  <div key={i} className="p-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    <div className="md:col-span-3 space-y-2">
                      <Label>Medication</Label>
                      <Input value={med.name} onChange={e => handleArrayChange("medications", i, "name", e.target.value)} placeholder="e.g. Lisinopril" />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label>Dose</Label>
                      <Input value={med.dose} onChange={e => handleArrayChange("medications", i, "dose", e.target.value)} placeholder="e.g. 10mg" />
                    </div>
                    <div className="md:col-span-3 space-y-2">
                      <Label>Frequency</Label>
                      <Input value={med.frequency} onChange={e => handleArrayChange("medications", i, "frequency", e.target.value)} placeholder="e.g. Twice daily" />
                    </div>
                    <div className="md:col-span-3 space-y-2">
                      <Label>Prescriber</Label>
                      <Input value={med.prescriber} onChange={e => handleArrayChange("medications", i, "prescriber", e.target.value)} placeholder="e.g. Dr. Smith" />
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
              <div className="divide-y border-slate-100">
                {formData.conditions.map((condition, i) => (
                  <div key={i} className="p-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    <div className="md:col-span-4 space-y-2">
                      <Label>Condition</Label>
                      <Input value={condition.name} onChange={e => handleArrayChange("conditions", i, "name", e.target.value)} placeholder="e.g. Asthma" />
                    </div>
                    <div className="md:col-span-3 space-y-2">
                      <Label>Date Diagnosed</Label>
                      <Input type="date" value={condition.diagnosedDate || ""} onChange={e => handleArrayChange("conditions", i, "diagnosedDate", e.target.value)} />
                    </div>
                    <div className="md:col-span-4 space-y-2">
                      <Label>Notes</Label>
                      <Input value={condition.notes || ""} onChange={e => handleArrayChange("conditions", i, "notes", e.target.value)} placeholder="Optional context" />
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

        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between py-4">
            <CardTitle className="text-lg font-semibold text-slate-800">Surgeries & Procedures</CardTitle>
            <Button variant="outline" size="sm" onClick={() => handleAddArrayItem("surgeries", { procedure: "", date: "", hospital: "", notes: "" })}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {formData.surgeries.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">No prior surgeries.</div>
            ) : (
              <div className="divide-y border-slate-100">
                {formData.surgeries.map((surgery, i) => (
                  <div key={i} className="p-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    <div className="md:col-span-4 space-y-2">
                      <Label>Procedure</Label>
                      <Input value={surgery.procedure} onChange={e => handleArrayChange("surgeries", i, "procedure", e.target.value)} placeholder="e.g. Appendectomy" />
                    </div>
                    <div className="md:col-span-3 space-y-2">
                      <Label>Date</Label>
                      <Input type="date" value={surgery.date || ""} onChange={e => handleArrayChange("surgeries", i, "date", e.target.value)} />
                    </div>
                    <div className="md:col-span-4 space-y-2">
                      <Label>Hospital / Clinic</Label>
                      <Input value={surgery.hospital || ""} onChange={e => handleArrayChange("surgeries", i, "hospital", e.target.value)} />
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

      <ShareModal open={shareOpen} onOpenChange={setShareOpen} patientId="demo" />
    </Layout>
  );
}

function ShareModal({ open, onOpenChange, patientId }: { open: boolean, onOpenChange: (open: boolean) => void, patientId: string }) {
  const createCode = useCreateCode();
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (open && !code && !createCode.isPending) {
      createCode.mutate({ data: { patientId, expiresInMinutes: 30 } }, {
        onSuccess: (res) => {
          setCode(res.code);
          setExpiresAt(res.expiresAt);
        }
      });
    }
  }, [open, code, createCode, patientId]);

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(expiresAt).getTime();
      const diff = end - now;
      if (diff <= 0) {
        setTimeLeft("Expired");
        clearInterval(interval);
      } else {
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const providerUrl = code ? `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}provider?code=${code}` : "";

  return (
    <Dialog open={open} onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
            // Reset code if modal closed to regenerate next time
            setTimeout(() => {
                setCode(null);
                setExpiresAt(null);
            }, 300);
        }
    }}>
      <DialogContent className="sm:max-w-md text-center border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-xl text-slate-800">Share Intake Form</DialogTitle>
          <DialogDescription className="text-slate-500">
            Show this code or scan the QR to share your details securely.
          </DialogDescription>
        </DialogHeader>

        {createCode.isPending || !code ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-sm text-slate-500">Generating secure code...</span>
          </div>
        ) : (
          <div className="space-y-6 py-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 flex flex-col items-center">
              <div className="text-5xl font-mono tracking-widest font-bold text-primary mb-3">
                {code.slice(0,3)}-{code.slice(3)}
              </div>
              <div className="text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                Expires in {timeLeft}
              </div>
            </div>
            
            <div className="flex flex-col items-center justify-center p-6 border border-slate-100 rounded-xl bg-white shadow-sm inline-block mx-auto">
              <QRCodeSVG value={providerUrl} size={180} level="H" className="mb-4" />
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Scan to view</div>
            </div>

            <div className="text-sm text-slate-600 truncate max-w-[300px] mx-auto bg-slate-50 px-4 py-2 rounded-md border border-slate-200 font-mono">
              {providerUrl}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
