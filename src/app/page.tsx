import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CircuitArt } from "@/components/circuit-art";
import { PageTransition } from "@/components/page-transition";
import { TOOLS } from "@/components/tools";
import { primaryButton, secondaryButton } from "@/components/styles";

const FORWARD = ["nav-forward"];

const HIGHLIGHTS = [
  { code: "A", title: "Sem incompatibilidade", text: "Socket, VRM, memória, fonte, cooler e gabinete conferidos automaticamente." },
  { code: "B", title: "Sem gargalo", text: "CPU e GPU equilibradas para o seu uso, com estimativa de FPS e desempenho." },
  { code: "C", title: "Menor preço", text: "Cada peça com busca direta no Google Shopping, KaBuM!, Pichau e Terabyte." },
];

export default function Home() {
  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
        {/* Abertura */}
        <section className="grid items-center gap-10 border-b border-ink/80 pb-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="label-mono text-brand-text">Ficha nº 001 — Montagem de PCs com IA</p>
            <h1 className="heading mt-5 text-5xl sm:text-6xl xl:text-7xl">
              O PC certo
              <br />
              para o que
              <br />
              você <span className="text-brand-text">faz.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base text-pretty text-muted sm:text-lg">
              A SmartBuild AI monta, confere e explica configurações de computador dentro do seu orçamento — mesmo que você nunca tenha montado um PC.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/assistente" transitionTypes={FORWARD} className={primaryButton}>
                Começar pelo assistente
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/conversar" transitionTypes={FORWARD} className={`${secondaryButton} px-5 py-3 text-xs`}>
                Prefiro descrever para a IA
              </Link>
            </div>
          </div>
          <div className="hidden md:block lg:col-span-5">
            <CircuitArt className="mx-auto w-full max-w-md" />
          </div>
        </section>

        {/* Índice de ferramentas */}
        <section className="mt-12">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="label-mono text-subtle">Índice — escolha como começar</h2>
            <span className="label-mono text-subtle">{String(TOOLS.length).padStart(2, "0")} ferramentas</span>
          </div>
          <ol className="border-t border-ink/80">
            {TOOLS.map((tool, index) => (
              <li key={tool.href}>
                <Link
                  href={tool.href}
                  transitionTypes={FORWARD}
                  className="group grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-x-4 gap-y-1 border-b border-line px-1 py-5 transition hover:bg-surface sm:grid-cols-[4rem_minmax(0,1fr)_minmax(0,1.3fr)_auto] sm:px-3"
                >
                  <span className="font-mono text-sm text-brand-text">{String(index + 1).padStart(2, "0")}</span>
                  <span className="heading text-xl sm:text-2xl">{tool.title}</span>
                  <span className="col-start-2 row-start-2 text-sm text-muted sm:col-start-3 sm:row-start-1">
                    {tool.description}
                    <span className="mt-1 block text-xs text-subtle">{tool.idealFor}</span>
                  </span>
                  <ArrowRight className="col-start-3 row-start-1 size-5 self-center text-subtle transition group-hover:translate-x-1 group-hover:text-brand-text sm:col-start-4" />
                </Link>
              </li>
            ))}
          </ol>
        </section>

        {/* Garantias */}
        <section className="mt-12 grid border border-line bg-surface sm:grid-cols-3">
          {HIGHLIGHTS.map((item, index) => (
            <div key={item.code} className={`p-5 ${index > 0 ? "border-t border-line sm:border-t-0 sm:border-l" : ""}`}>
              <p className="label-mono text-copper">{item.code} —</p>
              <h3 className="mt-2 text-sm font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-muted">{item.text}</p>
            </div>
          ))}
        </section>
      </div>
    </PageTransition>
  );
}
