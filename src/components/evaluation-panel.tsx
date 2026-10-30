"use client";

import { Activity, Gauge, ShieldCheck, Target } from "lucide-react";
import { OBJECTIVE_LABEL, type BuildEvaluation } from "@/lib/engine";
import { CompatibilityList, InsightList, ProgressBar, ScoreRing, TONE_UI } from "./ui";

/** Parecer da IA sobre uma build montada pelo usuário ou lida de um PDF. */
export function EvaluationPanel({ evaluation, resolutionLabel }: { evaluation: BuildEvaluation; resolutionLabel: string }) {
  const tone = TONE_UI[evaluation.verdict.tone];
  const ToneIcon = tone.icon;
  const failing = evaluation.checks.filter((check) => !check.ok).length;

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border p-4 ${tone.box}`}>
        <div className="flex items-start gap-3">
          <ToneIcon className={`mt-0.5 size-5 shrink-0 ${tone.text}`} />
          <div>
            <p className="font-semibold">{evaluation.verdict.title}</p>
            <p className="mt-0.5 text-sm text-muted">{evaluation.verdict.text}</p>
          </div>
        </div>
      </div>

      {evaluation.overall !== null && (
        <div className="rounded-2xl border border-line bg-surface p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Gauge className="size-4 text-brand-text" />
            Serve para o que você quer?
          </h3>
          <div className="flex items-center gap-4">
            <ScoreRing score={evaluation.overall} label="geral" size="sm" />
            <div className="flex-1 space-y-2.5">
              {evaluation.fits.map((fit) => (
                <div key={fit.objective}>
                  <div className="mb-1 flex justify-between gap-2 text-xs">
                    <span className="text-muted">{OBJECTIVE_LABEL[fit.objective]}</span>
                    <span className="shrink-0 font-semibold">
                      {fit.score}/100 · {fit.label}
                    </span>
                  </div>
                  <ProgressBar value={fit.score} />
                </div>
              ))}
            </div>
          </div>
          {(evaluation.fpsEstimate !== null || evaluation.bottleneck !== null) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {evaluation.fpsEstimate !== null && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-medium">
                  <Activity className="size-3.5 text-brand-text" />~{evaluation.fpsEstimate} FPS em AAA · {resolutionLabel}
                </span>
              )}
              {evaluation.bottleneck !== null && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-medium">
                  <Target className="size-3.5 text-brand-text" />
                  {evaluation.bottleneck <= 0.1 ? "Gargalo CPU/GPU baixo" : `Gargalo de CPU ~${Math.round(evaluation.bottleneck * 100)}%`}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {evaluation.checks.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface p-4">
          <h3 className="mb-3 flex items-center justify-between gap-2 text-sm font-semibold">
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-brand-text" />
              Compatibilidade
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${failing === 0 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"}`}>
              {failing === 0 ? "Tudo certo" : `${failing} problema(s)`}
            </span>
          </h3>
          <CompatibilityList checks={evaluation.checks} />
        </div>
      )}

      {evaluation.tips.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold">O que a IA recomenda</h3>
          <InsightList insights={evaluation.tips} />
        </div>
      )}
    </div>
  );
}
