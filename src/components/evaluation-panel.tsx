"use client";

import { OBJECTIVE_LABEL, type BuildEvaluation } from "@/lib/engine";
import { CompatibilityList, InsightList, ProgressBar, ScoreReadout, TONE_UI } from "./ui";

/** Parecer da IA sobre uma build montada pelo usuário ou lida de um PDF. */
export function EvaluationPanel({ evaluation, resolutionLabel }: { evaluation: BuildEvaluation; resolutionLabel: string }) {
  const tone = TONE_UI[evaluation.verdict.tone];
  const failing = evaluation.checks.filter((check) => !check.ok).length;

  return (
    <div className="space-y-4">
      {/* Veredito */}
      <div className={`border border-l-4 border-line bg-surface p-4 ${tone.rule}`}>
        <p className={`label-mono ${tone.text}`}>Parecer da IA · [{tone.tag}]</p>
        <p className="mt-1.5 font-semibold">{evaluation.verdict.title}</p>
        <p className="mt-0.5 text-sm text-muted">{evaluation.verdict.text}</p>
      </div>

      {evaluation.overall !== null && (
        <section className="border border-line bg-surface p-4">
          <h3 className="mb-4 text-sm font-semibold">Serve para o que você quer?</h3>
          <div className="flex items-start gap-6">
            <ScoreReadout score={evaluation.overall} label="nota geral" />
            <div className="flex-1 space-y-3">
              {evaluation.fits.map((fit) => (
                <div key={fit.objective}>
                  <div className="mb-1 flex justify-between gap-2 text-xs">
                    <span className="text-muted">{OBJECTIVE_LABEL[fit.objective]}</span>
                    <span className="shrink-0 font-mono">
                      {fit.score} · {fit.label}
                    </span>
                  </div>
                  <ProgressBar value={fit.score} />
                </div>
              ))}
            </div>
          </div>
          {(evaluation.fpsEstimate !== null || evaluation.bottleneck !== null) && (
            <dl className="mt-5 grid grid-cols-2 border-t border-line pt-3 text-xs">
              <div>
                <dt className="label-mono text-subtle">FPS em AAA</dt>
                <dd className="mt-0.5 font-mono font-semibold">{evaluation.fpsEstimate !== null ? `~${evaluation.fpsEstimate} · ${resolutionLabel}` : "—"}</dd>
              </div>
              <div>
                <dt className="label-mono text-subtle">Gargalo CPU/GPU</dt>
                <dd className="mt-0.5 font-mono font-semibold">{evaluation.bottleneck === null ? "—" : evaluation.bottleneck <= 0.1 ? "Baixo" : `~${Math.round(evaluation.bottleneck * 100)}%`}</dd>
              </div>
            </dl>
          )}
        </section>
      )}

      {evaluation.checks.length > 0 && (
        <section className="border border-line bg-surface p-4">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold">Compatibilidade</h3>
            <span className={`label-mono ${failing === 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>{failing === 0 ? "Tudo certo" : `${failing} falha(s)`}</span>
          </div>
          <CompatibilityList checks={evaluation.checks} />
        </section>
      )}

      {evaluation.tips.length > 0 && (
        <section className="border border-line bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold">O que a IA recomenda</h3>
          <InsightList insights={evaluation.tips} />
        </section>
      )}
    </div>
  );
}
