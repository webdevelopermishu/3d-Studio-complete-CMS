"use client";
import { useRef, useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { briefSchema, BRIEF_STEPS, type BriefInput } from "@/lib/validation/contact";
import { submitBrief } from "@/server/actions/contact";
import { cn } from "@/lib/utils";

type Discipline = { title: string; summary: string | null; offerings: string[] };
const NOT_SURE = "Not sure yet";

function Choice({ type, name, label, desc, checked, onChange, large }: { type: "checkbox" | "radio"; name: string; label: string; desc?: string | null; checked: boolean; onChange: () => void; large?: boolean }) {
  return (
    <label className={cn("choice", large && "choice--large")}>
      <input className="choice__input" type={type} name={name} checked={checked} onChange={onChange} />
      <span className="choice__mark" aria-hidden />
      <span className="choice__text">
        <span className="choice__label">{label}</span>
        {desc && <span className="choice__desc">{desc}</span>}
      </span>
    </label>
  );
}

function Field({ label, optional, error, children, id }: { label: string; optional?: boolean; error?: string; children: React.ReactNode; id: string }) {
  return (
    <div className={cn("field", error && "field--error")}>
      <label className="field__label t-label" htmlFor={id}>
        {label}
        {optional && <span className="field__optional"> · Optional</span>}
      </label>
      {children}
      {error && (
        <span className="field__error" id={`${id}-err`} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export function ContactBriefForm({
  disciplines,
  budgets,
  timelines,
  stages,
  successTitle,
  successBody,
}: {
  disciplines: Discipline[];
  budgets: string[];
  timelines: string[];
  stages: string[];
  successTitle: string;
  successBody: string;
}) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const form = useForm<BriefInput>({
    resolver: zodResolver(briefSchema),
    mode: "onTouched",
    defaultValues: {
      disciplines: [], services: [], projectName: "", description: "", goals: "", deliverables: "", referenceUrl: "",
      budget: "", timeline: "", stage: "", filesUrl: "", name: "", email: "", company: "", phone: "", location: "",
      contactPref: "", notes: "", website: "",
    },
  });
  const { register, control, watch, trigger, formState, handleSubmit, setValue } = form;
  const errors = formState.errors;
  const chosen = watch("disciplines");
  const meta = BRIEF_STEPS[step];
  const total = BRIEF_STEPS.length;

  const go = async (dir: 1 | -1) => {
    if (dir === 1) {
      const ok = await trigger(meta.fields as (keyof BriefInput)[], { shouldFocus: true });
      if (!ok) return;
    }
    setStep((s) => Math.min(total - 1, Math.max(0, s + dir)));
    requestAnimationFrame(() => {
      titleRef.current?.focus();
      document.getElementById("brief")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    start(async () => {
      const res = await submitBrief(values);
      if (res.ok) {
        setDone(true);
        requestAnimationFrame(() => titleRef.current?.focus());
      } else {
        setServerError(res.error);
        if (res.fieldErrors) for (const [k, v] of Object.entries(res.fieldErrors)) form.setError(k as keyof BriefInput, { message: v });
      }
    });
  });

  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const text = (name: keyof BriefInput, label: string, opts: { optional?: boolean; type?: string; area?: boolean; placeholder?: string; autoComplete?: string } = {}) => {
    const id = `brief-${name}`;
    const err = errors[name]?.message as string | undefined;
    const common = { id, className: "field__input", "aria-invalid": !!err || undefined, "aria-describedby": err ? `${id}-err` : undefined, placeholder: opts.placeholder, autoComplete: opts.autoComplete };
    return (
      <Field key={name} label={label} optional={opts.optional} error={err} id={id}>
        {opts.area ? <textarea rows={4} {...common} {...register(name)} /> : <input type={opts.type ?? "text"} {...common} {...register(name)} />}
      </Field>
    );
  };

  if (done) {
    return (
      <div className="brief-result" id="brief">
        <div className="brief__aside">
          <span className="brief__count t-label">Sent</span>
          <h2 className="brief__title" tabIndex={-1} ref={titleRef}>
            {successTitle}
          </h2>
        </div>
        <div className="brief__main">
          <p className="brief__hint brief__hint--lg">{successBody}</p>
        </div>
      </div>
    );
  }

  return (
    <form className="brief__form" id="brief" onSubmit={(e) => (step === total - 1 ? onSubmit(e) : (e.preventDefault(), go(1)))} noValidate>
      <div className="brief__aside">
        <div className="brief__progress">
          <span className="brief__count t-label">
            Step {step + 1} of {total}
          </span>
          <span className="brief__bar" aria-hidden>
            <span style={{ transform: `scaleX(${(step + 1) / total})` }} />
          </span>
        </div>
        <h2 className="brief__title" tabIndex={-1} ref={titleRef}>
          {meta.title}
        </h2>
        <p className="brief__hint">{meta.hint}</p>
      </div>

      <div className="brief__main">
        {/* Honeypot */}
        <div className="visually-hidden" aria-hidden>
          <label htmlFor="brief-website">Website</label>
          <input id="brief-website" tabIndex={-1} autoComplete="off" {...register("website")} />
        </div>

        <div className="brief__fields" key={step}>
          {step === 0 && (
            <Controller
              control={control}
              name="disciplines"
              render={({ field }) => (
                <fieldset className="brief__group" aria-invalid={!!errors.disciplines || undefined}>
                  <legend className="visually-hidden">{meta.title}</legend>
                  <div className="choices">
                    {disciplines.map((d) => (
                      <Choice
                        key={d.title}
                        type="checkbox"
                        name="disciplines"
                        large
                        label={d.title}
                        desc={d.summary}
                        checked={field.value.includes(d.title)}
                        onChange={() => {
                          const next = toggle(field.value, d.title);
                          field.onChange(next);
                          // Drop services that belong to deselected disciplines
                          const allowed = new Set(disciplines.filter((x) => next.includes(x.title)).flatMap((x) => x.offerings));
                          setValue("services", form.getValues("services").filter((s) => s === NOT_SURE || allowed.has(s)));
                        }}
                      />
                    ))}
                  </div>
                  {errors.disciplines && <span className="field__error" role="alert">{errors.disciplines.message}</span>}
                </fieldset>
              )}
            />
          )}

          {step === 1 && (
            <Controller
              control={control}
              name="services"
              render={({ field }) => (
                <div className="brief__group brief__group--services">
                  {disciplines
                    .filter((d) => chosen.includes(d.title))
                    .map((d) => (
                      <fieldset key={d.title} className="brief__group">
                        <legend className="brief__legend t-label">{d.title}</legend>
                        <div className="choices choices--grid">
                          {d.offerings.map((o) => (
                            <Choice key={o} type="checkbox" name="services" label={o} checked={field.value.includes(o)} onChange={() => field.onChange(toggle(field.value.filter((x) => x !== NOT_SURE), o))} />
                          ))}
                        </div>
                      </fieldset>
                    ))}
                  <div className="choices">
                    <Choice type="checkbox" name="services" label={NOT_SURE} checked={field.value.includes(NOT_SURE)} onChange={() => field.onChange(field.value.includes(NOT_SURE) ? [] : [NOT_SURE])} />
                  </div>
                  {errors.services && <span className="field__error" role="alert">{errors.services.message}</span>}
                </div>
              )}
            />
          )}

          {step === 2 && (
            <>
              {text("projectName", "Project or company name", { optional: true })}
              {text("description", "Describe the project", { area: true })}
              {text("goals", "What should it achieve?", { optional: true, area: true })}
              {text("deliverables", "What do you need us to create?", { optional: true, area: true })}
              {text("referenceUrl", "Reference or inspiration link", { optional: true, type: "url", placeholder: "https://" })}
            </>
          )}

          {step === 3 && (
            <>
              {(
                [
                  ["budget", "Estimated budget", budgets, false],
                  ["timeline", "Timeline", timelines, false],
                  ["stage", "Where is the project today?", stages, true],
                ] as const
              ).map(([name, label, options, optional]) => (
                <Controller
                  key={name}
                  control={control}
                  name={name}
                  render={({ field }) => (
                    <fieldset className="brief__group">
                      <legend className="brief__legend t-label">
                        {label}
                        {optional && <span className="field__optional"> · Optional</span>}
                      </legend>
                      <div className="choices choices--grid">
                        {options.map((o) => (
                          <Choice key={o} type="radio" name={name} label={o} checked={field.value === o} onChange={() => field.onChange(o)} />
                        ))}
                      </div>
                      {errors[name] && <span className="field__error" role="alert">{errors[name]?.message}</span>}
                    </fieldset>
                  )}
                />
              ))}
              {text("filesUrl", "Link to your brief, plans or files", { optional: true, type: "url", placeholder: "https://" })}
            </>
          )}

          {step === 4 && (
            <>
              <div className="brief__row">
                {text("name", "Name", { autoComplete: "name" })}
                {text("email", "Email", { type: "email", autoComplete: "email" })}
              </div>
              <div className="brief__row">
                {text("company", "Company", { optional: true, autoComplete: "organization" })}
                {text("phone", "Phone", { optional: true, type: "tel", autoComplete: "tel" })}
              </div>
              {text("location", "Country or city", { optional: true, autoComplete: "address-level2" })}
              <Controller
                control={control}
                name="contactPref"
                render={({ field }) => (
                  <fieldset className="brief__group">
                    <legend className="brief__legend t-label">
                      Preferred contact method<span className="field__optional"> · Optional</span>
                    </legend>
                    <div className="choices choices--grid">
                      {["Email", "Phone call", "Video call"].map((o) => (
                        <Choice key={o} type="radio" name="contactPref" label={o} checked={field.value === o} onChange={() => field.onChange(o)} />
                      ))}
                    </div>
                  </fieldset>
                )}
              />
              {text("notes", "Anything we should know?", { optional: true, area: true })}
            </>
          )}
        </div>

        {serverError && (
          <p className="brief__error" role="alert">
            {serverError}
          </p>
        )}
        <div className="brief__nav">
          {step > 0 && (
            <button type="button" className="brief__back t-label" onClick={() => go(-1)}>
              ← Back
            </button>
          )}
          <button type="submit" className="circle-btn" style={{ ["--circle-size" as string]: "110px" }} disabled={pending} data-magnetic>
            <span className="circle-btn__fill" aria-hidden />
            <span className="circle-btn__label">{step === total - 1 ? (pending ? "Sending…" : "Send brief") : "Next"}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
