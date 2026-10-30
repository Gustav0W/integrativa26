"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CircleCheck, CircuitBoard, CodeXml, Cpu, DraftingCompass, Fan, Gamepad2, Gpu, GraduationCap, HardDrive, Info, MemoryStick, Monitor, TriangleAlert, Zap } from "lucide-react";
import { BUDGET_MAX, BUDGET_MIN } from "@/lib/catalog";
import { brl, clampBudget } from "@/lib/engine";
import type { InsightTone, Objective, PartCategory, Resolution } from "@/lib/types";

/* ----------------------------------------------------------------------------
 * Cores por categoria de peça (claro / escuro)
 * --------------------------------------------------------------------------*/

export const CATEGORY_UI: Record<PartCategory, { icon: LucideIcon; text: string; box: string; bar: string }> = {
  cpu: { icon: Cpu, text: "text-violet-700 dark:text-violet-300", box: "bg-violet-100 ring-violet-200 dark:bg-violet-500/10 dark:ring-violet-500/30", bar: "bg-violet-500" },
  gpu: { icon: Gpu, text: "text-blue-700 dark:text-blue-300", box: "bg-blue-100 ring-blue-200 dark:bg-blue-500/10 dark:ring-blue-500/30", bar: "bg-blue-500" },
  mobo: { icon: CircuitBoard, text: "text-cyan-700 dark:text-cyan-300", box: "bg-cyan-100 ring-cyan-200 dark:bg-cyan-500/10 dark:ring-cyan-500/30", bar: "bg-cyan-500" },
  ram: { icon: MemoryStick, text: "text-fuchsia-700 dark:text-fuchsia-300", box: "bg-fuchsia-100 ring-fuchsia-200 dark:bg-fuchsia-500/10 dark:ring-fuchsia-500/30", bar: "bg-fuchsia-500" },
  ssd: { icon: HardDrive, text: "text-emerald-700 dark:text-emerald-300", box: "bg-emerald-100 ring-emerald-200 dark:bg-emerald-500/10 dark:ring-emerald-500/30", bar: "bg-emerald-500" },
  psu: { icon: Zap, text: "text-amber-700 dark:text-amber-300", box: "bg-amber-100 ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/30", bar: "bg-amber-500" },
  case: { icon: Fan, text: "text-zinc-700 dark:text-zinc-300", box: "bg-zinc-100 ring-zinc-200 dark:bg-zinc-500/10 dark:ring-zinc-500/30", bar: "bg-zinc-400" },
  extra: { icon: Monitor, text: "text-pink-700 dark:text-pink-300", box: "bg-pink-100 ring-pink-200 dark:bg-pink-500/10 dark:ring-pink-500/30", bar: "bg-pink-500" },
};

export const TONE_UI: Record<InsightTone, { icon: LucideIcon; text: string; box: string }> = {
  success: { icon: CircleCheck, text: "text-emerald-600 dark:text-emerald-400", box: "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/5" },
  info: { icon: Info, text: "text-blue-600 dark:text-blue-400", box: "border-blue-200 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/5" },
  warning: { icon: TriangleAlert, text: "text-amber-600 dark:text-amber-400", box: "border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/5" },
};

export const OBJECTIVES: { id: Objective; title: string; description: string; icon: LucideIcon }[] = [
  { id: "gaming", title: "Gaming", description: "Jogos em 1080p, 1440p ou 4K", icon: Gamepad2 },
  { id: "arquitetura", title: "Arquitetura & Render 3D", description: "Revit, Lumion, Blender", icon: DraftingCompass },
  { id: "dev", title: "Desenvolvimento", description: "IDEs, Docker, VMs", icon: CodeXml },
  { id: "office", title: "Home Office / Estudos", description: "Office, aulas, navegação", icon: GraduationCap },
];

/* ----------------------------------------------------------------------------
 * Primitivos
 * --------------------------------------------------------------------------*/

export const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-brand-from to-brand-to px-5 py-3 text-sm font-bold text-on-brand shadow-lg shadow-brand/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60";
export const secondaryButton =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-fg transition hover:border-brand/50 disabled:cursor-not-allowed disabled:opacity-50";
export const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-fg outline-none transition placeholder:text-subtle focus:border-brand focus:ring-2 focus:ring-brand/20";

