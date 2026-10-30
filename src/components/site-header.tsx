"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { TOOLS, navTransition } from "./tools";

export function SiteHeader() {
  const pathname = usePathname();
  const links = [{ href: "/", short: "Início" }, ...TOOLS];

  return (
    <header className="site-header sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" transitionTypes={navTransition(pathname, "/")} className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-brand-from to-brand-to shadow-md shadow-brand/25">
            <Cpu className="size-5 text-on-brand" />
          </span>
          <span className="text-base font-bold tracking-tight">
            SmartBuild <span className="text-brand-text">AI</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                transitionTypes={navTransition(pathname, link.href)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${active ? "bg-brand-soft text-brand-text" : "text-muted hover:bg-surface-2 hover:text-fg"}`}
              >
                {link.short}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-500/30 sm:inline-flex dark:text-emerald-300">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            IA Ativa
          </span>
          <ThemeToggle />
        </div>
      </div>

      {/* Navegação no celular/tablet */}
      <nav className="flex gap-1 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:hidden">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              transitionTypes={navTransition(pathname, link.href)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${active ? "bg-brand-soft text-brand-text" : "text-muted hover:text-fg"}`}
            >
              {link.short}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
