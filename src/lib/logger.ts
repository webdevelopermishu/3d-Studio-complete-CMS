/** Minimal structured logger: JSON lines in production, readable lines in development. */
type Level = "debug" | "info" | "warn" | "error";
const prod = process.env.NODE_ENV === "production";

function log(level: Level, event: string, data?: Record<string, unknown>) {
  if (level === "debug" && prod) return;
  const entry = { ts: new Date().toISOString(), level, event, ...data };
  const line = prod ? JSON.stringify(entry) : `[${level}] ${event}${data ? " " + JSON.stringify(data) : ""}`;
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(line);
}

export const logger = {
  debug: (e: string, d?: Record<string, unknown>) => log("debug", e, d),
  info: (e: string, d?: Record<string, unknown>) => log("info", e, d),
  warn: (e: string, d?: Record<string, unknown>) => log("warn", e, d),
  error: (e: string, d?: Record<string, unknown>) => log("error", e, d),
};