export function PageIntro({ icon: Icon, title, description, children }: { icon: LucideIcon; title: string; description: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft">
          <Icon className="size-5 text-brand-text" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export function Panel({ title, icon: Icon, children, aside, className = "" }: { title?: string; icon?: LucideIcon; children: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-5 shadow-sm ${className}`}>
      {title && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            {Icon && <Icon className="size-4 text-brand-text" />}
            {title}
          </h2>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  return (
    <div className="grid rounded-xl bg-surface-2 p-1 ring-1 ring-line" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition ${value === option.id ? "bg-linear-to-r from-brand-from to-brand-to text-on-brand shadow" : "text-muted hover:text-fg"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function ToggleRow({ icon: Icon, label, description, checked, onChange }: { icon: LucideIcon; label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${checked ? "border-brand/50 bg-brand-soft" : "border-line bg-surface hover:border-brand/30"}`}
    >
      <Icon className={`size-4 shrink-0 ${checked ? "text-brand-text" : "text-subtle"}`} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-subtle">{description}</span>
      </span>
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-brand" : "bg-zinc-300 dark:bg-zinc-700"}`}>
        <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${checked ? "left-4.5" : "left-0.5"}`} />
      </span>
    </button>
  );
}

export function ProgressBar({ value, tone = "brand" }: { value: number; tone?: "brand" | "danger" }) {
  const color = tone === "danger" ? "bg-linear-to-r from-rose-500 to-orange-500" : "bg-linear-to-r from-brand-from to-brand-to";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2 ring-1 ring-line">
      <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function ScoreRing({ score, label, size = "lg" }: { score: number; label: string; size?: "lg" | "sm" }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className={`relative shrink-0 ${size === "lg" ? "size-28" : "size-20"}`}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="9" className="stroke-surface-2" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - Math.max(0, Math.min(100, score)) / 100)}
          className="stroke-brand transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-bold ${size === "lg" ? "text-3xl" : "text-xl"}`}>{score}</span>
        <span className="text-[10px] font-medium text-muted">{label}</span>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Campos de formulário reutilizados nas páginas
 * --------------------------------------------------------------------------*/

/** Seleção de um ou mais usos (ex.: arquitetura + gaming). */
export function ObjectivePicker({
  value,
  onChange,
  resolution,
  onResolutionChange,
  compact = false,
}: {
  value: Objective[];
  onChange: (value: Objective[]) => void;
  resolution: Resolution;
  onResolutionChange: (value: Resolution) => void;
  compact?: boolean;
}) {
  const toggle = (id: Objective) => {
    if (value.includes(id)) {
      if (value.length > 1) onChange(value.filter((o) => o !== id));
    } else onChange([...value, id]);
  };

  return (
    <div>
      <div className={`grid gap-2.5 ${compact ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}>
        {OBJECTIVES.map((item) => {
          const Icon = item.icon;
          const active = value.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => toggle(item.id)}
              aria-pressed={active}
              className={`relative flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition ${active ? "border-brand/60 bg-brand-soft" : "border-line bg-surface hover:border-brand/30"}`}
            >
              <span
                className={`absolute top-2.5 right-2.5 flex size-4 items-center justify-center rounded border text-[10px] ${active ? "border-brand bg-brand text-on-brand" : "border-line bg-surface"}`}
                aria-hidden
              >
                {active && "✓"}
              </span>
              <span className={`flex size-8 items-center justify-center rounded-lg ${active ? "bg-brand text-on-brand" : "bg-surface-2 text-muted"}`}>
                <Icon className="size-4" />
              </span>
              <span>
                <span className="block pr-4 text-sm leading-tight font-semibold">{item.title}</span>
                {!compact && <span className="mt-0.5 block text-[11px] text-subtle">{item.description}</span>}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-subtle">Pode marcar mais de um — a IA equilibra a build para todos os usos.</p>
      {value.includes("gaming") && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-muted">Resolução para jogos</p>
          <Segmented<Resolution>
            value={resolution}
            onChange={onResolutionChange}
            options={[
              { id: "1080p", label: "1080p" },
              { id: "1440p", label: "1440p" },
              { id: "4k", label: "4K" },
            ]}
          />
        </div>
      )}
    </div>
  );
}

export function BudgetField({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const clamped = clampBudget(value);
  return (
    <div>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-semibold text-subtle">R$</span>
        <input
          type="number"
          inputMode="numeric"
          min={BUDGET_MIN}
          max={BUDGET_MAX}
          step={100}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          onBlur={() => onChange(clamped)}
          aria-label="Orçamento máximo em reais"
          className={`${inputClass} pl-10 text-lg font-bold`}
        />
      </div>
      <input
        type="range"
        min={BUDGET_MIN}
        max={BUDGET_MAX}
        step={250}
        value={clamped}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label="Ajustar orçamento"
        className="mt-4 w-full cursor-pointer accent-brand"
      />
      <div className="mt-1 flex justify-between text-[11px] text-subtle">
        <span>{brl(BUDGET_MIN)}</span>
        <span>{brl(BUDGET_MAX)}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {[3000, 5000, 8000, 12000, 20000].map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${clamped === preset ? "bg-brand-soft text-brand-text ring-1 ring-brand/40" : "bg-surface-2 text-muted hover:text-fg"}`}
          >
            {preset / 1000} mil
          </button>
        ))}
      </div>
    </div>
  );
}

export function CompatibilityList({ checks }: { checks: { label: string; detail: string; ok: boolean }[] }) {
  return (
    <ul className="space-y-2">
      {checks.map((check) => (
        <li key={check.label} className="flex items-start gap-2.5 text-xs">
          {check.ok ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0 text-rose-600 dark:text-rose-400" />}
          <span className="min-w-0">
            <span className="font-semibold">{check.label}</span>
            <span className="text-muted"> · {check.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function InsightList({ insights }: { insights: { tone: InsightTone; text: string }[] }) {
  return (
    <ul className="space-y-2.5">
      {insights.map((insight) => {
        const { icon: Icon, text } = TONE_UI[insight.tone];
        return (
          <li key={insight.text} className="flex items-start gap-2.5 text-sm leading-relaxed">
            <Icon className={`mt-0.5 size-4 shrink-0 ${text}`} />
            <span>{insight.text}</span>
          </li>
        );
      })}
    </ul>
  );
}
