"use client";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Toast = { id: number; kind: "success" | "error" | "info"; text: string };
const Ctx = createContext<(kind: Toast["kind"], text: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast["kind"], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,360px)] flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} role="status" className="card animate-fade-up pointer-events-auto flex items-start gap-3 px-4 py-3 text-sm">
            {t.kind === "success" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> : t.kind === "error" ? <XCircle className="mt-0.5 size-4 shrink-0 text-danger" /> : <Info className="mt-0.5 size-4 shrink-0 text-cyan" />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
