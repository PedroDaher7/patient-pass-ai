import { useRef, useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  User, Stethoscope, QrCode, Brain, ArrowRight, Check,
  ClipboardList, Lock, Sparkles, History, FileCheck,
  AlertCircle, Bell, BarChart3, RefreshCw, Clock, Heart,
  Shield, Server, Network, Cpu, Globe, GitMerge,
} from "lucide-react";

// ─── Animation helper ─────────────────────────────────────────────────────────
function FadeIn({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: React.ElementType;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-7"} ${className}`}
    >
      {children}
    </Tag>
  );
}

// ─── Hero Flow Diagram ────────────────────────────────────────────────────────
function HeroFlow() {
  return (
    <div className="w-full max-w-xl mx-auto my-10 md:my-12 px-2">
      <div className="flex items-start justify-center gap-2 sm:gap-4">

        {/* Patient node */}
        <div className="flex flex-col items-center gap-2 flex-1 max-w-[100px]">
          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-md flex items-center justify-center">
            <User className="w-6 h-6 text-slate-600" strokeWidth={1.5} />
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center leading-tight">Patient</span>
        </div>

        {/* Arrow 1 */}
        <div className="flex items-center mt-5 flex-shrink-0">
          <div className="w-6 sm:w-10 h-px bg-gradient-to-r from-slate-200 to-blue-300" />
          <ArrowRight className="w-3 h-3 text-blue-400 -ml-1 flex-shrink-0" />
        </div>

        {/* CarePass AI center node */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-blue-500 to-blue-700 shadow-xl shadow-blue-300/50 flex items-center justify-center ring-4 ring-blue-100">
            <Brain className="w-8 h-8 text-white" strokeWidth={1.5} />
          </div>
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">CarePass AI</span>
          {/* Share options */}
          <div className="flex gap-2 mt-1">
            <div className="bg-white border border-slate-100 rounded-xl px-2.5 py-2 shadow-sm flex flex-col items-center gap-1">
              <QrCode className="w-5 h-5 text-slate-500" strokeWidth={1.5} />
              <span className="text-[9px] text-slate-400 leading-none">QR code</span>
            </div>
            <div className="bg-white border border-slate-100 rounded-xl px-2.5 py-2 shadow-sm flex flex-col items-center gap-1">
              <span className="text-xs font-bold font-mono text-slate-700 leading-none tracking-wider">300</span>
              <span className="text-xs font-bold font-mono text-slate-700 leading-none tracking-wider">593</span>
              <span className="text-[9px] text-slate-400 leading-none mt-0.5">6-digit code</span>
            </div>
          </div>
        </div>

        {/* Arrow 2 */}
        <div className="flex items-center mt-5 flex-shrink-0">
          <div className="w-6 sm:w-10 h-px bg-gradient-to-r from-blue-300 to-slate-200" />
          <ArrowRight className="w-3 h-3 text-blue-400 -ml-1 flex-shrink-0" />
        </div>

        {/* Provider node */}
        <div className="flex flex-col items-center gap-2 flex-1 max-w-[100px]">
          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-md flex items-center justify-center">
            <Stethoscope className="w-6 h-6 text-slate-600" strokeWidth={1.5} />
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center leading-tight">Provider</span>
        </div>

      </div>
    </div>
  );
}

// ─── Reusable components ──────────────────────────────────────────────────────
function TrustBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 shadow-sm rounded-full px-3.5 py-1.5">
      <span className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
        <Check className="w-2.5 h-2.5 text-blue-600" strokeWidth={3} />
      </span>
      {children}
    </span>
  );
}

function FeatureCard({ icon: Icon, title, body }: { icon: React.ElementType; title: string; body: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col gap-4 shadow-sm hover:shadow-md hover:border-blue-100 transition-all duration-200 group">
      <div className="w-10 h-10 rounded-xl bg-blue-50 group-hover:bg-blue-100 transition-colors flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-blue-600" strokeWidth={1.5} />
      </div>
      <div>
        <h3 className="font-semibold text-slate-900 text-sm leading-snug mb-1.5">{title}</h3>
        <p className="text-slate-500 text-sm leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function ProblemCard({ icon: Icon, title, body, color }: { icon: React.ElementType; title: string; body: string; color: string }) {
  return (
    <div className={`rounded-2xl border p-6 flex flex-col gap-3 ${color}`}>
      <div className="w-9 h-9 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]" strokeWidth={1.5} />
      </div>
      <div>
        <p className="font-bold text-sm mb-1">{title}</p>
        <p className="text-sm leading-relaxed opacity-80">{body}</p>
      </div>
    </div>
  );
}

function ArchCard({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="border border-white/10 rounded-2xl px-5 py-4 flex items-center gap-3 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-blue-400" strokeWidth={1.5} />
      </div>
      <span className="text-sm font-medium text-white/80">{title}</span>
    </div>
  );
}

function CapabilityItem({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-blue-600" strokeWidth={1.5} />
      </div>
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </div>
  );
}

function CaregiverBenefit({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-slate-600">
      <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
        <Check className="w-3 h-3 text-blue-600" strokeWidth={3} />
      </div>
      {children}
    </div>
  );
}

// ─── Section heading helper ───────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 border border-blue-100 px-3.5 py-1.5 rounded-full mb-5">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
      {children}
    </div>
  );
}

