"use client";

import { ViewTransition, startTransition, useRef, useState } from "react";
import { Copy, Download, RotateCcw, X } from "lucide-react";
import { CATEGORY_LABEL, RESOLUTION_LABEL, brl, buildSummaryText, objectivesLabel, scoreLabel } from "@/lib/engine";
import type { BuildResult } from "@/lib/types";
import { PartCard } from "./part-card";
import { CATEGORY_UI, CompatibilityList, InsightList, ProgressBar, ScoreReadout, secondaryButton } from "./ui";

type Tab = "parts" | "health" | "tips";

const TABS: { id: Tab; label: string }[] = [
  { id: "parts", label: "Peças" },
  { id: "health", label: "Compatibilidade & desempenho" },
  { id: "tips", label: "Dicas da IA" },
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

/** Resultado de uma recomendação: cabeçalho enxuto + detalhes em abas. */
export function BuildResultView({ result, onRegenerate }: { result: BuildResult; onRegenerate?: () => void }) {
  const [tab, setTabState] = useState<Tab>("parts");
  /** Dentro de startTransition para o React animar a troca de aba (crossfade). */
  const setTab = (next: Tab) => startTransition(() => setTabState(next));
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { input } = result;
  const allOk = result.compatibility.every((check) => check.ok);
  const usedPct = (result.total / result.budget) * 100;
  const remaining = result.budget - result.total;
  const bottleneckPct = Math.round(result.bottleneck * 100);
  const gaming = input.objectives.includes("gaming");
  const paidParts = result.parts.filter((part) => part.price > 0);

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
    <div className="space-y-5">
      {/* Cabeçalho da build */}
      <div className="border border-ink/80 bg-surface">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="label-mono text-subtle">
              Build {result.tier} · {result.platform} · {result.source === "api" ? `Textos por ${result.aiModel ?? "Gemini"}` : "Motor local (offline)"}
            </p>
            <p className="mt-2 font-mono text-4xl font-semibold tracking-tight">{brl(result.total)}</p>
            <p className="mt-1 text-sm text-muted">
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
              Exportar
            </button>
            {onRegenerate && (
              <button type="button" onClick={onRegenerate} className={secondaryButton}>
                <RotateCcw className="size-3.5" />
                Regenerar
              </button>
            )}
          </div>
        </div>

        {/* Três leituras rápidas, separadas por linhas */}
        <div className="grid divide-y divide-line border-t border-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <button type="button" onClick={() => setTab("health")} className="p-4 text-left transition hover:bg-surface-2">
            <span className="label-mono block text-subtle">Compatibilidade</span>
            <span className={`mt-1.5 block font-mono text-sm font-semibold ${allOk ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              {allOk ? `${result.compatibility.length}/${result.compatibility.length} verificações OK` : "Revisar peças"}
            </span>
          </button>
          <div className="p-4">
            <span className="label-mono flex justify-between text-subtle">
              Orçamento
              <span className={remaining >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>{remaining >= 0 ? `sobra ${brl(remaining)}` : `+${brl(-remaining)}`}</span>
            </span>
            <span className="mt-1.5 mb-2 block font-mono text-sm font-semibold">
              {usedPct.toFixed(0)}% de {brl(result.budget)}
            </span>
            <ProgressBar value={usedPct} tone={result.overBudget ? "danger" : "brand"} />
          </div>
          <button type="button" onClick={() => setTab("health")} className="p-4 text-left transition hover:bg-surface-2">
            <span className="label-mono block text-subtle">Desempenho p/ seu uso</span>
            <span className="mt-1.5 block font-mono text-sm font-semibold">
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

      {/* Abas sublinhadas */}
      <div className="flex gap-6 overflow-x-auto border-b border-line [scrollbar-width:none]" role="tablist">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`-mb-px shrink-0 border-b-2 pb-2.5 font-mono text-[11px] font-medium tracking-[0.08em] whitespace-nowrap uppercase transition ${tab === id ? "border-brand text-fg" : "border-transparent text-subtle hover:text-fg"}`}
          >
            {label}
            {id === "tips" && <span className="ml-1.5 text-brand-text">({result.insights.length})</span>}
          </button>
        ))}
      </div>

      <ViewTransition key={tab} enter="tab-fade" exit="tab-fade" default="none">
        <div>
          {tab === "parts" && (
            <div className="grid gap-4 md:grid-cols-2">
              {result.parts.map((part, index) => (
                <PartCard key={part.category} part={part} index={index} />
              ))}
            </div>
          )}

          {tab === "health" && (
            <div className="grid gap-4 md:grid-cols-2">
              <section className="border border-line bg-surface p-4">
                <div className="mb-3 flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold">Verificador de compatibilidade</h3>
                  <span className={`label-mono ${allOk ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>{allOk ? "100% compatível" : "Revisar"}</span>
                </div>
                <CompatibilityList checks={result.compatibility} />
              </section>

              <section className="border border-line bg-surface p-4">
                <h3 className="mb-4 text-sm font-semibold">Estimativa de desempenho</h3>
                <div className="flex items-start gap-6">
                  <ScoreReadout score={result.score} label={scoreLabel(result.score)} />
                  <div className="flex-1 space-y-3">
                    {result.performance.map((metric) => (
                      <div key={metric.label}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="text-muted">{metric.label}</span>
                          <span className="font-mono">{metric.value}</span>
                        </div>
                        <ProgressBar value={metric.value} />
                      </div>
                    ))}
                  </div>
                </div>
                {gaming && (
                  <dl className="mt-5 grid grid-cols-2 border-t border-line pt-3 text-xs">
                    <div>
                      <dt className="label-mono text-subtle">FPS em AAA</dt>
                      <dd className="mt-0.5 font-mono font-semibold">{result.fpsEstimate !== null ? `~${result.fpsEstimate} · ${RESOLUTION_LABEL[input.resolution]}` : "—"}</dd>
                    </div>
                    <div>
                      <dt className="label-mono text-subtle">Gargalo CPU/GPU</dt>
                      <dd className="mt-0.5 font-mono font-semibold">{bottleneckPct <= 10 ? "Baixo" : `~${bottleneckPct}%`}</dd>
                    </div>
                  </dl>
                )}
              </section>

              <section className="border border-line bg-surface p-4 md:col-span-2">
                <h3 className="mb-3 text-sm font-semibold">Para onde vai o dinheiro</h3>
                <div className="flex h-3 w-full gap-0.5">
                  {paidParts.map((part) => (
                    <div key={part.category} className={`h-full ${CATEGORY_UI[part.category].bar}`} style={{ width: `${(part.price / result.total) * 100}%` }} title={`${CATEGORY_LABEL[part.category]}: ${brl(part.price)}`} />
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-4">
                  {paidParts.map((part) => (
                    <div key={part.category} className="flex items-center gap-2 font-mono text-[11px] text-muted">
                      <span className={`size-2 shrink-0 ${CATEGORY_UI[part.category].bar}`} />
                      {CATEGORY_UI[part.category].code}
                      <span className="ml-auto text-fg">{Math.round((part.price / result.total) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {tab === "tips" && (
            <section className="border border-line bg-surface p-5">
              <p className="label-mono mb-2 text-subtle">Como a IA entendeu o pedido</p>
              <p className="mb-5 font-mono text-xs text-muted">{result.interpretation.join("  ·  ")}</p>
              <InsightList insights={result.insights} />
              <p className="mt-5 border-t border-line pt-3 text-[11px] text-subtle">Preços estimados de referência do mercado brasileiro. Use os links de busca para conferir o menor preço do dia.</p>
            </section>
          )}
        </div>
      </ViewTransition>

      {toast && (
        <div className="fixed right-4 bottom-4 left-4 z-50 flex items-center gap-3 border border-ink bg-ink px-4 py-3 font-mono text-xs text-canvas sm:left-auto">
          <span className="text-copper">●</span>
          <span className="flex-1">{toast}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Fechar aviso" className="opacity-60 hover:opacity-100">
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

/** Carregamento em estilo de log de terminal. */
export function LoadingState({ step, steps = LOADING_STEPS }: { step: number; steps?: string[] }) {
  return (
    <div className="border border-ink/80 bg-surface">
      <div className="label-mono flex items-center justify-between border-b border-line px-4 py-2 text-subtle">
        <span>smartbuild — análise</span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 animate-pulse bg-copper" />
          processando
        </span>
      </div>
      <ul className="space-y-2 p-5 font-mono text-[13px]">
        {steps.map((label, index) => (
          <li key={label} className={`flex gap-3 ${index <= step ? "text-fg" : "text-subtle/60"}`}>
            <span className="text-brand-text">&gt;</span>
            <span className="flex-1">
              {label}
              {index === step && <span className="ml-1 inline-block h-3.5 w-2 translate-y-0.5 animate-pulse bg-brand" />}
            </span>
            <span className={index < step ? "text-emerald-700 dark:text-emerald-400" : "text-subtle/60"}>{index < step ? "[ OK ]" : index === step ? "[ .. ]" : "[    ]"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
