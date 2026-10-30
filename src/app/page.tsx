import Link from "next/link";
import { ArrowRight, BadgeCheck, Gauge, Search, Sparkles } from "lucide-react";
import { TOOLS } from "@/components/tools";

const HIGHLIGHTS = [
  { icon: BadgeCheck, title: "Sem incompatibilidade", text: "Socket, memória, fonte, cooler e gabinete verificados automaticamente." },
  { icon: Gauge, title: "Sem gargalo", text: "CPU e GPU equilibradas para o seu uso, com estimativa de desempenho." },
  { icon: Search, title: "Menor preço", text: "Cada peça com atalhos de busca no Google Shopping, KaBuM!, Pichau e Terabyte." },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-16">
      {/* Hero */}
      <section className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-text">
          <Sparkles className="size-3.5" />
          Inteligência artificial para montar PCs
        </span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          O PC certo para o que você faz, <span className="text-brand-text">sem errar na compra.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-pretty text-muted sm:text-lg">
          A SmartBuild AI monta, confere e explica configurações de computador dentro do seu orçamento — mesmo que você nunca tenha montado um PC.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/assistente"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-brand-from to-brand-to px-6 py-3 text-sm font-bold text-on-brand shadow-lg shadow-brand/25 transition hover:brightness-110"
          >
            Começar pelo assistente
            <ArrowRight className="size-4" />
          </Link>
          <Link href="/conversar" className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-6 py-3 text-sm font-semibold transition hover:border-brand/50">
            Prefiro descrever para a IA
          </Link>
        </div>
      </section>

      {/* Ferramentas */}
      <section className="mt-14">
        <h2 className="text-center text-sm font-semibold tracking-wider text-subtle uppercase">Escolha como quer começar</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="group flex flex-col rounded-2xl border border-line bg-surface p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-md"
              >
                <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft transition group-hover:bg-brand">
                  <Icon className="size-6 text-brand-text transition group-hover:text-on-brand" />
                </span>
                <h3 className="mt-4 text-lg font-bold">{tool.title}</h3>
                <p className="mt-1.5 flex-1 text-sm text-muted">{tool.description}</p>
                <p className="mt-4 text-xs text-subtle">{tool.idealFor}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-text">
                  Abrir
                  <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Diferenciais */}
      <section className="mt-14 grid gap-4 rounded-2xl border border-line bg-surface p-6 sm:grid-cols-3">
        {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-start gap-3">
            <Icon className="mt-0.5 size-5 shrink-0 text-brand-text" />
            <div>
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className="mt-1 text-xs text-muted">{text}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