// ─── Main Landing Page ────────────────────────────────────────────────────────
export default function Landing() {
  return (
    <div className="min-h-dvh bg-white flex flex-col font-sans text-slate-900 antialiased">

      {/* ════════════════════════════════════════════ NAV */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100/80 px-6 md:px-10 py-4 flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight text-primary">CarePass AI</span>
        <nav className="hidden md:flex items-center gap-6 text-sm text-slate-500">
          <a href="#solution" className="hover:text-slate-900 transition-colors">Product</a>
          <a href="#how-it-works" className="hover:text-slate-900 transition-colors">How it works</a>
          <a href="#families" className="hover:text-slate-900 transition-colors">Families</a>
          <a href="#future" className="hover:text-slate-900 transition-colors">Enterprise</a>
        </nav>
        <Link href="/provider">
          <Button variant="outline" size="sm" className="text-xs h-9 border-slate-200 hover:border-primary hover:text-primary transition-colors">
            Provider access
          </Button>
        </Link>
      </header>

      <main className="flex-1 flex flex-col">

        {/* ════════════════════════════════════════════ HERO */}
        <section className="relative overflow-hidden px-6 md:px-10 pt-16 md:pt-24 pb-16 md:pb-20 text-center bg-gradient-to-b from-white via-blue-50/30 to-white">
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-100/30 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-3xl mx-auto">
            {/* Announce pill */}
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both">
              <SectionLabel>The healthcare intake passport</SectionLabel>
            </div>

            <h1 className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both delay-75 text-4xl sm:text-5xl md:text-6xl lg:text-[4rem] font-extrabold leading-[1.08] tracking-tight mb-6">
              Your health intake pass,{" "}
              <span className="text-primary">always current and ready to share.</span>
            </h1>

            <p className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both delay-150 text-lg md:text-xl text-slate-500 leading-relaxed mb-8 max-w-2xl mx-auto">
              CarePass AI gives you one secure health intake profile you maintain once and share with any doctor, clinic, or hospital in seconds — by QR code or a temporary access code.
            </p>

            {/* Hero visual */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both delay-200">
              <HeroFlow />
            </div>

            {/* Trust badges */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both delay-300 flex flex-wrap items-center justify-center gap-2.5 mb-10">
              <TrustBadge>Patient controlled</TrustBadge>
              <TrustBadge>Secure sharing</TrustBadge>
              <TrustBadge>AI assisted</TrustBadge>
              <TrustBadge>Integration ready</TrustBadge>
            </div>

            {/* CTA buttons */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both delay-400 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/patient">
                <Button size="lg" className="w-full sm:w-auto text-base h-14 px-10 gap-2.5 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-shadow">
                  Create my CarePass
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/provider">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto text-base h-14 px-10 border-2 border-slate-200 text-slate-700 hover:border-primary hover:text-primary hover:bg-blue-50/50 transition-all"
                >
                  I'm a provider
                </Button>
              </Link>
            </div>
            <p className="animate-in fade-in duration-700 fill-mode-both delay-500 text-sm text-slate-400 mt-4">
              No sign-up or login required.
            </p>
          </div>
        </section>

        {/* ════════════════════════════════════════════ PROBLEM */}
        <section className="px-6 md:px-10 py-16 md:py-24 bg-white border-t border-slate-100">
          <div className="max-w-5xl mx-auto">
            <FadeIn className="text-center mb-4">
              <SectionLabel>The problem</SectionLabel>
            </FadeIn>
            <FadeIn delay={50} className="text-center mb-5">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                Healthcare still starts<br className="hidden sm:block" /> with a clipboard.
              </h2>
            </FadeIn>
            <FadeIn delay={100} className="text-center mb-14">
              <p className="text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto">
                Every new doctor, specialist, urgent care, imaging center, or hospital asks for the same things again. Medications, allergies, surgeries, insurance, emergency contacts, history. When you cannot remember it all, mistakes slip in — and for older patients, caregivers, and anyone managing several conditions, it is stressful and easy to get wrong.
              </p>
            </FadeIn>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FadeIn delay={0}>
                <ProblemCard
                  icon={RefreshCw}
                  title="Repeated forms"
                  body="You enter the same information dozens of times across your life — at every new provider, every visit to a new system."
                  color="bg-rose-50 border-rose-100 text-rose-900"
                />
              </FadeIn>
              <FadeIn delay={80}>
                <ProblemCard
                  icon={AlertCircle}
                  title="Manual errors"
                  body="Missed medications and allergies create real risk. A hurried handoff or misread form can result in an adverse event."
                  color="bg-amber-50 border-amber-100 text-amber-900"
                />
              </FadeIn>
              <FadeIn delay={130}>
                <ProblemCard
                  icon={Clock}
                  title="Lost time"
                  body="Patients and staff burn time re-entering data. Intake shouldn't take 20 minutes of form-filling before every appointment."
                  color="bg-sky-50 border-sky-100 text-sky-900"
                />
              </FadeIn>
              <FadeIn delay={180}>
                <ProblemCard
                  icon={Heart}
                  title="Caregiver burden"
                  body="Families struggle to keep medical details organized for aging parents or loved ones managing multiple conditions."
                  color="bg-violet-50 border-violet-100 text-violet-900"
                />
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════ SOLUTION */}
        <section id="solution" className="px-6 md:px-10 py-16 md:py-24 bg-gradient-to-b from-slate-50 to-white border-t border-slate-100">
          <div className="max-w-5xl mx-auto">
            <FadeIn className="text-center mb-4">
              <SectionLabel>The solution</SectionLabel>
            </FadeIn>
            <FadeIn delay={50} className="text-center mb-2">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                Meet CarePass AI
              </h2>
            </FadeIn>
            <FadeIn delay={100} className="text-center mb-4">
              <p className="text-xl font-semibold text-primary">The healthcare intake passport.</p>
            </FadeIn>
            <FadeIn delay={130} className="text-center mb-14">
              <p className="text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto">
                A patient-owned intake profile that holds what nearly every provider asks for before treatment. Maintain it once, then share it securely with a QR code or temporary access code. One profile, one update, unlimited visits.
              </p>
            </FadeIn>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: ClipboardList,  title: "Unified intake profile",           body: "Every field providers ask for — medications, allergies, conditions, insurance, surgeries, consents — in one organized place." },
                { icon: QrCode,         title: "Secure sharing",                   body: "Generate a temporary QR code or 6-digit access code before your appointment. Share in seconds, on any device." },
                { icon: Lock,           title: "Patient-controlled access",         body: "You decide who sees your information and for how long. Revoke any code instantly. Your data never leaves your control." },
                { icon: Sparkles,       title: "AI intake review",                  body: "CarePass flags missing information and writes a clinician-ready summary the moment your provider opens your record." },
                { icon: History,        title: "Audit trail",                       body: "See exactly when your information was shared and viewed. Full visibility into who accessed your record and when." },
                { icon: FileCheck,      title: "Provider-ready data",               body: "Clean, standardized intake arrives before it reaches their system — no manual re-entry, no decoding handwriting." },
              ].map((f, i) => (
                <FadeIn key={f.title} delay={i * 60}>
                  <FeatureCard icon={f.icon} title={f.title} body={f.body} />
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════ HOW IT WORKS */}
        <section id="how-it-works" className="px-6 md:px-10 py-16 md:py-24 bg-white border-t border-slate-100">
          <div className="max-w-4xl mx-auto">
            <FadeIn className="text-center mb-4">
              <SectionLabel>How it works</SectionLabel>
            </FadeIn>
            <FadeIn delay={50} className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                Intake in three simple steps.
              </h2>
            </FadeIn>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 relative">
              {/* Connecting line on desktop */}
              <div className="hidden md:block absolute top-10 left-[calc(33.33%+16px)] right-[calc(33.33%+16px)] h-px bg-gradient-to-r from-blue-200 via-blue-300 to-blue-200" />

              {[
                {
                  n: "01",
                  icon: ClipboardList,
                  title: "Create your CarePass",
                  body: "Enter your health intake and update it whenever something changes. Your medication changed, new allergy, new provider — update once, everywhere.",
                  cta: "Create my CarePass",
                  href: "/patient",
                },
                {
                  n: "02",
                  icon: QrCode,
                  title: "Share securely",
                  body: "Generate a QR code or 6-digit access code before your appointment. Hand it to the front desk or scan it yourself. Expires automatically.",
                  cta: null,
                  href: null,
                },
                {
                  n: "03",
                  icon: Stethoscope,
                  title: "Provider reviews",
                  body: "Your provider opens a standardized intake in seconds, on any device, with no app to install. Instant AI summary included.",
                  cta: "Provider view",
                  href: "/provider",
                },
              ].map((step, i) => (
                <FadeIn key={step.n} delay={i * 120} className="flex flex-col gap-5">
                  <div className="flex items-center gap-4">
                    <div className="relative z-10 w-20 h-20 rounded-3xl bg-blue-50 border-2 border-blue-100 flex flex-col items-center justify-center gap-1 flex-shrink-0 shadow-sm">
                      <step.icon className="w-7 h-7 text-blue-600" strokeWidth={1.5} />
                      <span className="text-[10px] font-black text-blue-400 tracking-widest leading-none">{step.n}</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg mb-2">{step.title}</h3>
                    <p className="text-slate-500 text-base leading-relaxed">{step.body}</p>
                  </div>
                  {step.cta && step.href && (
                    <Link href={step.href}>
                      <Button variant="outline" size="sm" className="text-xs h-8 border-slate-200 gap-1.5 w-fit">
                        {step.cta} <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  )}
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════ FOR FAMILIES */}
        <section id="families" className="px-6 md:px-10 py-16 md:py-24 bg-gradient-to-br from-blue-50/60 via-white to-blue-50/30 border-t border-slate-100">
          <div className="max-w-5xl mx-auto">
            <FadeIn className="mb-4">
              <SectionLabel>For families</SectionLabel>
            </FadeIn>
            <FadeIn delay={50} className="mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight max-w-xl">
                Built for families too.
              </h2>
            </FadeIn>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_1px_1fr] gap-8 md:gap-12">
              {/* Story */}
              <FadeIn delay={100}>
                <div className="space-y-5">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-blue-100 shadow-md flex items-center justify-center">
                    <User className="w-7 h-7 text-blue-600" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-lg mb-3">Meet Robert.</p>
                    <p className="text-slate-600 leading-relaxed">
                      Robert is 74 and recently moved closer to his daughter. He takes several medications, has multiple allergies, and sees three specialists.
                    </p>
                    <p className="text-slate-600 leading-relaxed mt-3">
                      Instead of redoing forms at every visit, his daughter keeps his CarePass current. When Robert sees a new cardiologist, everything is organized, complete, and ready to share — without a single clipboard.
                    </p>
                  </div>
                  <Link href="/patient">
                    <Button size="sm" className="h-10 px-6 text-sm gap-2 shadow-sm shadow-primary/20">
                      Start a CarePass
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </FadeIn>

              {/* Divider */}
              <div className="hidden md:block bg-slate-100" />

              {/* Benefits */}
              <FadeIn delay={200}>
                <div>
                  <p className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-6">Caregiver benefits</p>
                  <div className="space-y-4">
                    <CaregiverBenefit>Support aging parents and loved ones</CaregiverBenefit>
                    <CaregiverBenefit>Reduce paperwork stress at every visit</CaregiverBenefit>
                    <CaregiverBenefit>Keep medications and allergies current</CaregiverBenefit>
                    <CaregiverBenefit>Avoid missing critical information</CaregiverBenefit>
                    <CaregiverBenefit>Simplify specialist visits</CaregiverBenefit>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════ AI */}
        <section className="px-6 md:px-10 py-16 md:py-24 bg-white border-t border-slate-100">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
              {/* Left: text */}
              <div>
                <FadeIn className="mb-4">
                  <SectionLabel>AI-powered</SectionLabel>
                </FadeIn>
                <FadeIn delay={50} className="mb-4">
                  <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                    AI that helps patients stay prepared.
                  </h2>
                </FadeIn>
                <FadeIn delay={100} className="mb-8">
                  <p className="text-slate-500 text-lg leading-relaxed">
                    CarePass reviews the profile, flags missing or outdated details, scores completeness, and writes provider-ready summaries — all from the intake data you've already provided.
                  </p>
                </FadeIn>
                <FadeIn delay={150}>
                  <p className="text-xs text-slate-400 leading-relaxed border border-slate-100 rounded-xl p-4 bg-slate-50">
                    <span className="font-semibold text-slate-500">Disclaimer:</span> CarePass AI does not provide medical diagnosis, treatment recommendations, or clinical decision support.
                  </p>
                </FadeIn>
              </div>

              {/* Right: capabilities */}
              <FadeIn delay={200}>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-2 divide-y divide-slate-50">
                  <CapabilityItem icon={BarChart3}   label="Completeness scoring" />
                  <CapabilityItem icon={AlertCircle} label="Missing-field detection" />
                  <CapabilityItem icon={FileCheck}   label="Provider-ready summaries" />
                  <CapabilityItem icon={Bell}         label="Patient-friendly reminders" />
                  <CapabilityItem icon={History}      label="Recent-change tracking" />
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════ BUILT FOR THE FUTURE */}
        <section id="future" className="px-6 md:px-10 py-16 md:py-28 bg-slate-900 relative overflow-hidden">
          {/* Ambient glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-blue-600/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-800/10 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-5xl mx-auto">
            <FadeIn className="mb-4">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 px-3.5 py-1.5 rounded-full mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                Built for enterprise
              </div>
            </FadeIn>
            <FadeIn delay={50} className="mb-6">
              <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight max-w-2xl">
                The missing front door to healthcare intake.
              </h2>
            </FadeIn>
            <FadeIn delay={100} className="mb-12">
              <p className="text-slate-300 text-lg leading-relaxed max-w-2xl">
                CarePass works alongside providers, not instead of them. It improves the quality and consistency of intake before it ever reaches a provider system — including Oracle Health. Oracle acquired Cerner, now Oracle Health, which makes CarePass the natural patient-side front door that feeds clean, standardized intake straight into the EHR.
              </p>
            </FadeIn>

            {/* Architecture cards */}
            <FadeIn delay={150} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
              <ArchCard icon={User}      title="Patient portal" />
              <ArchCard icon={Globe}     title="Provider access gateway" />
              <ArchCard icon={FileCheck} title="Consent management" />
              <ArchCard icon={Shield}    title="Audit and compliance layer" />
              <ArchCard icon={Cpu}       title="AI intake review engine" />
              <ArchCard icon={Network}   title="Integration API layer" />
            </FadeIn>

            <FadeIn delay={200} className="col-span-full">
              <ArchCard icon={Server} title="OCI security foundation" />
            </FadeIn>

            {/* Callout */}
            <FadeIn delay={250} className="mt-8">
              <div className="inline-block border border-blue-500/30 rounded-2xl bg-blue-500/10 px-6 py-4">
                <p className="text-white font-semibold text-sm">
                  Not an EHR replacement.{" "}
                  <span className="text-blue-400">The clean front door to it.</span>
                </p>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ════════════════════════════════════════════ FINAL CTA */}
        <section className="px-6 md:px-10 py-16 md:py-24 bg-gradient-to-b from-white to-blue-50/50 border-t border-slate-100 text-center">
          <div className="max-w-2xl mx-auto">
            <FadeIn className="mb-4">
              <SectionLabel>Get started today</SectionLabel>
            </FadeIn>
            <FadeIn delay={50} className="mb-5">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
                What if you never had to fill out the same health forms again?
              </h2>
            </FadeIn>
            <FadeIn delay={100} className="mb-10">
              <p className="text-xl text-slate-500">
                One secure profile. Every provider. Every visit.
              </p>
            </FadeIn>
            <FadeIn delay={150} className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/patient">
                <Button size="lg" className="w-full sm:w-auto text-base h-14 px-10 gap-2.5 shadow-lg shadow-primary/25 hover:shadow-xl transition-shadow">
                  Create my CarePass
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/provider">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto text-base h-14 px-10 border-2 border-slate-200 text-slate-700 hover:border-primary hover:text-primary hover:bg-blue-50/50 transition-all"
                >
                  I'm a provider
                </Button>
              </Link>
            </FadeIn>
            <FadeIn delay={200}>
              <p className="text-sm text-slate-400 mt-4">No sign-up or login required.</p>
            </FadeIn>
          </div>
        </section>

        {/* ════════════════════════════════════════════ FOOTER */}
        <footer className="border-t border-slate-100 px-6 md:px-10 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-bold text-base tracking-tight text-primary">CarePass AI</span>
          <span className="text-sm text-slate-400 text-center">
            Healthcare intake made simple, secure, and patient controlled.
          </span>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <Link href="/patient" className="hover:text-primary transition-colors">Patient</Link>
            <Link href="/provider" className="hover:text-primary transition-colors">Provider</Link>
          </div>
        </footer>

      </main>
    </div>
  );
}
