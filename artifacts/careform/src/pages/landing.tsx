import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ClipboardList, QrCode, Stethoscope, ArrowRight,
  Lock, Smile, Zap, CheckCircle2, RefreshCw,
} from "lucide-react";

function Step({
  number,
  icon: Icon,
  title,
  body,
}: {
  number: number;
  icon: React.ElementType;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-start gap-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
          {number}
        </div>
        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </div>
      <div>
        <h3 className="font-semibold text-slate-900 text-lg mb-1">{title}</h3>
        <p className="text-slate-500 text-base leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

const BENEFITS = [
  {
    icon: Lock,
    title: "Security you control",
    body: "Your information is encrypted and shared only through a temporary code you create. Access expires on its own, and you can revoke it at any time.",
  },
  {
    icon: Smile,
    title: "Peace of mind",
    body: "Walk into any visit knowing your full history is accurate and ready, instead of trying to remember medication names and dates in a stressful moment.",
  },
  {
    icon: Zap,
    title: "Save time",
    body: "Skip the clipboard. Check in within seconds rather than re-filling the same intake at every new office.",
  },
  {
    icon: CheckCircle2,
    title: "Fewer errors",
    body: "Standardized, patient-verified information means no misread handwriting and no manual re-typing mistakes by staff.",
  },
  {
    icon: RefreshCw,
    title: "Always up to date",
    body: "Update your medications, allergies, and conditions once, on your own time, and every provider sees the current version.",
  },
];

function BenefitCard({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-7 flex flex-col gap-4 shadow-sm hover:shadow-md hover:border-blue-100 transition-all duration-200">
      <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-primary" strokeWidth={1.75} />
      </div>
      <div>
        <h3 className="font-semibold text-slate-900 text-base mb-2 leading-snug">{title}</h3>
        <p className="text-slate-500 text-sm leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-dvh bg-white flex flex-col font-sans text-slate-900">
      {/* Header */}
      <header className="px-6 md:px-10 py-5 border-b border-slate-100">
        <span className="font-bold text-xl tracking-tight text-primary">CareForm AI</span>
      </header>

      <main className="flex-1 flex flex-col">
        {/* Hero */}
        <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16 md:py-24 bg-gradient-to-b from-white to-blue-50/60">
          <div className="max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-primary bg-blue-50 border border-blue-100 px-4 py-1.5 rounded-full mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
              Patient-controlled health records
            </div>

            <h1 className="text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight mb-6">
              One intake.{" "}
              <span className="text-primary">Any provider.</span>
              <br />
              Always yours.
            </h1>

            <p className="text-lg md:text-xl text-slate-500 leading-relaxed mb-12 max-w-xl mx-auto">
              Fill out your health intake once and share it with any clinic, ER, or specialist — whether they run Epic, Cerner, or anything else — by scanning a QR code or entering a six-digit code.
            </p>

            {/* Role buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/patient">
                <Button
                  size="lg"
                  className="w-full sm:w-auto text-base h-14 px-10 gap-2 shadow-md shadow-primary/20"
                >
                  I'm a patient
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/provider">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto text-base h-14 px-10 border-2 border-slate-200 text-slate-700 hover:border-primary hover:text-primary hover:bg-blue-50 transition-colors"
                >
                  I'm a provider
                </Button>
              </Link>
            </div>

            <p className="text-sm text-slate-400 mt-5">
              No sign-up or login required.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="bg-white border-t border-slate-100 px-6 md:px-10 py-16 md:py-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-center text-2xl md:text-3xl font-bold text-slate-900 mb-3">
              How it works
            </h2>
            <p className="text-center text-slate-500 mb-14 text-base">
              Three steps, any facility, your data stays yours.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
              <Step
                number={1}
                icon={ClipboardList}
                title="Fill out your intake once"
                body="Enter your allergies, medications, conditions, insurance details, and emergency contact — all in one place, edited whenever you need."
              />
              <Step
                number={2}
                icon={QrCode}
                title="Share with a code or QR"
                body="Generate a temporary pass. Hand the provider a six-digit code or let them scan the QR — it works on any device, no app needed."
              />
              <Step
                number={3}
                icon={Stethoscope}
                title="Provider sees the full picture"
                body="A clean read-only intake loads instantly, regardless of which EHR the facility uses. You control who gets access and when it expires."
              />
            </div>
          </div>
        </section>

        {/* Why CareForm */}
        <section className="bg-slate-50 border-t border-slate-100 px-6 md:px-10 py-16 md:py-20">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-center text-2xl md:text-3xl font-bold text-slate-900 mb-3">
              Why CareForm
            </h2>
            <p className="text-center text-slate-500 mb-14 text-base max-w-xl mx-auto">
              Built around the patient, not the paperwork.
            </p>

            {/* 3 + 2 centered grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {BENEFITS.slice(0, 3).map((b) => (
                <BenefitCard key={b.title} icon={b.icon} title={b.title} body={b.body} />
              ))}
            </div>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-5 lg:w-2/3 lg:mx-auto">
              {BENEFITS.slice(3).map((b) => (
                <BenefitCard key={b.title} icon={b.icon} title={b.title} body={b.body} />
              ))}
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="bg-primary/5 border-t border-blue-100 px-6 py-14 text-center">
          <p className="text-2xl md:text-3xl font-bold text-slate-900 mb-3 tracking-tight">
            One intake, accurate everywhere.
          </p>
          <p className="text-slate-500 mb-8 text-base">Ready to try it?</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/patient">
              <Button size="lg" className="w-full sm:w-auto px-10 h-12 gap-2 shadow-sm shadow-primary/20">
                Open my intake
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/provider">
              <Button variant="outline" size="lg" className="w-full sm:w-auto px-10 h-12 border-slate-200">
                Enter an access code
              </Button>
            </Link>
          </div>
        </section>

        <footer className="border-t border-slate-100 px-6 py-5 text-center">
          <span className="text-sm text-slate-400">
            CareForm AI &mdash; Your intake, your control.
          </span>
        </footer>
      </main>
    </div>
  );
}
