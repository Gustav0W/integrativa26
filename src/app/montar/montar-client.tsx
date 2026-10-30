"use client";

import { useMemo, useState } from "react";
import { ArrowRightLeft, Eraser } from "lucide-react";
import { EvaluationPanel } from "@/components/evaluation-panel";
import { PriceLinks } from "@/components/part-card";
import { CATEGORY_UI, ObjectivePicker, PageIntro, Panel, inputClass, primaryButton, secondaryButton } from "@/components/ui";
import { BUDGET_MAX, BUDGET_MIN, CASE_KITS, CPUS, GPUS, MOBOS, PSUS, RAMS, SSDS } from "@/lib/catalog";
import { CATEGORY_LABEL, RESOLUTION_LABEL, brl, buildPartsPrice, completeBuild, evaluateBuild, integratedGpu, requiredPsuWatts, resolveGpu } from "@/lib/engine";
import { useSessionState } from "@/lib/session-state";
import type { CatalogItem, Combo, Objective, PartialBuild, Resolution } from "@/lib/types";

type Slot = "cpu" | "gpu" | "mobo" | "ram" | "ssd" | "psu" | "case";
type Selection = Record<Slot, string>;

const EMPTY: Selection = { cpu: "", gpu: "", mobo: "", ram: "", ssd: "", psu: "", case: "" };
const SLOTS: Slot[] = ["cpu", "gpu", "mobo", "ram", "ssd", "psu", "case"];
const INTEGRATED = "integrated";

const OPTIONS: Record<Slot, CatalogItem[]> = { cpu: CPUS, gpu: GPUS, mobo: MOBOS, ram: RAMS, ssd: SSDS, psu: PSUS, case: CASE_KITS };

const HINTS: Record<Slot, string> = {
  cpu: "O cérebro do PC. Define a plataforma (socket) das outras peças.",
  gpu: "Essencial para jogos e render 3D. Para estudo/escritório, o vídeo integrado pode bastar.",
  mobo: "Precisa ter o mesmo socket do processador e o tipo de memória do kit de RAM.",
  ram: "16GB é o mínimo atual; 32GB+ para arquitetura, programação pesada e jogos modernos.",
  ssd: "Onde ficam sistema, programas e arquivos. Pense no espaço que seus projetos e jogos ocupam.",
  psu: "Alimenta tudo. Fonte fraca ou ruim é a causa mais comum de problemas.",
  case: "Gabinete e cooler precisam dar conta do calor do processador.",
};

function toBuild(selection: Selection): PartialBuild {
  return {
    cpu: CPUS.find((item) => item.id === selection.cpu),
    gpu: selection.gpu === INTEGRATED ? "integrated" : GPUS.find((item) => item.id === selection.gpu),
    mobo: MOBOS.find((item) => item.id === selection.mobo),
    ram: RAMS.find((item) => item.id === selection.ram),
    ssd: SSDS.find((item) => item.id === selection.ssd),
    psu: PSUS.find((item) => item.id === selection.psu),
    kit: CASE_KITS.find((item) => item.id === selection.case),
  };
}

function fromCombo(combo: Combo): Selection {
  return {
    cpu: combo.cpu.id,
    gpu: combo.gpu.brand === "integrated" ? INTEGRATED : combo.gpu.id,
    mobo: combo.mobo.id,
    ram: combo.ram.id,
    ssd: combo.ssd.id,
    psu: combo.psu.id,
    case: combo.kit.id,
  };
}

/** Explica por que uma opção não combina com o que já foi escolhido (ou null). */
function conflictFor(slot: Slot, item: CatalogItem, build: PartialBuild): string | null {
  const { cpu, mobo, ram, kit } = build;
  const gpu = resolveGpu(build);
  if (slot === "cpu") {
    const option = item as (typeof CPUS)[number];
    if (mobo && option.socket !== mobo.socket) return `socket ${option.socket}`;
    if (mobo && option.power > mobo.maxCpuPower) return "VRM da placa";
  }
  if (slot === "mobo") {
    const option = item as (typeof MOBOS)[number];
    if (cpu && option.socket !== cpu.socket) return `socket ${option.socket}`;
    if (cpu && cpu.power > option.maxCpuPower) return "VRM fraco para a CPU";
    if (ram && option.memory !== ram.memory) return option.memory;
    if (kit && !kit.formFactors.includes(option.formFactor)) return `não cabe no gabinete`;
  }
  if (slot === "ram" && mobo && (item as (typeof RAMS)[number]).memory !== mobo.memory) return `placa usa ${mobo.memory}`;
  if (slot === "psu" && cpu && gpu && (item as (typeof PSUS)[number]).watts < requiredPsuWatts(cpu, gpu)) return "potência insuficiente";
  if (slot === "case" && cpu) {
    const option = item as (typeof CASE_KITS)[number];
    if (option.maxTdp < cpu.power) return "cooler fraco para a CPU";
    if (option.usesBoxCooler && !cpu.boxCooler) return "CPU sem cooler box";
  }
  if (slot === "case" && mobo && !(item as (typeof CASE_KITS)[number]).formFactors.includes(mobo.formFactor)) return `não aceita ${mobo.formFactor}`;
  return null;
}

