"use client";
import { createContext, useCallback, useContext, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "./ui";

type Toast = { id: number; tone: "success" | "error" | "info"; text: string };
type ConfirmReq = { title: string; body?: ReactNode; confirm?: string; danger?: boolean; resolve: (v: boolean) => void };
const Ctx = createContext<{ toast: (t: Omit<Toast, "id">) => void; confirm: (o: Omit<ConfirmReq, "resolve">) => Promise<boolean> }>({
  toast: () => {},
  confirm: async () => false,
});
export const useFeedback = () => useContext(Ctx);

/** Toasts + confirm dialog for the admin (Framer Motion for enter/exit). */
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmReq, setConfirmReq] = useState<ConfirmReq | null>(null);
  const seq = useRef(0);
  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = ++seq.current;
    setToasts((l) => [...l.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((l) => l.filter((x) => x.id !== id)), t.tone === "error" ? 6500 : 3200);
  }, []);
  const confirm = useCallback((o: Omit<ConfirmReq, "resolve">) => new Promise<boolean>((resolve) => setConfirmReq({ ...o, resolve })), []);
  const close = (v: boolean) => {
    confirmReq?.resolve(v);
    setConfirmReq(null);
  };
  return (
    <Ctx.Provider value={{ toast, confirm }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.22 }}
              className={`pointer-events-auto rounded-md px-4 py-3 text-sm shadow-lg ring-1 ${t.tone === "error" ? "bg-red-50 text-red-800 ring-red-200" : t.tone === "success" ? "bg-zinc-900 text-white ring-zinc-900" : "bg-white text-zinc-800 ring-zinc-200"}`}
              role={t.tone === "error" ? "alert" : "status"}
            >
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {confirmReq && (
          <motion.div className="fixed inset-0 z-[90] flex items-center justify-center bg-zinc-900/40 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => close(false)}>
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
              initial={{ y: 10, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.key === "Escape" && close(false)}
            >
              <h2 id="confirm-title" className="text-base font-semibold text-zinc-900">
                {confirmReq.title}
              </h2>
              {confirmReq.body && <div className="mt-2 text-sm text-zinc-600">{confirmReq.body}</div>}
              <div className="mt-5 flex justify-end gap-2">
                <Button onClick={() => close(false)}>Cancel</Button>
                <Button variant={confirmReq.danger ? "danger" : "primary"} onClick={() => close(true)} autoFocus>
                  {confirmReq.confirm ?? "Confirm"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}

type Result<T> = { ok: true; data?: T; message?: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Runs a server action with pending state, toasts, field errors and a router refresh. */
export function useAction<A extends unknown[], T>(fn: (...args: A) => Promise<Result<T>>, opts: { success?: string; refresh?: boolean } = {}) {
  const [pending, start] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { toast } = useFeedback();
  const router = useRouter();
  const run = useCallback(
    (...args: A) =>
      new Promise<Result<T>>((resolve) => {
        start(async () => {
          try {
            const res = await fn(...args);
            if (res.ok) {
              setFieldErrors({});
              if (opts.success) toast({ tone: "success", text: res.message ?? opts.success });
              if (opts.refresh !== false) router.refresh();
            } else {
              setFieldErrors(res.fieldErrors ?? {});
              toast({ tone: "error", text: res.error });
            }
            resolve(res);
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Request failed";
            toast({ tone: "error", text: msg });
            resolve({ ok: false, error: msg });
          }
        });
      }),
    [fn, opts.success, opts.refresh, router, toast],
  );
  return { run, pending, fieldErrors, setFieldErrors };
}
