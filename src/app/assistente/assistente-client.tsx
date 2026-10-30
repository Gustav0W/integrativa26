"use client";

import { useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { DraftingCompass, Gamepad2, GraduationCap, MessageSquareText, Monitor, RotateCcw, SlidersHorizontal, Sparkles, Target, TriangleAlert, Volume2, Wallet, WandSparkles } from "lucide-react";
import { BuildResultView, LOADING_STEPS, LoadingState } from "@/components/build-result";
import { BudgetField, ObjectivePicker, PageIntro, Panel, Segmented, ToggleRow, inputClass, primaryButton } from "@/components/ui";
import { requestRecommendation, sleep } from "@/lib/api";
import { normalizeInput, sameInput } from "@/lib/engine";
import { useSessionState } from "@/lib/session-state";
import type { BrandPreference, BuildInput, BuildResult } from "@/lib/types";

/** Cenários prontos que preenchem o formulário e geram a build na hora (offline). */
const PRESETS: { id: string; title: string; subtitle: string; icon: LucideIcon; input: BuildInput }[] = [
  {
    id: "gamer-1080p",
    title: "Gamer Entrada",
    subtitle: "1080p · R$ 4.500",
    icon: Gamepad2,
    input: { budget: 4500, objectives: ["gaming"], resolution: "1080p", brand: "any", includePeripherals: false, silent: false, prompt: "Quero jogar Valorant e Fortnite com FPS alto e alguns AAA no médio/alto." },
  },
  {
    id: "gamer-1440p",
    title: "Gamer 1440p Ultra",
    subtitle: "1440p · R$ 9.000",
    icon: Monitor,
    input: { budget: 9000, objectives: ["gaming"], resolution: "1440p", brand: "amd", includePeripherals: false, silent: false, prompt: "Quero rodar Baldur's Gate 3 no ultra e usar dois monitores sem travar." },
  },
  {
    id: "arq-games",
    title: "Arquitetura + Jogos",
    subtitle: "Revit/Lumion e games · R$ 12.000",
    icon: DraftingCompass,
    input: { budget: 12000, objectives: ["arquitetura", "gaming"], resolution: "1440p", brand: "any", includePeripherals: false, silent: true, prompt: "Uso Revit e Lumion no dia a dia e jogo Cyberpunk nos fins de semana." },
  },
  {
    id: "estudos",
    title: "Home Office / Estudos",
    subtitle: "Com monitor · R$ 3.500",
    icon: GraduationCap,
    input: { budget: 3500, objectives: ["office"], resolution: "1080p", brand: "any", includePeripherals: true, silent: false, prompt: "PC para faculdade, aulas online, Office e muitas abas no navegador." },
  },
];

const DEFAULT_FORM: BuildInput = { budget: 8000, objectives: ["gaming"], resolution: "1440p", brand: "any", includePeripherals: false, silent: false, prompt: "" };

export function AssistenteClient() {
  const [form, setForm] = useSessionState<BuildInput>("assistente:form", DEFAULT_FORM);
  const [result, setResult] = useSessionState<BuildResult | null>("assistente:result", null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);

  const update = <K extends keyof BuildInput>(key: K, value: BuildInput[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const isStale = result !== null && !loading && !sameInput(result.input, form);

  const generate = async (override?: BuildInput) => {
    if (loading) return;
    const payload = normalizeInput(override ?? form);
    setForm(payload);
    setLoading(true);
    setLoadingStep(0);
    if (window.innerWidth < 1024) resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    const animation = (async () => {
      for (let i = 0; i < LOADING_STEPS.length; i++) {
        setLoadingStep(i);
        await sleep(420);
      }
    })();
    try {
      const [build] = await Promise.all([requestRecommendation(payload), animation]);
      setResult(build);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageIntro icon={WandSparkles} title="Assistente guiado" description="Diga quanto quer gastar e para que vai usar o PC. A IA escolhe as 7 peças, confere a compatibilidade e explica cada escolha." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <aside className="min-w-0 space-y-4 lg:col-span-4">
          <Panel title="Quanto você quer gastar?" icon={Wallet}>
            <BudgetField value={form.budget} onChange={(value) => update("budget", value)} />
          </Panel>

          <Panel title="Para que vai usar o PC?" icon={Target}>
            <ObjectivePicker value={form.objectives} onChange={(value) => update("objectives", value)} resolution={form.resolution} onResolutionChange={(value) => update("resolution", value)} />
          </Panel>

          <Panel title="Preferências (opcional)" icon={SlidersHorizontal}>
            <p className="mb-2 text-xs font-medium text-muted">Marca do processador</p>
            <Segmented<BrandPreference>
              value={form.brand}
              onChange={(value) => update("brand", value)}
              options={[
                { id: "any", label: "Indiferente" },
                { id: "amd", label: "AMD" },
                { id: "intel", label: "Intel" },
              ]}
            />
            <div className="mt-3 space-y-2">
              <ToggleRow icon={Monitor} label="Incluir monitor e periféricos" description="Reserva parte do orçamento para monitor, teclado e mouse" checked={form.includePeripherals} onChange={(value) => update("includePeripherals", value)} />
              <ToggleRow icon={Volume2} label="Foco em silêncio e refrigeração" description="Prioriza coolers silenciosos e boa ventilação" checked={form.silent} onChange={(value) => update("silent", value)} />
            </div>
          </Panel>

          <Panel title="Algo mais? (opcional)" icon={MessageSquareText} aside={<span className="text-[11px] text-subtle">{form.prompt.length}/500</span>}>
            <textarea
              value={form.prompt}
              onChange={(event) => update("prompt", event.target.value.slice(0, 500))}
              rows={3}
              placeholder="Ex.: Quero rodar Baldur's Gate 3 no ultra e usar dois monitores."
              className={`${inputClass} resize-none`}
            />
          </Panel>

          <button type="button" onClick={() => void generate()} disabled={loading} className={`${primaryButton} w-full py-4 text-base`}>
            <Sparkles className="size-5" />
            {loading ? "Gerando…" : "Gerar build ideal com IA"}
          </button>
        </aside>

        <section ref={resultsRef} className="min-w-0 scroll-mt-28 space-y-4 lg:col-span-8">
          {loading ? (
            <LoadingState step={loadingStep} />
          ) : result ? (
            <>
              {isStale && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                  <TriangleAlert className="size-4 shrink-0" />
                  <span className="flex-1">Você mudou as opções. Gere de novo para atualizar a recomendação.</span>
                  <button type="button" onClick={() => void generate()} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs font-semibold hover:bg-amber-500/25">
                    <RotateCcw className="size-3.5" />
                    Atualizar
                  </button>
                </div>
              )}
              <BuildResultView result={result} onRegenerate={() => void generate()} />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-12 text-center">
              <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-linear-to-br from-brand-from to-brand-to shadow-lg shadow-brand/25">
                <WandSparkles className="size-8 text-on-brand" />
              </span>
              <h2 className="mt-5 text-xl font-bold">Sua build ideal aparece aqui</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">Preencha ao lado e clique em gerar — ou experimente um dos cenários prontos:</p>
              <div className="mx-auto mt-8 grid max-w-2xl gap-3 text-left sm:grid-cols-2">
                {PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setForm(preset.input);
                        void generate(preset.input);
                      }}
                      className="group flex items-center gap-3 rounded-xl border border-line bg-surface p-3 transition hover:border-brand/50"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-2 transition group-hover:bg-brand-soft">
                        <Icon className="size-5 text-muted group-hover:text-brand-text" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{preset.title}</span>
                        <span className="block text-xs text-subtle">{preset.subtitle}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
