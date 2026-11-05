import type { ReactNode } from "react";
import { CATEGORY_LABEL, brl } from "@/lib/engine";
import { neutralSpecItems } from "@/lib/fit";
import { brlCents } from "@/lib/public-purchase";
import type { BuildResult } from "@/lib/types";
import { FitPanel } from "./fit-panel";
import { CompatibilityList } from "./ui";

function Block({ index, title, aside, children }: { index: string; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="border border-line bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">
          <span className="mr-2 font-mono text-xs text-brand-text">{index}</span>
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Parecer técnico: a resposta completa da IA em uma única leitura. */
export function TechnicalReport({ result }: { result: BuildResult }) {
  const { fit, input } = result;
  if (!fit) return null;
  const allOk = result.compatibility.every((check) => check.ok);

  return (
    <div className="space-y-4">
      <Block index="01" title="Necessidade identificada">
        <p className="text-sm text-muted">{fit.useDescription}</p>
        {input.softwares.length > 0 && <p className="mt-1 text-sm text-muted">Programas informados: {input.softwares.join(", ")}.</p>}
        <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {fit.items.map((item) => (
            <div key={item.category} className="flex items-baseline justify-between gap-3 text-[13px]">
              <dt className="text-subtle">{item.label}</dt>
              <dd className="text-right font-mono text-xs">{item.reference}</dd>
            </div>
          ))}
        </dl>
      </Block>

      <Block index="02" title="Configuração recomendada" aside={<span className="font-mono text-sm font-semibold">{brl(result.total)}</span>}>
        <ul className="divide-y divide-line border-t border-line">
          {result.parts.map((part) => (
            <li key={part.category} className="grid gap-x-4 py-2 sm:grid-cols-[9rem_1fr_auto]">
              <span className="label-mono text-subtle">{CATEGORY_LABEL[part.category].split(" (")[0]}</span>
              <span className="min-w-0 text-[13px]">{part.name}</span>
              <span className="font-mono text-xs text-muted sm:text-right">{part.price > 0 ? brl(part.price) : "Incluso"}</span>
            </li>
          ))}
        </ul>
      </Block>

      <FitPanel report={fit} title="Acima ou abaixo da necessidade" index="03" />

      <Block index="04" title="Compatibilidade entre componentes" aside={<span className={`label-mono ${allOk ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>{allOk ? "100% compatível" : "Revisar"}</span>}>
        <CompatibilityList checks={result.compatibility} />
      </Block>

      <Block index="05" title="Justificativa técnica">
        <ul className="space-y-1.5 text-[13px] leading-relaxed text-muted">
          {fit.justification.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Block>

      <Block index="06" title="Especificação para aquisição, sem marca">
        <ul className="divide-y divide-line border-t border-line">
          {neutralSpecItems(result.parts).map((item) => (
            <li key={item.label} className="grid gap-x-4 gap-y-0.5 py-2 sm:grid-cols-[1fr_auto]">
              <span className="min-w-0 text-[13px]">{item.spec}</span>
              <span className="font-mono text-xs text-muted sm:text-right">{item.unitPrice > 0 ? brlCents(item.unitPrice) : "Incluso"}</span>
            </li>
          ))}
        </ul>
      </Block>
    </div>
  );
}
