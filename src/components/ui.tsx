"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CircuitBoard, CodeXml, Cpu, DraftingCompass, Fan, Gamepad2, Gpu, GraduationCap, HardDrive, MemoryStick, Monitor, Zap } from "lucide-react";
import { BUDGET_MAX, BUDGET_MIN } from "@/lib/catalog";
import { brl, clampBudget } from "@/lib/engine";
import type { InsightTone, Objective, PartCategory, Resolution } from "@/lib/types";

/* ----------------------------------------------------------------------------
 * Categorias de peça: código curto (estilo ficha técnica) + cor da barra de custo
 * --------------------------------------------------------------------------*/

export const CATEGORY_UI: Record<PartCategory, { icon: LucideIcon; code: string; bar: string }> = {
  cpu: { icon: Cpu, code: "CPU", bar: "bg-brand" },
  gpu: { icon: Gpu, code: "GPU", bar: "bg-copper" },
  mobo: { icon: CircuitBoard, code: "MB", bar: "bg-ink" },
  ram: { icon: MemoryStick, code: "RAM", bar: "bg-brand/55" },
  ssd: { icon: HardDrive, code: "SSD", bar: "bg-copper/55" },
  psu: { icon: Zap, code: "PSU", bar: "bg-ink/45" },
  case: { icon: Fan, code: "CASE", bar: "bg-subtle/60" },
  extra: { icon: Monitor, code: "EXT", bar: "bg-brand/25" },
};

