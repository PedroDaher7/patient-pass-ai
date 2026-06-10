import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useValidateCode } from "@workspace/api-client-react";
import { AlertCircle, Loader2, Calendar, FileText, Syringe, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Provider() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const codeParam = searchParams.get("code");

  const [inputCode, setInputCode] = useState(codeParam || "");
  const [activeCode, setActiveCode] = useState(codeParam || "");

  // Clear URL params without reloading to make it look clean
  useEffect(() => {
    if (codeParam) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [codeParam]);

  const { data, isLoading, error, isError } = useValidateCode(activeCode, {
    query: { enabled: !!activeCode, retry: false }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.length === 6) {
      setActiveCode(inputCode);
    }
  };

  if (!data) {
    return (
      <Layout>
        <div className="max-w-md mx-auto mt-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-slate-200 shadow-md">
            <CardHeader className="text-center pb-4 pt-8">
              <div className="w-12 h-12 bg-blue-50 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6" />
              </div>
              <CardTitle className="text-2xl text-slate-800">Provider Access</CardTitle>
              <p className="text-slate-500 mt-2 text-sm px-6">Enter the 6-digit code shared by the patient to securely access their intake form.</p>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex flex-col items-center">
                  <Input 
                    type="text" 
                    placeholder="000000" 
                    maxLength={6}
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))}
                    className="text-center text-4xl tracking-[0.5em] font-mono h-20 max-w-[240px] border-slate-300 focus-visible:ring-primary shadow-sm"
                  />
                </div>
                {isError && (
                  <div className="flex items-center justify-center text-sm text-destructive gap-2 bg-destructive/10 p-3 rounded-md animate-in fade-in">
                    <AlertCircle className="w-4 h-4" />
                    Invalid or expired code
                  </div>
                )}
                <Button type="submit" size="lg" className="w-full text-base font-medium h-12 shadow-sm" disabled={inputCode.length !== 6 || isLoading}>
                  {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                  Access Record
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const patient = data.patient;

  return (
    <Layout>
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 animate-in fade-in duration-500">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
            {patient.firstName} {patient.lastName}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-slate-600 font-medium">
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-slate-400" /> DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}</span>
            <span className="text-slate-300">&bull;</span>
            <span>{patient.gender}</span>
            <span className="text-slate-300">&bull;</span>
            <span className="text-slate-500 text-sm">Last updated: {new Date(patient.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
        <Button variant="outline" onClick={() => { setActiveCode(""); setInputCode(""); }} className="text-slate-500">
          Close Record
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both">
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
            <CardTitle className="text-lg font-semibold text-slate-800">Contact & Insurance</CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Patient Contact</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-[100px_1fr] text-sm"><span className="text-slate-500">Phone</span><span className="font-medium">{patient.phone}</span></div>
                <div className="grid grid-cols-[100px_1fr] text-sm"><span className="text-slate-500">Email</span><span className="font-medium">{patient.email}</span></div>
                <div className="grid grid-cols-[100px_1fr] text-sm"><span className="text-slate-500">Address</span><span className="font-medium">{patient.address}</span></div>
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Insurance Details</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-[100px_1fr] text-sm"><span className="text-slate-500">Plan</span><span className="font-medium text-primary">{patient.insurance.plan}</span></div>
                <div className="grid grid-cols-[100px_1fr] text-sm"><span className="text-slate-500">Member ID</span><span className="font-mono text-slate-700">{patient.insurance.memberId}</span></div>
                <div className="grid grid-cols-[100px_1fr] text-sm"><span className="text-slate-500">Group</span><span className="font-mono text-slate-700">{patient.insurance.group}</span></div>
                <div className="grid grid-cols-[100px_1fr] text-sm"><span className="text-slate-500">Provider Ph</span><span className="font-medium">{patient.insurance.phone}</span></div>
              </div>
            </div>
            <div className="md:col-span-2 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Emergency Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="text-sm"><span className="text-slate-500 block mb-1">Name</span><span className="font-medium">{patient.emergencyContact.name}</span></div>
                 <div className="text-sm"><span className="text-slate-500 block mb-1">Relationship</span><span className="font-medium">{patient.emergencyContact.relationship}</span></div>
                 <div className="text-sm"><span className="text-slate-500 block mb-1">Phone</span><span className="font-medium">{patient.emergencyContact.phone}</span></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="border-slate-200 shadow-sm overflow-hidden h-full">
            <CardHeader className="bg-rose-50/30 border-b border-slate-100 py-4 px-6 flex flex-row items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              <CardTitle className="text-lg font-semibold text-slate-800">Allergies</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {patient.allergies.length === 0 ? (
                <div className="p-8 text-center text-slate-500 italic text-sm">No known allergies reported.</div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {patient.allergies.map((a, i) => (
                    <li key={i} className="p-5 flex justify-between items-start hover:bg-slate-50 transition-colors">
                      <div>
                        <div className="font-medium text-slate-900 text-base">{a.name}</div>
                        <div className="text-sm text-slate-600 mt-1">Reaction: {a.reaction}</div>
                      </div>
                      <Badge variant={a.severity.toLowerCase() === 'severe' ? 'destructive' : 'secondary'} className="capitalize mt-0.5">
                        {a.severity}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          
          <Card className="border-slate-200 shadow-sm overflow-hidden h-full">
            <CardHeader className="bg-blue-50/30 border-b border-slate-100 py-4 px-6 flex flex-row items-center gap-2">
              <Syringe className="w-5 h-5 text-blue-500" />
              <CardTitle className="text-lg font-semibold text-slate-800">Medications</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {patient.medications.length === 0 ? (
                <div className="p-8 text-center text-slate-500 italic text-sm">No current medications reported.</div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {patient.medications.map((m, i) => (
                    <li key={i} className="p-5 hover:bg-slate-50 transition-colors">
                      <div className="flex items-baseline justify-between mb-1">
                        <div className="font-semibold text-slate-900">{m.name}</div>
                        <div className="text-sm font-medium text-primary bg-blue-50 px-2 py-0.5 rounded">{m.dose}</div>
                      </div>
                      <div className="text-sm text-slate-600 mb-1">{m.frequency}</div>
                      {m.prescriber && <div className="text-xs text-slate-400">Prescribed by {m.prescriber}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="border-slate-200 shadow-sm overflow-hidden h-full">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
              <CardTitle className="text-lg font-semibold text-slate-800">Medical Conditions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {patient.conditions.length === 0 ? (
                <div className="p-8 text-center text-slate-500 italic text-sm">No medical conditions reported.</div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {patient.conditions.map((c, i) => (
                    <li key={i} className="p-5 hover:bg-slate-50 transition-colors">
                      <div className="font-medium text-slate-900 mb-1">{c.name}</div>
                      {c.diagnosedDate && <div className="text-sm text-slate-500 mb-2">Diagnosed: {new Date(c.diagnosedDate).toLocaleDateString()}</div>}
                      {c.notes && <div className="text-sm bg-slate-50 border border-slate-100 p-3 rounded-md text-slate-700 leading-relaxed">{c.notes}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm overflow-hidden h-full">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
              <CardTitle className="text-lg font-semibold text-slate-800">Surgeries & Procedures</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {patient.surgeries.length === 0 ? (
                <div className="p-8 text-center text-slate-500 italic text-sm">No past surgeries reported.</div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {patient.surgeries.map((s, i) => (
                    <li key={i} className="p-5 hover:bg-slate-50 transition-colors">
                      <div className="font-medium text-slate-900 mb-1">{s.procedure}</div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
                        {s.date && <div className="text-sm text-slate-500 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{new Date(s.date).toLocaleDateString()}</div>}
                        {s.hospital && <div className="text-sm text-slate-500 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />{s.hospital}</div>}
                      </div>
                      {s.notes && <div className="text-sm text-slate-600 mt-2">{s.notes}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </Layout>
  );
}
