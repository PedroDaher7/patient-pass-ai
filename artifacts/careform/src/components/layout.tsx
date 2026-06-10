import { useLocation } from "wouter";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const isProvider = location.startsWith("/provider");

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900 flex flex-col font-sans">
      <header className="border-b bg-white border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span className="font-bold text-xl tracking-tight text-primary">CareForm AI</span>
          {isProvider && (
            <span className="text-sm font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Provider Access</span>
          )}
        </div>
      </header>
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}
