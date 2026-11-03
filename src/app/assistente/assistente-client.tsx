"use client";

import { useRef, useState } from "react";
import { ArrowRight, Monitor, RotateCcw, Volume2 } from "lucide-react";
import { BuildResultView, LOADING_STEPS, LoadingState } from "@/components/build-result";
import { BudgetField, PageIntro, Panel, SectorPicker, Segmented, ToggleRow, inputClass, primaryButton, secondaryButton } from "@/components/ui";
import { requestRecommendation, sleep } from "@/lib/api";
import { MONITORS } from "@/lib/catalog";
import { brl, normalizeInput, sameInput } from "@/lib/engine";
import { useSessionState } from "@/lib/session-state";
import type { BrandPreference, BuildInput, BuildResult } from "@/lib/types";

/** Cenários prontos que preenchem o formulário e geram a build na hora (offline). */
const PRESETS: { id: string; title: string; subtitle: string; input: BuildInput }[] = [
  {
    id: "gamer-1080p",
    title: "Gamer Entrada",
    subtitle: "1080p · R$ 4.500",
    input: { budget: 4500, sector: "gaming", softwares: ["e-Sports", "Jogos AAA"], resolution: "1080p", brand: "any", monitorId: null, silent: false, prompt: "Quero jogar Valorant e Fortnite com FPS alto e alguns AAA no médio/alto." },
  },
  {
    id: "gamer-1440p",
    title: "Gamer 1440p Ultra",
    subtitle: "1440p · R$ 9.000",
    input: { budget: 9000, sector: "gaming", softwares: ["Jogos AAA"], resolution: "1440p", brand: "amd", monitorId: "mon-qhd", silent: false, prompt: "Quero rodar Baldur's Gate 3 no ultra e usar dois monitores sem travar." },
  },
  {
    id: "arq-games",
    title: "Arquitetura + Jogos",
    subtitle: "Revit/Lumion e games · R$ 12.000",
    input: { budget: 12000, sector: "engenharia", softwares: ["Revit", "SketchUp"], resolution: "1440p", brand: "any", monitorId: "mon-qhd", silent: true, prompt: "Uso Revit e Lumion no dia a dia e jogo Cyberpunk nos fins de semana." },
  },
  {
    id: "estudos",
    title: "Home Office / Estudos",
    subtitle: "Com monitor · R$ 3.500",
    input: { budget: 3500, sector: "escritorio", softwares: ["Excel Avançado", "Browser (Muitas abas)"], resolution: "1080p", brand: "any", monitorId: "mon-100hz", silent: false, prompt: "PC para faculdade, aulas online, Office e muitas abas no navegador." },
  },
];

const DEFAULT_FORM: BuildInput = { budget: 8000, sector: "gaming", softwares: ["Jogos AAA"], resolution: "1440p", brand: "any", monitorId: null, silent: false, prompt: "" };

