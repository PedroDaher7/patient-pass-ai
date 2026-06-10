import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ClipboardList, QrCode, Stethoscope, ArrowRight } from "lucide-react";

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

        {/* Footer CTA */}
        <section className="bg-primary/5 border-t border-blue-100 px-6 py-12 text-center">
          <p className="text-slate-600 mb-6 text-lg font-medium">Ready to try it?</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/patient">
              <Button size="lg" className="w-full sm:w-auto px-10 h-12 gap-2">
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
