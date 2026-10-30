"use client";

import { useRef, useState } from "react";
import { Activity, Bot, CircleCheck, Copy, Download, Gauge, Lightbulb, ListChecks, Package, RotateCcw, ShieldCheck, Target, TriangleAlert, Wallet, X } from "lucide-react";
import { CATEGORY_LABEL, RESOLUTION_LABEL, brl, buildSummaryText, objectivesLabel, scoreLabel } from "@/lib/engine";
import type { BuildResult } from "@/lib/types";
import { PartCard } from "./part-card";
import { CATEGORY_UI, CompatibilityList, InsightList, ProgressBar, ScoreRing, secondaryButton } from "./ui";

type Tab = "parts" | "health" | "tips";

const TABS: { id: Tab; label: string; icon: typeof Package }[] = [
  { id: "parts", label: "Peças", icon: Package },
  { id: "health", label: "Compatibilidade & desempenho", icon: ListChecks },
  { id: "tips", label: "Dicas da IA", icon: Lightbulb },
];

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Resultado de uma recomendação: resumo enxuto + detalhes em abas. */
export function BuildResultView({ result, onRegenerate }: { result: BuildResult; onRegenerate?: () => void }) {
  const [tab, setTab] = useState<Tab>("parts");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { input } = result;
  const allOk = result.compatibility.every((check) => check.ok);
  const usedPct = (result.total / result.budget) * 100;
  const remaining = result.budget - result.total;
  const bottleneckPct = Math.round(result.bottleneck * 100);
  const gaming = input.objectives.includes("gaming");

  const showToast = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const handleExport = () => {
    downloadText(`smartbuild-orcamento-${result.total}.txt`, buildSummaryText(result));
    showToast("Resumo do orçamento exportado (.txt)");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildSummaryText(result));
      showToast("Resumo copiado para a área de transferência");
    } catch {
      showToast("Não foi possível copiar — use Exportar.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="rounded-2xl border border-brand/30 bg-surface p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-brand-text uppercase">Build {result.tier}</span>
              <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] font-semibold text-muted">{result.platform}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] font-semibold text-muted">
                <Bot className="size-3" />
                {result.source === "api" ? "LLM via /api/recomendacao" : "Motor local (offline)"}
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight">{brl(result.total)}</p>
            <p className="text-sm text-muted">
              {result.parts.length} itens · {objectivesLabel(input.objectives, gaming ? input.resolution : undefined)}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button type="button" onClick={() => void handleCopy()} className={secondaryButton}>
              <Copy className="size-3.5" />
              Copiar
            </button>
            <button type="button" onClick={handleExport} className={secondaryButton}>
              <Download className="size-3.5" />
              Exportar orçamento
            </button>
            {onRegenerate && (
              <button type="button" onClick={onRegenerate} className={secondaryButton}>
                <RotateCcw className="size-3.5" />
                Regenerar
              </button>
            )}
          </div>
        </div>

        {/* Três indicadores rápidos */}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <button type="button" onClick={() => setTab("health")} className="rounded-xl bg-surface-2 p-3 text-left transition hover:ring-1 hover:ring-brand/30">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-subtle uppercase">
              <ShieldCheck className="size-3.5" /> Compatibilidade
            </span>
            <span className={`mt-1 flex items-center gap-1.5 text-sm font-bold ${allOk ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              {allOk ? <CircleCheck className="size-4" /> : <TriangleAlert className="size-4" />}
              {allOk ? "100% compatível" : "Revisar peças"}
            </span>
          </button>
          <div className="rounded-xl bg-surface-2 p-3">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-subtle uppercase">
              <Wallet className="size-3.5" /> Orçamento
            </span>
            <span className="mt-1 mb-2 block text-sm font-bold">
              {usedPct.toFixed(0)}% de {brl(result.budget)}
              <span className={`ml-1.5 text-xs font-medium ${remaining >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                {remaining >= 0 ? `sobram ${brl(remaining)}` : `${brl(-remaining)} acima`}
              </span>
            </span>
            <ProgressBar value={usedPct} tone={result.overBudget ? "danger" : "brand"} />
          </div>
          <button type="button" onClick={() => setTab("health")} className="rounded-xl bg-surface-2 p-3 text-left transition hover:ring-1 hover:ring-brand/30">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-subtle uppercase">
              <Gauge className="size-3.5" /> Desempenho para o seu uso
            </span>
            <span className="mt-1 block text-sm font-bold">
              {result.score}/100 · {scoreLabel(result.score)}
            </span>
            {result.fpsEstimate !== null && (
              <span className="text-xs text-muted">
                ~{result.fpsEstimate} FPS em AAA ({RESOLUTION_LABEL[input.resolution]} Ultra)
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-surface-2 p-1 ring-1 ring-line [scrollbar-width:none]" role="tablist">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex flex-1 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap transition ${tab === id ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"}`}
          >
            <Icon className="size-3.5" />
            {label}
            {id === "tips" && <span className="rounded-full bg-brand-soft px-1.5 text-[10px] text-brand-text">{result.insights.length}</span>}
          </button>
        ))}
      </div>

      {tab === "parts" && (
        <div className="grid gap-4 md:grid-cols-2">
          {result.parts.map((part) => (
            <PartCard key={part.category} part={part} />
          ))}
        </div>
      )}

      {tab === "health" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className={`rounded-2xl border p-5 ${allOk ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-500/5" : "border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/5"}`}>
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                Verificador de compatibilidade
              </h3>
              <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-bold text-white dark:bg-emerald-500/20 dark:text-emerald-300">{allOk ? "100% compatível" : "Revisar"}</span>
            </div>
            <CompatibilityList checks={result.compatibility} />
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Gauge className="size-4 text-brand-text" />
              Estimativa de desempenho
            </h3>
            <div className="flex items-center gap-5">
              <ScoreRing score={result.score} label={scoreLabel(result.score)} size="sm" />
              <div className="flex-1 space-y-3">
                {result.performance.map((metric) => (
                  <div key={metric.label}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-muted">{metric.label}</span>
                      <span className="font-semibold">{metric.value}/100</span>
                    </div>
                    <ProgressBar value={metric.value} />
                  </div>
                ))}
              </div>
            </div>
            {gaming && (
              <div className="mt-4 flex flex-wrap gap-2">
                {result.fpsEstimate !== null && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-medium">
                    <Activity className="size-3.5 text-brand-text" />~{result.fpsEstimate} FPS em AAA · {RESOLUTION_LABEL[input.resolution]}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-medium">
                  <Target className="size-3.5 text-brand-text" />
                  {bottleneckPct <= 10 ? "Gargalo CPU/GPU baixo" : `Gargalo de CPU ~${bottleneckPct}%`}
                </span>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5 md:col-span-2">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Wallet className="size-4 text-brand-text" />
              Para onde vai o dinheiro
            </h3>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-2">
              {result.parts
                .filter((part) => part.price > 0)
                .map((part) => (
                  <div key={part.category} className={`h-full ${CATEGORY_UI[part.category].bar}`} style={{ width: `${(part.price / result.total) * 100}%` }} title={`${CATEGORY_LABEL[part.category]}: ${brl(part.price)}`} />
                ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
              {result.parts
                .filter((part) => part.price > 0)
                .map((part) => (
                  <div key={part.category} className="flex items-center gap-1.5 text-[11px] text-muted">
                    <span className={`size-2 shrink-0 rounded-full ${CATEGORY_UI[part.category].bar}`} />
                    <span className="truncate">{CATEGORY_LABEL[part.category].split(" (")[0]}</span>
                    <span className="ml-auto font-semibold text-fg">{Math.round((part.price / result.total) * 100)}%</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {tab === "tips" && (
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="mb-2 text-[11px] font-semibold tracking-wider text-subtle uppercase">Como a IA entendeu o pedido</p>
          <div className="mb-5 flex flex-wrap gap-1.5">
            {result.interpretation.map((chip) => (
              <span key={chip} className="rounded-md bg-surface-2 px-2 py-1 text-[11px] font-medium text-muted">
                {chip}
              </span>
            ))}
          </div>
          <InsightList insights={result.insights} />
          <p className="mt-4 border-t border-line pt-3 text-[11px] text-subtle">Preços estimados de referência do mercado brasileiro. Use os links de busca para conferir o menor preço do dia.</p>
        </div>
      )}

      {toast && (
        <div className="fixed right-4 bottom-4 left-4 z-50 flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm shadow-2xl sm:left-auto">
          <CircleCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="flex-1">{toast}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Fechar aviso" className="text-subtle hover:text-fg">
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export const LOADING_STEPS = [
  "Interpretando seus usos, orçamento e pedido",
  "Cruzando sockets, chipsets e tipo de memória",
  "Calculando consumo e dimensionando a fonte",
  "Analisando gargalos entre CPU e GPU",
  "Otimizando preços dentro do orçamento",
];

export function LoadingState({ step, steps = LOADING_STEPS }: { step: number; steps?: string[] }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-brand/20 bg-surface px-6 py-14 shadow-sm">
      <div className="size-16 animate-spin rounded-full border-4 border-surface-2 border-t-brand" />
      <h2 className="mt-6 text-lg font-bold">A IA está analisando…</h2>
      <ul className="mt-6 w-full max-w-sm space-y-3">
        {steps.map((label, index) => (
          <li key={label} className={`flex items-center gap-3 text-sm transition ${index <= step ? "text-fg" : "text-subtle"}`}>
            {index < step ? (
              <CircleCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : index === step ? (
              <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-surface-2 border-t-brand" />
            ) : (
              <span className="size-4 shrink-0 rounded-full border border-line" />
            )}
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