export const TONE_UI: Record<InsightTone, { tag: string; text: string; rule: string }> = {
  success: { tag: "OK", text: "text-emerald-700 dark:text-emerald-400", rule: "border-l-emerald-700 dark:border-l-emerald-400" },
  info: { tag: "INFO", text: "text-muted", rule: "border-l-ink/50" },
  warning: { tag: "ATENÇÃO", text: "text-copper", rule: "border-l-copper" },
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

export { inputClass, primaryButton, secondaryButton } from "./styles";

/** Cabeçalho de página: rótulo técnico + título largo + descrição curta. */
export function PageIntro({ code, title, description, children }: { code: string; title: string; description: string; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-ink/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="label-mono text-brand-text">Ferramenta {code}</p>
        <h1 className="heading mt-2 text-3xl sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted">{description}</p>
      </div>
      {children}
    </div>
  );
}

/** Aviso sobre o uso do conteúdo enviado ao Gemini (plano gratuito). */
export function PrivacyNote() {
  return (
    <p className="mb-6 border border-line bg-surface px-4 py-2.5 text-xs text-muted" role="note">
      <strong className="font-semibold text-ink">Privacidade:</strong> o que você escreve ou envia aqui é processado pela API gratuita do Google Gemini, e o Google pode usar esse conteúdo para melhorar os produtos dele. Não envie dados pessoais, CPF ou informações sensíveis.
    </p>
  );
}

/** Bloco com cabeçalho numerado, como uma seção de ficha técnica. */
export function Panel({ index, title, children, aside, className = "" }: { index?: string; title?: string; children: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <section className={`border border-line bg-surface ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <h2 className="flex items-baseline gap-2.5 text-sm font-semibold">
            {index && <span className="font-mono text-[11px] font-medium text-brand-text">{index}</span>}
            {title}
          </h2>
          {aside}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  return (
    <div className="grid gap-0.5 border border-line bg-surface-2 p-0.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={`px-2 py-1.5 font-mono text-[11px] font-medium tracking-wide uppercase transition ${value === option.id ? "bg-ink text-canvas" : "text-muted hover:text-fg"}`}
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
      className={`flex w-full items-center gap-3 border p-3 text-left transition ${checked ? "border-brand bg-brand-soft" : "border-line hover:border-ink/40"}`}
    >
      <Icon className={`size-4 shrink-0 ${checked ? "text-brand-text" : "text-subtle"}`} strokeWidth={1.75} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-subtle">{description}</span>
      </span>
      {/* Chave liga/desliga quadrada */}
      <span className={`relative h-5 w-9 shrink-0 border transition ${checked ? "border-brand bg-brand" : "border-ink/40 bg-surface-2"}`}>
        <span className={`absolute top-0.5 size-3.5 transition-all ${checked ? "left-4.5 bg-on-brand" : "left-0.5 bg-ink/60"}`} />
      </span>
    </button>
  );
}

/** Medidor em segmentos, como uma barra de LEDs. */
export function ProgressBar({ value, tone = "brand", segments = 24 }: { value: number; tone?: "brand" | "danger"; segments?: number }) {
  const filled = Math.round((Math.max(0, Math.min(100, value)) / 100) * segments);
  const on = tone === "danger" ? "bg-rose-600 dark:bg-rose-500" : "bg-brand";
  return (
    <div className="flex h-2.5 w-full gap-0.5" role="meter" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      {Array.from({ length: segments }, (_, i) => (
        <span key={i} className={`flex-1 transition-colors duration-500 ${i < filled ? on : "bg-surface-2"}`} />
      ))}
    </div>
  );
}

/** Leitura numérica grande da nota (0–100). */
export function ScoreReadout({ score, label, caption }: { score: number; label: string; caption?: string }) {
  return (
    <div className="shrink-0">
      {caption && <p className="label-mono text-subtle">{caption}</p>}
      <p className="font-mono text-4xl leading-none font-semibold tracking-tight">
        {score}
        <span className="text-base font-normal text-subtle">/100</span>
      </p>
      <p className="label-mono mt-1.5 text-brand-text">{label}</p>
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
    <div className="@container">
      {/* 4 colunas só quando o próprio bloco é largo o bastante (não a tela inteira) */}
      <div className={`grid gap-2 ${compact ? "grid-cols-2 @xl:grid-cols-4" : "grid-cols-2"}`}>
        {OBJECTIVES.map((item) => {
          const Icon = item.icon;
          const active = value.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => toggle(item.id)}
              aria-pressed={active}
              className={`flex min-w-0 flex-col items-start gap-2.5 border p-3 text-left transition ${active ? "border-brand bg-brand-soft" : "border-line hover:border-ink/40"}`}
            >
              <span className="flex w-full items-center justify-between">
                <Icon className={`size-4 ${active ? "text-brand-text" : "text-subtle"}`} strokeWidth={1.75} />
                <span className={`flex size-3.5 items-center justify-center border text-[9px] leading-none ${active ? "border-brand bg-brand text-on-brand" : "border-ink/40"}`} aria-hidden>
                  {active && "✓"}
                </span>
              </span>
              <span>
                <span className="block text-sm leading-tight font-semibold hyphens-auto [overflow-wrap:anywhere]">{item.title}</span>
                {!compact && <span className="mt-1 block text-[11px] text-subtle">{item.description}</span>}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-subtle">Pode marcar mais de um — a IA equilibra a build para todos os usos.</p>
      {value.includes("gaming") && (
        <div className="mt-4">
          <p className="label-mono mb-2 text-subtle">Resolução para jogos</p>
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

const BUDGET_TICKS = [2000, 5000, 10000, 15000, 20000];

export function BudgetField({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const clamped = clampBudget(value);
  return (
    <div>
      <div className="flex items-baseline gap-2 border-b border-ink/70 pb-1 focus-within:border-brand">
        <span className="font-mono text-lg text-subtle">R$</span>
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
          className="w-full bg-transparent font-mono text-3xl font-semibold tracking-tight outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
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
        className="mt-5 w-full cursor-pointer accent-brand"
      />
      {/* Régua com marcações */}
      <div className="relative mt-1 h-5">
        {BUDGET_TICKS.map((tick) => {
          const left = ((tick - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * 100;
          return (
            <button
              key={tick}
              type="button"
              onClick={() => onChange(tick)}
              style={{ left: `${left}%` }}
              className={`absolute -translate-x-1/2 font-mono text-[10px] transition first:translate-x-0 last:-translate-x-full ${clamped === tick ? "text-brand-text" : "text-subtle hover:text-fg"}`}
              title={`Usar ${brl(tick)}`}
            >
              {tick / 1000}k
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Lista de verificações como linhas de tabela com status. */
export function CompatibilityList({ checks }: { checks: { label: string; detail: string; ok: boolean }[] }) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {checks.map((check) => (
        <li key={check.label} className="flex items-start gap-3 py-2 text-xs">
          <span className="label-mono w-24 shrink-0 pt-px text-subtle">{check.label}</span>
          <span className="min-w-0 flex-1 text-muted">{check.detail}</span>
          <span className={`label-mono shrink-0 pt-px ${check.ok ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>{check.ok ? "OK" : "Falha"}</span>
        </li>
      ))}
    </ul>
  );
}

export function InsightList({ insights }: { insights: { tone: InsightTone; text: string }[] }) {
  return (
    <ul className="space-y-3">
      {insights.map((insight) => {
        const tone = TONE_UI[insight.tone];
        return (
          <li key={insight.text} className="flex items-baseline gap-3 text-sm leading-relaxed">
            <span className={`label-mono w-16 shrink-0 ${tone.text}`}>[{tone.tag}]</span>
            <span>{insight.text}</span>
          </li>
        );
      })}
    </ul>
  );
}
