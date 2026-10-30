"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { TOOLS, navTransition } from "./tools";

/** Marca: um chip visto de cima, com pinos nas laterais. */
export function ChipMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <g className="stroke-brand" strokeWidth="2" strokeLinecap="square">
        {[9, 16, 23].map((p) => (
          <g key={p}>
            <line x1={p} y1="2" x2={p} y2="6" />
            <line x1={p} y1="26" x2={p} y2="30" />
            <line x1="2" y1={p} x2="6" y2={p} />
            <line x1="26" y1={p} x2="30" y2={p} />
          </g>
        ))}
      </g>
      <rect x="6" y="6" width="20" height="20" className="fill-brand" />
      <rect x="11" y="11" width="10" height="10" className="fill-none stroke-on-brand" strokeWidth="1.5" />
    </svg>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const links = [{ href: "/", short: "Início" }, ...TOOLS];

  return (
    <header className="site-header sticky top-0 z-30 border-b border-ink/80 bg-canvas/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" transitionTypes={navTransition(pathname, "/")} className="flex min-w-0 items-center gap-2.5 py-3">
          <ChipMark />
          <span className="heading text-[15px] tracking-tight">
            SMARTBUILD<span className="font-mono font-medium text-brand-text">/AI</span>
          </span>
        </Link>

        <nav className="hidden items-stretch self-stretch lg:flex">
          {links.map((link, index) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                transitionTypes={navTransition(pathname, link.href)}
                className={`group relative flex items-center gap-1.5 px-3.5 text-[13px] font-medium transition ${active ? "text-fg" : "text-muted hover:text-fg"}`}
              >
                <span className={`font-mono text-[10px] ${active ? "text-brand-text" : "text-subtle"}`}>{String(index).padStart(2, "0")}</span>
                {link.short}
                <span className={`absolute inset-x-3.5 bottom-0 h-0.5 transition ${active ? "bg-brand" : "bg-transparent group-hover:bg-line"}`} />
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <span className="label-mono hidden items-center gap-1.5 text-muted sm:inline-flex">
            <span className="size-1.5 animate-pulse bg-copper" />
            IA ativa
          </span>
          <ThemeToggle />
        </div>
      </div>

      {/* Navegação no celular/tablet */}
      <nav className="flex overflow-x-auto border-t border-line px-2 [scrollbar-width:none] lg:hidden">
        {links.map((link, index) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              transitionTypes={navTransition(pathname, link.href)}
              className={`relative flex shrink-0 items-center gap-1 px-3 py-2.5 text-xs font-medium ${active ? "text-fg" : "text-muted"}`}
            >
              <span className="font-mono text-[9px] text-subtle">{String(index).padStart(2, "0")}</span>
              {link.short}
              {active && <span className="absolute inset-x-3 bottom-0 h-0.5 bg-brand" />}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
