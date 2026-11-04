import { Download } from "lucide-react";
import { PUBLIC_DISCLAIMER, PUBLIC_RULES, brlCents } from "@/lib/public-purchase";
import type { PublicEvaluation } from "@/lib/public-purchase";
import { ProgressBar, TONE_UI, secondaryButton } from "./ui";

const STATUS_TONE = { dispensa: "success", atencao: "warning", licitacao: "warning" } as const;

/** Aba "Compra pública": caminho da compra, pontos a conferir e especificação sem marca. */
export function PublicPurchasePanel({ evaluation, onExport }: { evaluation: PublicEvaluation; onExport: () => void }) {
  const { status, quantity, purchaseTotal, yearTotal, limit, checks, items, documents } = evaluation;
  const tone = TONE_UI[STATUS_TONE[status]];
  const figures = [
    { label: `Esta compra · ${quantity} PC(s)`, value: brlCents(purchaseTotal) },
    { label: "Soma no ano", value: brlCents(yearTotal) },
    { label: `Limite ${PUBLIC_RULES.year}`, value: brlCents(limit) },
  ];

  return (
    <div className="space-y-4">
      <section className={`border border-l-4 border-line bg-surface p-4 ${tone.rule}`}>
        <p className="label-mono text-subtle">Lei 14.133/2021 · Santa Catarina</p>
        <h3 className={`heading mt-1.5 text-xl ${tone.text}`}>{evaluation.headline}</h3>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          {figures.map((figure) => (
            <div key={figure.label}>
              <dt className="label-mono text-subtle">{figure.label}</dt>
              <dd className="mt-0.5 font-mono text-sm font-semibold">{figure.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-3">
          <ProgressBar value={Math.min((yearTotal / limit) * 100, 100)} tone={status === "licitacao" ? "danger" : "brand"} />
        </div>
      </section>

      <section className="border border-line bg-surface p-4">
        <h3 className="mb-3 text-sm font-semibold">Pontos conferidos</h3>
        <ul className="space-y-3">
          {checks.map((check) => (
            <li key={check.label} className={`border-l-2 pl-3 ${TONE_UI[check.tone].rule}`}>
              <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-medium">
                <span className={`label-mono ${TONE_UI[check.tone].text}`}>[{TONE_UI[check.tone].tag}]</span>
                {check.label}
              </p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{check.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="border border-line bg-surface p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Especificação sem marca · por PC</h3>
          <button type="button" onClick={onExport} className={secondaryButton}>
            <Download className="size-3.5" />
            Baixar rascunho do termo
          </button>
        </div>
        <ul className="divide-y divide-line border-t border-line">
          {items.map((item) => (
            <li key={item.label} className="grid gap-x-4 gap-y-0.5 py-2.5 sm:grid-cols-[1fr_auto]">
              <span className="min-w-0 text-[13px]">{item.spec}</span>
              <span className="font-mono text-xs text-muted sm:text-right">
                {item.estimated && <span className="label-mono mr-1.5 text-copper">estimado</span>}
                {item.unitPrice > 0 ? brlCents(item.unitPrice) : "Incluso"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="border border-line bg-surface p-4">
        <h3 className="mb-3 text-sm font-semibold">Documentos do processo</h3>
        <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {documents.map((document) => (
            <li key={document.label} className="flex items-baseline gap-2 text-[13px] text-muted">
              <span className={`label-mono shrink-0 ${document.drafted ? "text-emerald-700 dark:text-emerald-400" : "text-subtle"}`}>{document.drafted ? "[rascunho]" : "[a fazer]"}</span>
              {document.label}
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-subtle">{PUBLIC_DISCLAIMER}</p>
    </div>
  );
}
