import type { FitReport, FitStatus } from "@/lib/fit";

const STATUS_UI: Record<FitStatus, { tag: string; text: string }> = {
  adequado: { tag: "Adequado", text: "text-emerald-700 dark:text-emerald-400" },
  excesso: { tag: "Excesso", text: "text-copper" },
  insuficiente: { tag: "Insuficiente", text: "text-rose-600 dark:text-rose-400" },
};

/** Peça por peça: adequada, em excesso ou insuficiente para o uso. */
export function FitPanel({ report, justification = false }: { report: FitReport; justification?: boolean }) {
  const { excess, insufficient } = report;
  const summary = excess + insufficient === 0 ? "Tudo dentro da referência" : [excess > 0 && `${excess} em excesso`, insufficient > 0 && `${insufficient} insuficiente(s)`].filter(Boolean).join(" · ");

  return (
    <div className="space-y-4">
      <section className="border border-line bg-surface p-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold">Adequação ao uso</h3>
          <span className={`label-mono ${excess + insufficient === 0 ? STATUS_UI.adequado.text : "text-copper"}`}>{summary}</span>
        </div>
        <ul className="divide-y divide-line border-t border-line">
          {report.items.map((item) => (
            <li key={item.category} className="py-2.5">
              <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm font-medium">
                <span>
                  {item.label} <span className="font-mono text-xs font-normal text-muted">· {item.value}</span>
                </span>
                <span className={`label-mono ${STATUS_UI[item.status].text}`}>[{STATUS_UI[item.status].tag}]</span>
              </p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{item.detail}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-subtle">Faixas de referência definidas pelo SmartBuild para cada setor.</p>
      </section>

      {justification && (
        <section className="border border-line bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold">Justificativa técnica</h3>
          <ul className="space-y-1.5 text-[13px] leading-relaxed text-muted">
            {report.justification.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
