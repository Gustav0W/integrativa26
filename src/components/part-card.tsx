import { Check, ExternalLink, Fan, Search, Sparkles } from "lucide-react";
import { STORES, googleShoppingUrl } from "@/lib/catalog";
import { CATEGORY_LABEL, brl } from "@/lib/engine";
import type { RecommendedPart } from "@/lib/types";
import { CATEGORY_UI } from "./ui";

/** Links "Pesquisar menor preço" (Google Shopping) + atalhos para as lojas. */
export function PriceLinks({ terms }: { terms: string[] }) {
  const [primary, secondary] = terms;
  if (!primary) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-subtle">
        <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
        Já incluso no processador — nada a comprar.
      </p>
    );
  }
  const pill = "inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1.5 text-[11px] font-medium text-muted transition hover:border-brand/40 hover:text-fg";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <a
        href={googleShoppingUrl(primary)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand-text ring-1 ring-brand/25 transition hover:ring-brand/50"
      >
        <Search className="size-3.5" />
        Pesquisar menor preço
      </a>
      {STORES.map((store) => (
        <a key={store.id} href={store.url(primary)} target="_blank" rel="noopener noreferrer" className={pill}>
          {store.label}
          <ExternalLink className="size-3" />
        </a>
      ))}
      {secondary && (
        <a href={googleShoppingUrl(secondary)} target="_blank" rel="noopener noreferrer" className={pill}>
          <Fan className="size-3" />
          Cooler
          <ExternalLink className="size-3" />
        </a>
      )}
    </div>
  );
}

export function PartCard({ part }: { part: RecommendedPart }) {
  const ui = CATEGORY_UI[part.category];
  const Icon = ui.icon;

  return (
    <article className="flex flex-col rounded-2xl border border-line bg-surface p-4 shadow-sm transition hover:border-brand/40">
      <div className="flex items-start gap-3">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ${ui.box}`}>
          <Icon className={`size-5 ${ui.text}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-semibold tracking-wider text-subtle uppercase">{CATEGORY_LABEL[part.category]}</span>
            <span className="shrink-0 text-sm font-bold">{part.price > 0 ? brl(part.price) : "Incluso"}</span>
          </div>
          <h3 className="mt-0.5 text-sm leading-snug font-semibold">{part.name}</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {part.specs.map((spec) => (
              <span key={spec} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-muted">
                {spec}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-3 flex-1 rounded-xl bg-surface-2 p-3 text-xs leading-relaxed text-muted">
        <span className="mb-1 flex items-center gap-1 font-semibold text-brand-text">
          <Sparkles className="size-3.5" />
          Por que a IA escolheu
        </span>
        {part.reason}
      </p>

      <div className="mt-3">
        <PriceLinks terms={part.searchTerms} />
      </div>
    </article>
  );
}