export function AssistenteClient() {
  const [form, setForm] = useSessionState<BuildInput>("assistente:form", DEFAULT_FORM);
  const [result, setResult] = useSessionState<BuildResult | null>("assistente:result", null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);

  const normalizedForm = normalizeInput(form);
  const update = <K extends keyof BuildInput>(key: K, value: BuildInput[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const isStale = result !== null && !loading && !sameInput(result.input, normalizedForm);

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
      <PageIntro code="01" title="Assistente guiado" description="Diga quanto quer gastar e para que vai usar o PC. A IA escolhe as 7 peças, confere a compatibilidade e explica cada escolha." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <aside className="min-w-0 space-y-4 lg:col-span-4">
          <Panel index="01" title="Quanto você quer gastar?">
            <BudgetField value={normalizedForm.budget} onChange={(value) => update("budget", value)} />
          </Panel>

          <Panel index="02" title="Setor e softwares">
            <SectorPicker sector={normalizedForm.sector} onSectorChange={(value) => update("sector", value)} softwares={normalizedForm.softwares} onSoftwaresChange={(value) => update("softwares", value)} resolution={normalizedForm.resolution} onResolutionChange={(value) => update("resolution", value)} />
          </Panel>

          <Panel index="03" title="Preferências" aside={<span className="label-mono text-subtle">opcional</span>}>
            <p className="label-mono mb-2 text-subtle">Marca do processador</p>
            <Segmented<BrandPreference>
              value={normalizedForm.brand}
              onChange={(value) => update("brand", value)}
              options={[
                { id: "any", label: "Indiferente" },
                { id: "amd", label: "AMD" },
                { id: "intel", label: "Intel" },
              ]}
            />
            <div className="mt-3 space-y-2">
              <label htmlFor="assistant-monitor" className="label-mono block text-subtle">Monitor opcional</label>
              <select id="assistant-monitor" value={normalizedForm.monitorId ?? ""} onChange={(event) => update("monitorId", event.target.value || null)} className={`${inputClass} cursor-pointer`}>
                <option value="">Não incluir monitor</option>
                {[...new Set(MONITORS.map((monitor) => monitor.group))].map((group) => (
                  <optgroup key={group} label={group}>
                    {MONITORS.filter((monitor) => monitor.group === group).map((monitor) => (
                      <option key={monitor.id} value={monitor.id}>
                        {monitor.name} · {brl(monitor.price)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ToggleRow icon={Volume2} label="Foco em silêncio e refrigeração" description="Prioriza coolers silenciosos e boa ventilação" checked={normalizedForm.silent} onChange={(value) => update("silent", value)} />
            </div>
          </Panel>

          <Panel index="04" title="Algo mais?" aside={<span className="label-mono text-subtle">{normalizedForm.prompt.length}/500</span>}>
            <textarea
              value={normalizedForm.prompt}
              onChange={(event) => update("prompt", event.target.value.slice(0, 500))}
              rows={3}
              placeholder="Ex.: Quero rodar Baldur's Gate 3 no ultra e usar dois monitores."
              className={`${inputClass} resize-none`}
            />
          </Panel>

          <button type="button" onClick={() => void generate()} disabled={loading} className={`${primaryButton} w-full py-4`}>
            {loading ? "Gerando…" : "Gerar build ideal com IA"}
            <ArrowRight className="size-4" />
          </button>
        </aside>

        <section ref={resultsRef} className="min-w-0 scroll-mt-28 space-y-4 lg:col-span-8">
          {loading ? (
            <LoadingState step={loadingStep} />
          ) : result ? (
            <>
              {isStale && (
                <div className="flex flex-wrap items-center gap-3 border border-l-4 border-line border-l-copper bg-surface px-4 py-3 text-sm">
                  <span className="label-mono text-copper">[Atenção]</span>
                  <span className="flex-1 text-muted">Você mudou as opções. Gere de novo para atualizar a recomendação.</span>
                  <button type="button" onClick={() => void generate()} className={secondaryButton}>
                    <RotateCcw className="size-3.5" />
                    Atualizar
                  </button>
                </div>
              )}
              <BuildResultView result={result} onRegenerate={() => void generate()} />
            </>
          ) : (
            <div className="border border-dashed border-ink/40 px-6 py-12">
              <p className="label-mono text-subtle">Saída — aguardando parâmetros</p>
              <h2 className="heading mt-3 text-2xl">Sua build ideal aparece aqui.</h2>
              <p className="mt-2 max-w-md text-sm text-muted">Preencha ao lado e clique em gerar — ou experimente um dos cenários prontos:</p>
              <ul className="mt-8 border-t border-line">
                {PRESETS.map((preset, index) => (
                  <li key={preset.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setForm(preset.input);
                        void generate(preset.input);
                      }}
                      className="group grid w-full grid-cols-[2rem_1fr_auto] items-baseline gap-3 border-b border-line px-1 py-3.5 text-left transition hover:bg-surface"
                    >
                      <span className="font-mono text-xs text-brand-text">{String.fromCharCode(65 + index)}</span>
                      <span>
                        <span className="block text-sm font-semibold">{preset.title}</span>
                        <span className="block font-mono text-[11px] text-subtle">{preset.subtitle}</span>
                      </span>
                      <ArrowRight className="size-4 self-center text-subtle transition group-hover:translate-x-1 group-hover:text-brand-text" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
