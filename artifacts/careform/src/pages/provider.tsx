import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useValidateCode, getValidateCodeQueryKey } from "@workspace/api-client-react";
import type { Patient } from "@workspace/api-client-react";
import {
  AlertCircle, Loader2, Calendar, FileText, Syringe,
  Building2, ShieldOff, Clock, Brain, User, HeartPulse,
  FlaskConical, Activity, Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type ApiErrorLike = { data?: { errorCode?: string; error?: string } };

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

function getErrorMessage(error: unknown) {
  const code = (error as ApiErrorLike)?.data?.errorCode;
  switch (code) {
    case "CODE_REVOKED": return { heading: "Pass revoked", body: "The patient has revoked this access code. Ask them to generate a new pass.", icon: <ShieldOff className="w-4 h-4" /> };
    case "CODE_EXPIRED": return { heading: "Pass expired", body: "This code is no longer valid. Ask the patient to generate a new pass.", icon: <Clock className="w-4 h-4" /> };
    default: return { heading: "Code not found", body: "No matching code was found. Check the number and try again.", icon: <AlertCircle className="w-4 h-4" /> };
  }
}

function ClinicalSummary({ patient, expiresAt }: { patient: Patient; expiresAt: string }) {
  const age = calcAge(patient.dateOfBirth);
  const bmi = calcBMI(patient.vitals.heightFt, patient.vitals.heightIn, patient.vitals.weightLbs);
  const activeConditions = (patient.conditions as { name: string; status: string }[]).filter(c => c.status === "Active");
  const severeAllergies = (patient.allergies as { name: string; severity: string; reaction: string }[]).filter(a => a.severity === "Severe");

  const heightStr = patient.vitals.heightFt && patient.vitals.heightIn
    ? `${patient.vitals.heightFt}'${patient.vitals.heightIn}"`
    : "—";
  const bpStr = patient.vitals.systolic && patient.vitals.diastolic
    ? `${patient.vitals.systolic}/${patient.vitals.diastolic} mmHg`
    : "—";

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-sm overflow-hidden">
      <CardHeader className="bg-blue-600 text-white py-4 px-6 flex flex-row items-center gap-2">
        <Brain className="w-5 h-5" />
        <CardTitle className="text-base font-semibold tracking-wide">Clinical Overview</CardTitle>
        <span className="ml-auto text-xs text-blue-200 font-normal">
          Pass expires {new Date(expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </CardHeader>
      <CardContent className="p-6 space-y-5 text-sm">
        {/* Patient line */}
        <p className="text-slate-800 leading-relaxed">
          <span className="font-semibold">{patient.firstName} {patient.lastName}</span> is a {age}-year-old {patient.biologicalSex.toLowerCase()} (DOB {new Date(patient.dateOfBirth + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })})
          presenting to <span className="font-medium text-blue-700">{patient.careTeam.visitSpecialty}</span> for{" "}
          <span className="italic">{patient.careTeam.reasonForVisit}</span>.
          {patient.careTeam.pcp && ` Referred by ${patient.careTeam.referringPhysician || patient.careTeam.pcp}.`}
          {" "}Blood type: <span className="font-medium">{patient.bloodType || "unknown"}</span>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Vitals */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />Vitals
            </p>
            <div className="space-y-1.5 text-slate-700">
              <div className="flex justify-between"><span className="text-slate-500">Height</span><span className="font-medium">{heightStr}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Weight</span><span className="font-medium">{patient.vitals.weightLbs ? `${patient.vitals.weightLbs} lbs` : "—"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">BMI</span><span className={`font-medium ${parseFloat(bmi) >= 30 ? "text-amber-600" : ""}`}>{bmi}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">BP</span><span className="font-medium">{bpStr}</span></div>
            </div>
          </div>

          {/* Active conditions */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <HeartPulse className="w-3.5 h-3.5" />Active Conditions
            </p>
            {activeConditions.length === 0 ? <p className="text-slate-400 text-xs italic">None reported</p> : (
              <ul className="space-y-1">
                {activeConditions.map((c, i) => <li key={i} className="text-slate-700">• {c.name}</li>)}
              </ul>
            )}
          </div>

          {/* Critical allergies */}
          <div className={`rounded-lg border p-4 ${severeAllergies.length > 0 ? "bg-rose-50 border-rose-200" : "bg-white border-slate-200"}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${severeAllergies.length > 0 ? "text-rose-500" : "text-slate-400"}`}>
              <AlertCircle className="w-3.5 h-3.5" />
              {severeAllergies.length > 0 ? "⚠ Severe Allergies" : "Allergies"}
            </p>
            {(patient.allergies as { name: string; severity: string; reaction: string }[]).length === 0
              ? <p className="text-slate-400 text-xs italic">None reported</p>
              : <ul className="space-y-1">
                  {(patient.allergies as { name: string; severity: string; reaction: string }[]).map((a, i) => (
                    <li key={i} className={severeAllergies.includes(a) ? "text-rose-700 font-medium" : "text-slate-700"}>
                      • {a.name} ({a.severity.toLowerCase()})
                    </li>
                  ))}
                </ul>
            }
          </div>
        </div>

        {/* Key medications */}
        {patient.medications.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Syringe className="w-3.5 h-3.5" />Current Medications ({patient.medications.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {(patient.medications as { name: string; dose: string; frequency: string }[]).map((m, i) => (
                <span key={i} className="inline-flex items-center bg-blue-50 text-blue-800 border border-blue-100 text-xs rounded-full px-3 py-1 font-medium">
                  {m.name} {m.dose}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PatientRecord({ data }: { data: { patient: Patient; expiresAt: string } }) {
  const patient = data.patient;
  const age = calcAge(patient.dateOfBirth);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">{patient.firstName} {patient.lastName}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-slate-600">
            <span className="flex items-center gap-1.5 text-sm"><User className="w-4 h-4 text-slate-400" />{age} y/o {patient.biologicalSex} · DOB {patient.dateOfBirth}</span>
            {patient.bloodType && <Badge variant="secondary" className="font-mono">{patient.bloodType}</Badge>}
            {patient.maritalStatus && <span className="text-sm text-slate-500">{patient.maritalStatus}</span>}
          </div>
        </div>
        <div className="text-xs text-slate-400">
          Updated {new Date(patient.updatedAt).toLocaleDateString()}
        </div>
      </div>

      <ClinicalSummary patient={patient} expiresAt={data.expiresAt} />

      {/* Contact + Insurance */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
          <CardTitle className="text-base font-semibold text-slate-800">Contact, Care Team &amp; Insurance</CardTitle>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Contact</p>
            <div className="space-y-2">
              <Row label="Phone" value={patient.phone} />
              <Row label="Email" value={patient.email} />
              <Row label="Address" value={patient.address} />
              <Row label="Language" value={patient.preferredLanguage} />
              <Row label="Gender ID" value={patient.genderIdentity} />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Care Team &amp; Visit</p>
            <div className="space-y-2">
              <Row label="PCP" value={patient.careTeam.pcp} />
              <Row label="Referring" value={patient.careTeam.referringPhysician} />
              <Row label="Specialty" value={patient.careTeam.visitSpecialty} />
              <Row label="Pharmacy" value={patient.careTeam.preferredPharmacy} />
              <Row label="Pharm. Ph" value={patient.careTeam.pharmacyPhone} />
            </div>
            <div className="mt-3 bg-blue-50 border border-blue-100 rounded-md p-3">
              <p className="text-xs text-slate-500 mb-1 font-medium">Reason for Visit</p>
              <p className="text-slate-800">{patient.careTeam.reasonForVisit}</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Insurance</p>
            <div className="space-y-2">
              <Row label="Plan" value={patient.insurance.plan} className="text-primary font-medium" />
              <Row label="Member ID" value={patient.insurance.memberId} mono />
              <Row label="Group" value={patient.insurance.group} mono />
              <Row label="Policyholder" value={patient.insurance.policyholder} />
              <Row label="Phone" value={patient.insurance.phone} />
            </div>
            {patient.insuranceSecondary && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider mb-2">Secondary</p>
                <Row label="Plan" value={patient.insuranceSecondary.plan} />
                <Row label="Member ID" value={patient.insuranceSecondary.memberId} mono />
                <Row label="Policyholder" value={patient.insuranceSecondary.policyholder} />
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider mb-2">Emergency Contact</p>
              <Row label="Name" value={patient.emergencyContact.name} />
              <Row label="Relation" value={patient.emergencyContact.relationship} />
              <Row label="Phone" value={patient.emergencyContact.phone} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Allergies + Medications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-sm overflow-hidden h-full">
          <CardHeader className="bg-rose-50/40 border-b border-slate-100 py-4 px-6 flex flex-row items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <CardTitle className="text-base font-semibold text-slate-800">Allergies</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {(patient.allergies as { name: string; reaction: string; severity: string }[]).length === 0
              ? <p className="p-6 text-sm text-slate-400 italic text-center">None reported</p>
              : <ul className="divide-y divide-slate-100">
                  {(patient.allergies as { name: string; reaction: string; severity: string }[]).map((a, i) => (
                    <li key={i} className="p-4 hover:bg-slate-50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-slate-900">{a.name}</span>
                        <Badge variant={a.severity === "Severe" ? "destructive" : "secondary"} className="text-xs capitalize">{a.severity}</Badge>
                      </div>
                      <p className="text-sm text-slate-500">Reaction: {a.reaction}</p>
                    </li>
                  ))}
                </ul>
            }
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm overflow-hidden h-full">
          <CardHeader className="bg-blue-50/40 border-b border-slate-100 py-4 px-6 flex flex-row items-center gap-2">
            <Syringe className="w-4 h-4 text-blue-500" />
            <CardTitle className="text-base font-semibold text-slate-800">Medications</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {(patient.medications as { name: string; dose: string; frequency: string; route: string; prescriber: string; reason: string }[]).length === 0
              ? <p className="p-6 text-sm text-slate-400 italic text-center">None reported</p>
              : <ul className="divide-y divide-slate-100">
                  {(patient.medications as { name: string; dose: string; frequency: string; route: string; prescriber: string; reason: string }[]).map((m, i) => (
                    <li key={i} className="p-4 hover:bg-slate-50">
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="font-semibold text-slate-900">{m.name}</span>
                        <span className="text-xs font-medium text-primary bg-blue-50 px-2 py-0.5 rounded">{m.dose} · {m.route}</span>
                      </div>
                      <p className="text-sm text-slate-600">{m.frequency}</p>
                      <p className="text-xs text-slate-400 mt-1">{m.reason} — {m.prescriber}</p>
                    </li>
                  ))}
                </ul>
            }
          </CardContent>
        </Card>
      </div>

      {/* Conditions + Surgeries */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-sm overflow-hidden h-full">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6 flex flex-row items-center gap-2">
            <HeartPulse className="w-4 h-4 text-slate-500" />
            <CardTitle className="text-base font-semibold text-slate-800">Medical Conditions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {(patient.conditions as { name: string; diagnosedDate: string | null; status: string; notes: string | null }[]).length === 0
              ? <p className="p-6 text-sm text-slate-400 italic text-center">None reported</p>
              : <ul className="divide-y divide-slate-100">
                  {(patient.conditions as { name: string; diagnosedDate: string | null; status: string; notes: string | null }[]).map((c, i) => (
                    <li key={i} className="p-4 hover:bg-slate-50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-slate-900">{c.name}</span>
                        <Badge variant={c.status === "Active" ? "default" : "secondary"} className="text-xs">{c.status}</Badge>
                      </div>
                      {c.diagnosedDate && <p className="text-xs text-slate-500 mb-1">Diagnosed: {c.diagnosedDate}</p>}
                      {c.notes && <p className="text-sm text-slate-600 bg-slate-50 rounded p-2 mt-1">{c.notes}</p>}
                    </li>
                  ))}
                </ul>
            }
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm overflow-hidden h-full">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6 flex flex-row items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-500" />
            <CardTitle className="text-base font-semibold text-slate-800">Surgeries &amp; Procedures</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {(patient.surgeries as { procedure: string; date: string | null; facility: string | null }[]).length === 0
              ? <p className="p-6 text-sm text-slate-400 italic text-center">None reported</p>
              : <ul className="divide-y divide-slate-100">
                  {(patient.surgeries as { procedure: string; date: string | null; facility: string | null }[]).map((s, i) => (
                    <li key={i} className="p-4 hover:bg-slate-50">
                      <p className="font-medium text-slate-900 mb-1">{s.procedure}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        {s.date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{s.date}</span>}
                        {s.facility && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{s.facility}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
            }
          </CardContent>
        </Card>
      </div>

      {/* Immunizations + Family History */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-sm overflow-hidden h-full">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6 flex flex-row items-center gap-2">
            <FlaskConical className="w-4 h-4 text-slate-500" />
            <CardTitle className="text-base font-semibold text-slate-800">Immunizations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {(patient.immunizations as { vaccine: string; date: string }[]).length === 0
              ? <p className="p-6 text-sm text-slate-400 italic text-center">None recorded</p>
              : <ul className="divide-y divide-slate-100">
                  {(patient.immunizations as { vaccine: string; date: string }[]).map((imm, i) => (
                    <li key={i} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50">
                      <span className="text-sm text-slate-800">{imm.vaccine}</span>
                      <span className="text-xs text-slate-400">{imm.date}</span>
                    </li>
                  ))}
                </ul>
            }
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm overflow-hidden h-full">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6 flex flex-row items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <CardTitle className="text-base font-semibold text-slate-800">Family History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {(patient.familyHistory as { relation: string; condition: string }[]).length === 0
              ? <p className="p-6 text-sm text-slate-400 italic text-center">None recorded</p>
              : <ul className="divide-y divide-slate-100">
                  {(patient.familyHistory as { relation: string; condition: string }[]).map((fh, i) => (
                    <li key={i} className="px-4 py-3 flex items-start gap-3 hover:bg-slate-50">
                      <Badge variant="outline" className="text-xs mt-0.5 flex-shrink-0">{fh.relation}</Badge>
                      <span className="text-sm text-slate-700">{fh.condition}</span>
                    </li>
                  ))}
                </ul>
            }
          </CardContent>
        </Card>
      </div>

      {/* Social History */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
          <CardTitle className="text-base font-semibold text-slate-800">Social History</CardTitle>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-sm">
          <Row label="Smoking / Tobacco" value={patient.socialHistory.smoking} />
          <Row label="Alcohol Use" value={patient.socialHistory.alcohol} />
          <Row label="Occupation" value={patient.socialHistory.occupation} />
          <Row label="Exercise" value={patient.socialHistory.exercise} />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, mono, className }: { label: string; value: string; mono?: boolean; className?: string }) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-2 text-sm mb-1.5">
      <span className="text-slate-500 truncate">{label}</span>
      <span className={`font-medium text-slate-800 ${mono ? "font-mono" : ""} ${className ?? ""}`}>{value || "—"}</span>
    </div>
  );
}

export default function Provider() {
  const searchParams = new URLSearchParams(window.location.search);
  const codeParam = searchParams.get("code") ?? "";

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
    return (
      <Layout>
        <div className="mb-6 flex justify-end">
          <Button variant="outline" size="sm" onClick={() => { setActiveCode(""); setInputCode(""); }} className="text-slate-500">
            Close Record
          </Button>
        </div>
        <PatientRecord data={data} />
      </Layout>
    );
  }

  const errInfo = isError ? getErrorMessage(error) : null;

  return (
    <Layout>
      <div className="max-w-md mx-auto mt-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="border-slate-200 shadow-md">
          <CardHeader className="text-center pb-4 pt-8">
            <div className="w-12 h-12 bg-blue-50 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <CardTitle className="text-2xl text-slate-800">Provider Access</CardTitle>
            <p className="text-slate-500 mt-2 text-sm px-6">
              Enter the 6-digit code shared by the patient to access their intake form.
            </p>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-col items-center">
                <Input
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={inputCode}
                  onChange={e => setInputCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-4xl tracking-[0.5em] font-mono h-20 max-w-[240px] border-slate-300 focus-visible:ring-primary shadow-sm"
                />
              </div>
              {errInfo && (
                <div className="flex flex-col gap-1 bg-destructive/10 border border-destructive/20 p-4 rounded-md animate-in fade-in">
                  <div className="flex items-center gap-2 text-destructive font-medium text-sm">
                    {errInfo.icon}{errInfo.heading}
                  </div>
                  <p className="text-sm text-slate-600 pl-6">{errInfo.body}</p>
                </div>
              )}
              <Button type="submit" size="lg" className="w-full text-base font-medium h-12 shadow-sm"
                disabled={inputCode.replace(/\D/g, "").length !== 6 || isLoading}>
                {isLoading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                Access Record
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