export function MontarClient() {
  const [selection, setSelection] = useSessionState<Selection>("montar:selection", EMPTY);
  const [objectives, setObjectives] = useSessionState<Objective[]>("montar:objectives", ["gaming"]);
  const [resolution, setResolution] = useSessionState<Resolution>("montar:resolution", "1440p");
  const [budget, setBudget] = useSessionState<string>("montar:budget", "");
  const [message, setMessage] = useState<string | null>(null);
  const [comparison, setComparison] = useState<{ combo: Combo; score: number; total: number } | null>(null);

  const build = useMemo(() => toBuild(selection), [selection]);
  const evaluation = useMemo(() => evaluateBuild(build, objectives, resolution), [build, objectives, resolution]);
  const chosenCount = SLOTS.filter((slot) => selection[slot]).length;
  const total = buildPartsPrice(build);
  const budgetValue = Number(budget) > 0 ? Number(budget) : null;
  const compatible = evaluation.checks.every((check) => check.ok);

  const choose = (slot: Slot, id: string) => {
    setSelection((prev) => ({ ...prev, [slot]: id }));
    setComparison(null);
    setMessage(null);
  };

  const applySelection = (next: Selection) => {
    setSelection(next);
    setComparison(null);
    setMessage(null);
  };

  const fillWithAi = () => {
    const combo = completeBuild(build, { budget: budgetValue ?? BUDGET_MAX, objectives, resolution, brand: "any", includePeripherals: false, silent: false, prompt: "" });
    if (!combo) {
      setMessage("As peças escolhidas não combinam entre si — corrija as incompatibilidades e tente de novo.");
      return;
    }
    const filled = SLOTS.filter((slot) => !selection[slot]).length;
    applySelection(fromCombo(combo));
    setMessage(filled > 0 ? `A IA escolheu ${filled} peça(s) que faltavam, mantendo as suas.` : "Sua build já estava completa.");
  };

  const compareWithAi = () => {
    const reference = Math.max(BUDGET_MIN, Math.min(BUDGET_MAX, total));
    const combo = completeBuild({}, { budget: reference, objectives, resolution, brand: "any", includePeripherals: false, silent: false, prompt: "" });
    if (!combo) return;
    const aiBuild = toBuild(fromCombo(combo));
    const aiEvaluation = evaluateBuild(aiBuild, objectives, resolution);
    setComparison({ combo, score: aiEvaluation.overall ?? 0, total: buildPartsPrice(aiBuild) });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageIntro code="03" title="Monte você mesmo" description="Escolha as peças que você viu e gostou. A IA confere a compatibilidade e diz, em tempo real, se a configuração serve para o seu uso.">
        <button type="button" onClick={() => applySelection(EMPTY)} className={secondaryButton} disabled={chosenCount === 0}>
          <Eraser className="size-3.5" />
          Limpar peças
        </button>
      </PageIntro>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="min-w-0 space-y-4 lg:col-span-7">
          <Panel index="01" title="Para que vai usar o PC?">
            <ObjectivePicker value={objectives} onChange={setObjectives} resolution={resolution} onResolutionChange={setResolution} compact />
          </Panel>

          <Panel index="02" title="Suas peças" aside={<span className="label-mono text-subtle">{chosenCount}/7 escolhidas</span>}>
            <div className="-my-4 divide-y divide-line">
              {SLOTS.map((slot, index) => {
                const category = slot === "case" ? "case" : slot;
                const ui = CATEGORY_UI[category];
                const options = OPTIONS[slot];
                const chosen = slot === "gpu" && selection.gpu === INTEGRATED ? null : options.find((item) => item.id === selection[slot]);
                const igpu = build.cpu ? integratedGpu(build.cpu) : null;
                return (
                  <div key={slot} className="grid gap-x-4 py-4 sm:grid-cols-[4.5rem_1fr]">
                    <span className="label-mono flex items-center gap-2 pt-0.5 text-subtle sm:block">
                      <span className={`mb-1.5 hidden size-2 sm:block ${selection[slot] ? ui.bar : "bg-line"}`} />
                      {ui.code} · {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <label htmlFor={`slot-${slot}`} className="text-sm font-semibold">
                        {CATEGORY_LABEL[category]}
                      </label>
                      <p className="text-xs text-subtle">{HINTS[slot]}</p>
                      <select id={`slot-${slot}`} value={selection[slot]} onChange={(event) => choose(slot, event.target.value)} className={`${inputClass} mt-2 cursor-pointer`}>
                        <option value="">— Escolher —</option>
                        {slot === "gpu" && <option value={INTEGRATED}>{igpu ? `Usar vídeo integrado (${igpu.name.replace("Vídeo integrado ", "").replace(" (no processador)", "")})` : "Usar vídeo integrado do processador"}</option>}
                        {options.map((item) => {
                          const conflict = conflictFor(slot, item, build);
                          return (
                            <option key={item.id} value={item.id}>
                              {conflict ? "⚠ " : ""}
                              {item.name} — {brl(item.price)}
                              {conflict ? ` (${conflict})` : ""}
                            </option>
                          );
                        })}
                      </select>
                      {chosen && (
                        <div className="mt-3 space-y-3">
                          <p className="border-l-2 border-line pl-3 text-xs text-muted">{chosen.note}</p>
                          <PriceLinks terms={"coolerSearch" in chosen && typeof chosen.coolerSearch === "string" ? [chosen.search, chosen.coolerSearch] : [chosen.search]} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>

        {/* Avaliação ao vivo */}
        <aside className="min-w-0 space-y-4 lg:col-span-5 lg:sticky lg:top-20 lg:self-start">
          <div className="border border-ink/80 bg-surface">
            <div className="grid grid-cols-[1fr_auto] divide-x divide-line">
              <div className="p-4">
                <p className="label-mono text-subtle">Total das peças</p>
                <p className="mt-1 font-mono text-3xl font-semibold tracking-tight">{brl(total)}</p>
              </div>
              <div className="w-40 p-4">
                <label htmlFor="montar-budget" className="label-mono text-subtle">
                  Orçamento
                </label>
                <input id="montar-budget" type="number" inputMode="numeric" min={0} step={100} value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="opcional" className={`${inputClass} mt-1 py-1.5 font-mono`} />
              </div>
            </div>
            {budgetValue !== null && (
              <p className={`label-mono border-t border-line px-4 py-2 ${total <= budgetValue ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                {total <= budgetValue ? `Dentro do orçamento — sobram ${brl(budgetValue - total)}` : `${brl(total - budgetValue)} acima do orçamento`}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2 border-t border-line p-4">
              <button type="button" onClick={fillWithAi} disabled={chosenCount === 7} className={`${primaryButton} px-3 py-2.5 text-[11px]`}>
                Completar com a IA
              </button>
              <button type="button" onClick={compareWithAi} disabled={chosenCount < 7 || !compatible} className={`${secondaryButton} py-2.5`} title={chosenCount < 7 ? "Escolha as 7 peças para comparar" : undefined}>
                <ArrowRightLeft className="size-3.5" />
                Comparar com a IA
              </button>
            </div>
            {message && <p className="border-t border-line px-4 py-2.5 text-xs text-muted">{message}</p>}
          </div>

          {comparison && (
            <section className="border border-line bg-surface p-4">
              <p className="label-mono text-brand-text">Sugestão da IA · {brl(comparison.total)}</p>
              <p className="mt-1.5 text-sm text-muted">
                {comparison.score > (evaluation.overall ?? 0) + 3
                  ? `Com um valor parecido, a IA chega a ${comparison.score}/100 contra ${evaluation.overall}/100 da sua build.`
                  : `Sua build está no nível da sugestão da IA (${evaluation.overall}/100 vs ${comparison.score}/100). Boa escolha!`}
              </p>
              <ul className="mt-3 divide-y divide-line border-y border-line text-xs">
                {SLOTS.map((slot) => {
                  const combo = comparison.combo;
                  const item = { cpu: combo.cpu, gpu: combo.gpu, mobo: combo.mobo, ram: combo.ram, ssd: combo.ssd, psu: combo.psu, case: combo.kit }[slot];
                  const same = fromCombo(combo)[slot] === selection[slot];
                  return (
                    <li key={slot} className="flex items-baseline gap-3 py-1.5">
                      <span className="label-mono w-10 shrink-0 text-subtle">{CATEGORY_UI[slot].code}</span>
                      <span className={`min-w-0 flex-1 truncate ${same ? "text-subtle" : "font-medium"}`}>{item.name}</span>
                      <span className="shrink-0 font-mono text-subtle">{item.price > 0 ? brl(item.price) : "incluso"}</span>
                    </li>
                  );
                })}
              </ul>
              <button type="button" onClick={() => applySelection(fromCombo(comparison.combo))} className={`${secondaryButton} mt-3 w-full`}>
                Usar a sugestão da IA
              </button>
            </section>
          )}

          <EvaluationPanel evaluation={evaluation} resolutionLabel={RESOLUTION_LABEL[resolution]} />
        </aside>
      </div>
    </div>
  );
}
