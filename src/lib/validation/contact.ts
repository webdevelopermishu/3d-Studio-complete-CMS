import { z } from "zod";

// This schema also runs in the browser (contact brief). Zod probes for `new Function` support to
// speed up parsing; the site's Content-Security-Policy forbids eval, so turn the probe off.
z.config({ jitless: true });

const opt = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));
const url = z
  .string()
  .trim()
  .max(500)
  .refine((v) => !v || /^https?:\/\/[^\s]+\.[^\s]+/i.test(v), "Enter a full link starting with https://")
  .optional()
  .or(z.literal(""));

/** Contact brief — shared by the client wizard (per-step validation) and the server action. */
export const briefSchema = z.object({
  disciplines: z.array(z.string().max(120)).min(1, "Select at least one discipline.").max(10),
  services: z.array(z.string().max(160)).min(1, "Select at least one service, or “Not sure yet”.").max(60),
  projectName: opt(160),
  description: z.string().trim().min(10, "A couple of sentences helps us understand the project.").max(5000),
  goals: opt(3000),
  deliverables: opt(3000),
  referenceUrl: url,
  budget: z.string().trim().min(1, "Choose a budget range.").max(80),
  timeline: z.string().trim().min(1, "Choose a timeline.").max(80),
  stage: opt(80),
  filesUrl: url,
  name: z.string().trim().min(2, "Enter your name.").max(120),
  email: z.email("Enter a valid email address.").max(200),
  company: opt(160),
  phone: opt(60),
  location: opt(120),
  contactPref: opt(40),
  notes: opt(3000),
  /** Honeypot — must stay empty */
  website: z.string().max(0).optional().or(z.literal("")),
});
export type BriefInput = z.infer<typeof briefSchema>;

export const BRIEF_STEPS: { title: string; hint: string; fields: (keyof BriefInput)[] }[] = [
  { title: "Which disciplines does your project need?", hint: "Select one or more.", fields: ["disciplines"] },
  { title: "What do you need?", hint: "Pick the services you need, or choose “Not sure yet”.", fields: ["services"] },
  { title: "Tell us about the project", hint: "A few lines are enough to start the conversation.", fields: ["projectName", "description", "goals", "deliverables", "referenceUrl"] },
  { title: "Budget and timing", hint: "This helps us suggest the right approach. The quote follows once we've read the brief.", fields: ["budget", "timeline", "stage", "filesUrl"] },
  { title: "How do we reach you?", hint: "We reply within two business days.", fields: ["name", "email", "company", "phone", "location", "contactPref", "notes"] },
];
