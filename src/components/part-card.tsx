import { ArrowUpRight } from "lucide-react";
import { STORES, googleShoppingUrl } from "@/lib/catalog";
import { CATEGORY_LABEL, brl } from "@/lib/engine";
import type { RecommendedPart } from "@/lib/types";
import { CATEGORY_UI } from "./ui";

/** "Buscar menor preço" (Google Shopping) + atalhos discretos para as lojas. */
export function PriceLinks({ terms }: { terms: string[] }) {
  const [primary, secondary] = terms;
  if (!primary) return <p className="label-mono text-subtle">Incluso no processador — nada a comprar</p>;
  const storeLink = "inline-flex items-center gap-0.5 font-mono text-[11px] text-muted underline-offset-2 transition hover:text-fg hover:underline";
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
      <a
        href={googleShoppingUrl(primary)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 bg-brand px-2.5 py-1.5 font-mono text-[11px] font-semibold tracking-wide text-on-brand uppercase transition hover:bg-brand-hover"
      >
        Buscar menor preço
        <ArrowUpRight className="size-3.5" />
      </a>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="label-mono text-subtle">Lojas:</span>
        {STORES.map((store) => (
          <a key={store.id} href={store.url(primary)} target="_blank" rel="noopener noreferrer" className={storeLink}>
            {store.label}
            <ArrowUpRight className="size-3" />
          </a>
        ))}
        {secondary && (
          <a href={googleShoppingUrl(secondary)} target="_blank" rel="noopener noreferrer" className={storeLink}>
            Cooler
            <ArrowUpRight className="size-3" />
          </a>
        )}
      </span>
    </div>
  );
}

export function PartCard({ part, index }: { part: RecommendedPart; index: number }) {
  const ui = CATEGORY_UI[part.category];

  return (
    <article className="flex flex-col border border-line bg-surface">
      <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-2">
        <span className="label-mono flex items-center gap-2 text-subtle">
          <span className={`size-2 ${ui.bar}`} />
          {ui.code} · {String(index + 1).padStart(2, "0")}
          <span className="hidden text-subtle/70 sm:inline">— {CATEGORY_LABEL[part.category].split(" (")[0]}</span>
        </span>
        <span className="font-mono text-sm font-semibold">{part.price > 0 ? brl(part.price) : "Incluso"}</span>
      </header>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-[15px] leading-snug font-semibold">{part.name}</h3>
        <p className="mt-1 font-mono text-[11px] text-muted">{part.specs.join("  ·  ")}</p>

        <p className="mt-4 border-l-2 border-brand pl-3 text-[13px] leading-relaxed text-muted">
          <span className="label-mono mb-1 block text-brand-text">Por que a IA escolheu</span>
          {part.reason}
        </p>

        <div className="mt-auto pt-4">
          <PriceLinks terms={part.searchTerms} />
        </div>
      </div>
    </article>
  );
}
