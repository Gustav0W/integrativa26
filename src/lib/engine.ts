import { BUDGET_MAX, BUDGET_MIN, CASE_KITS, CPUS, GPUS, MOBOS, PERIPHERAL_KITS, PSUS, RAMS, SSDS, googleShoppingUrl } from "./catalog";
import type {
  BuildInput,
  BuildResult,
  CaseKitOption,
  Combo,
  CompatibilityCheck,
  CpuOption,
  GpuOption,
  Insight,
  MetricKey,
  MetricTable,
  MoboOption,
  Objective,
  PartCategory,
  PartialBuild,
  PeripheralKit,
  PromptSignals,
  PsuOption,
  RamOption,
  RecommendedPart,
  Resolution,
  Socket,
  SsdOption,
} from "./types";
import { parsePrompt } from "./nlp";

/* ============================================================================
 * MOTOR LOCAL DE RECOMENDAÇÃO
 * Busca exaustiva em todas as combinações compatíveis do catálogo e escolhe a
 * de maior pontuação para o(s) objetivo(s) dentro do orçamento. Garante socket,
 * VRM, memória, formato, fonte e cooler compatíveis por construção.
 * ==========================================================================*/

interface Profile {
  weights: MetricTable;
  caps: MetricTable;
  /** Penalidade por R$ 1.000 gastos: evita gastar onde o ganho é irrelevante. */
  lambda: number;
  silent: boolean;
  wantsWifi: boolean;
  resolution: Resolution;
  /** Capacidade de armazenamento recomendada (GB) para a combinação de usos. */
  storageNeed: number;
  signals: PromptSignals;
}

interface ComboAnalysis {
  metrics: MetricTable;
  bottleneck: number;
  score: number;
  normalized: number;
}

const METRIC_KEYS: MetricKey[] = ["game", "render", "cpuMulti", "cpuSingle", "ram", "ssd", "mobo", "psu", "cooling"];

/** Ordem de "exigência": o primeiro objetivo selecionado nesta lista guia os textos. */
const OBJECTIVE_PRIORITY: Objective[] = ["arquitetura", "gaming", "dev", "office"];

/** Quanto a resolução "esconde" uma CPU mais fraca (GPU-bound em resoluções altas). */
const CPU_RES_FACTOR: Record<Resolution, number> = { "1080p": 1, "1440p": 1.25, "4k": 1.6 };
export const REQUIRED_VRAM: Record<Resolution, number> = { "1080p": 8, "1440p": 12, "4k": 16 };
const FPS_RES_FACTOR: Record<Resolution, number> = { "1080p": 1, "1440p": 0.72, "4k": 0.42 };
export const RESOLUTION_LABEL: Record<Resolution, string> = { "1080p": "1080p", "1440p": "1440p", "4k": "4K" };

export const OBJECTIVE_LABEL: Record<Objective, string> = {
  gaming: "Gaming",
  arquitetura: "Arquitetura & Render 3D",
  dev: "Desenvolvimento",
  office: "Home Office / Estudos",
};

export const CATEGORY_LABEL: Record<PartCategory, string> = {
  cpu: "Processador (CPU)",
  gpu: "Placa de Vídeo (GPU)",
  mobo: "Placa-Mãe",
  ram: "Memória RAM",
  ssd: "Armazenamento (SSD NVMe)",
  psu: "Fonte (PSU)",
  case: "Gabinete & Cooler",
  extra: "Monitor & Periféricos",
};

const BASE_WEIGHTS: Record<Objective, MetricTable> = {
  gaming: { game: 0.58, render: 0, cpuMulti: 0.04, cpuSingle: 0.05, ram: 0.1, ssd: 0.08, mobo: 0.05, psu: 0.04, cooling: 0.06 },
  arquitetura: { game: 0, render: 0.3, cpuMulti: 0.18, cpuSingle: 0.12, ram: 0.18, ssd: 0.08, mobo: 0.04, psu: 0.04, cooling: 0.06 },
  dev: { game: 0.04, render: 0, cpuMulti: 0.32, cpuSingle: 0.12, ram: 0.24, ssd: 0.14, mobo: 0.05, psu: 0.03, cooling: 0.06 },
  office: { game: 0.04, render: 0, cpuMulti: 0.22, cpuSingle: 0.2, ram: 0.2, ssd: 0.2, mobo: 0.05, psu: 0.04, cooling: 0.05 },
};

/** Teto útil de cada métrica por objetivo: acima disso a IA não gasta mais. */
const BASE_CAPS: Record<Objective, MetricTable> = {
  gaming: { game: 92, render: 100, cpuMulti: 70, cpuSingle: 100, ram: 75, ssd: 76, mobo: 65, psu: 65, cooling: 72 },
  arquitetura: { game: 100, render: 100, cpuMulti: 100, cpuSingle: 90, ram: 95, ssd: 86, mobo: 80, psu: 80, cooling: 88 },
  dev: { game: 45, render: 100, cpuMulti: 90, cpuSingle: 85, ram: 95, ssd: 86, mobo: 70, psu: 65, cooling: 72 },
  office: { game: 10, render: 100, cpuMulti: 45, cpuSingle: 55, ram: 45, ssd: 55, mobo: 40, psu: 30, cooling: 40 },
};

const GAME_CAP_BY_RESOLUTION: Record<Resolution, number> = { "1080p": 80, "1440p": 92, "4k": 100 };
const LAMBDA: Record<Objective, number> = { gaming: 0.12, arquitetura: 0.1, dev: 0.3, office: 1.2 };
/** Armazenamento mínimo confortável por uso (GB). */
const STORAGE_NEED: Record<Objective, number> = { gaming: 1000, arquitetura: 1000, dev: 1000, office: 500 };
/** Usos que consomem muito disco: dois ou mais juntos pedem 2TB. */
const HEAVY_STORAGE: Objective[] = ["gaming", "arquitetura", "dev"];

const brlFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
export const brl = (value: number) => brlFormatter.format(value);

export function clampBudget(value: number) {
  const safe = Number.isFinite(value) ? value : BUDGET_MIN;
  return Math.min(BUDGET_MAX, Math.max(BUDGET_MIN, Math.round(safe)));
}

export function normalizeInput(input: BuildInput): BuildInput {
  const objectives = OBJECTIVE_PRIORITY.filter((o) => input.objectives.includes(o));
  return {
    ...input,
    objectives: objectives.length > 0 ? objectives : ["office"],
    budget: clampBudget(input.budget),
    prompt: input.prompt.trim().slice(0, 500),
  };
}

/** Valida um BuildInput vindo de fora (corpo de requisição, resposta do LLM). */
export function sanitizeInput(raw: unknown): BuildInput {
  const data = (raw ?? {}) as Partial<Record<keyof BuildInput, unknown>>;
  const objectives = Array.isArray(data.objectives) ? data.objectives.filter((o): o is Objective => OBJECTIVE_PRIORITY.includes(o as Objective)) : [];
  return normalizeInput({
    budget: typeof data.budget === "number" ? data.budget : Number(data.budget),
    objectives,
    resolution: data.resolution === "1080p" || data.resolution === "4k" ? data.resolution : "1440p",
    brand: data.brand === "amd" || data.brand === "intel" ? data.brand : "any",
    includePeripherals: data.includePeripherals === true,
    silent: data.silent === true,
    prompt: typeof data.prompt === "string" ? data.prompt : "",
  });
}

export function sameInput(a: BuildInput, b: BuildInput) {
  return JSON.stringify(normalizeInput(a)) === JSON.stringify(normalizeInput(b));
}

export function objectivesLabel(objectives: Objective[], resolution?: Resolution) {
  return objectives.map((o) => (o === "gaming" && resolution ? `Gaming ${RESOLUTION_LABEL[resolution]}` : OBJECTIVE_LABEL[o])).join(" + ");
}

export function capacityLabel(gb: number) {
  return gb >= 1000 ? `${gb / 1000}TB` : `${gb}GB`;
}

export function scoreLabel(score: number) {
  if (score >= 85) return "Excelente";
  if (score >= 70) return "Muito bom";
  if (score >= 55) return "Bom";
  if (score >= 40) return "Básico";
  return "Limitado";
}

export function upscalerFor(gpu: GpuOption) {
  if (gpu.brand === "nvidia") return "DLSS";
  if (gpu.brand === "amd") return "FSR";
  if (gpu.brand === "intel") return "XeSS";
  return "FSR";
}

/** Consumo estimado do sistema inteiro (CPU + GPU + placa, RAM, SSD e fans). */
export function systemDraw(cpu: CpuOption, gpu: GpuOption) {
  return cpu.power + gpu.power + 100;
}

export function requiredPsuWatts(cpu: CpuOption, gpu: GpuOption) {
  return Math.max(gpu.minPsu, Math.ceil(systemDraw(cpu, gpu) * 1.3));
}

export function integratedGpu(cpu: CpuOption): GpuOption | null {
  if (!cpu.igpu) return null;
  return {
    id: `igpu-${cpu.id}`,
    name: `Vídeo integrado ${cpu.igpu.name} (no processador)`,
    search: "",
    brand: "integrated",
    vram: 0,
    power: 0,
    minPsu: 0,
    gaming: cpu.igpu.gaming,
    render: cpu.igpu.render,
    price: 0,
    note: "",
  };
}

export function estimateFps(game: number, resolution: Resolution) {
  return Math.max(5, Math.round(((game * 1.5 + 5) * FPS_RES_FACTOR[resolution]) / 5) * 5);
}

function storageNeedFor(objectives: Objective[]) {
  const heavy = objectives.filter((o) => HEAVY_STORAGE.includes(o)).length;
  return heavy >= 2 ? 2000 : Math.max(...objectives.map((o) => STORAGE_NEED[o]));
}

/**
 * Combina os perfis dos objetivos escolhidos:
 * pesos = média (cada uso conta igual), tetos = o maior (o uso mais exigente
 * manda), custo = o menor (se um dos usos pede potência, vale gastar).
 */
function buildProfile(input: BuildInput, signals: PromptSignals): Profile {
  const objectives = input.objectives;
  const weights = {} as MetricTable;
  const caps = {} as MetricTable;
  for (const key of METRIC_KEYS) {
    weights[key] = objectives.reduce((sum, o) => sum + BASE_WEIGHTS[o][key], 0) / objectives.length;
    caps[key] = Math.max(...objectives.map((o) => BASE_CAPS[o][key]));
  }
  const gaming = objectives.includes("gaming");
  const silent = input.silent || signals.silent;
  const storageNeed = storageNeedFor(objectives);

  if (gaming) caps.game = GAME_CAP_BY_RESOLUTION[input.resolution];
  if (storageNeed >= 2000) {
    weights.ssd += 0.04;
    caps.ssd = Math.max(caps.ssd, 80);
  }
  if (signals.ultra || signals.games.some((g) => g.kind === "heavy")) {
    weights.game += 0.08;
    caps.game = Math.min(100, caps.game + 8);
  }
  if (signals.games.some((g) => g.kind === "competitive")) weights.cpuSingle += 0.06;
  if (signals.streaming) weights.cpuMulti += 0.08;
  if (signals.render) weights.render += objectives.includes("arquitetura") ? 0.08 : 0.06;
  if (signals.editing) {
    weights.cpuMulti += 0.05;
    weights.render += 0.04;
  }
  if (signals.ai) {
    // IA local depende de GPU com CUDA e VRAM: peso alto, mesmo em perfis de escritório/dev.
    weights.render += 0.3;
    weights.ram += 0.03;
  }
  if (signals.virtualization) {
    weights.ram += 0.08;
    weights.cpuMulti += 0.03;
  }
  if (silent) {
    weights.cooling += 0.07;
    weights.psu += 0.02;
    caps.cooling = 100;
    caps.psu = Math.max(caps.psu, 85);
  }

  return {
    weights,
    caps,
    lambda: Math.min(...objectives.map((o) => LAMBDA[o])),
    silent,
    wantsWifi: signals.wifi,
    resolution: gaming ? input.resolution : "1440p",
    storageNeed,
    signals,
  };
}

function analyzeCombo(combo: Combo, profile: Profile): ComboAnalysis {
  const { cpu, gpu, kit, ssd } = combo;
  const cpuEffective = Math.min(100, cpu.gaming * CPU_RES_FACTOR[profile.resolution]);
  const bottleneck = gpu.gaming > cpuEffective ? (gpu.gaming - cpuEffective) / gpu.gaming : 0;

  let game = gpu.gaming * (1 - 0.6 * bottleneck);
  if (gpu.brand !== "integrated" && gpu.vram < REQUIRED_VRAM[profile.resolution]) game *= 0.88;

  let render = gpu.render;
  if (gpu.brand !== "integrated") {
    if (gpu.vram >= 16) render *= 1.05;
    else if (gpu.vram <= 8) render *= 0.88;
  }
  if (profile.signals.ai && gpu.brand !== "nvidia") render *= 0.8;

  const metrics: MetricTable = {
    game,
    render: Math.min(100, render),
    cpuMulti: cpu.multi,
    cpuSingle: cpu.gaming,
    ram: combo.ram.score,
    ssd: ssd.capacity >= profile.storageNeed ? ssd.score : ssd.score * 0.55,
    mobo: combo.mobo.score,
    psu: combo.psu.score,
    cooling: profile.silent ? kit.cooling * 0.4 + kit.silence * 0.6 : kit.cooling,
  };

  let score = 0;
  let maxScore = 0;
  for (const key of METRIC_KEYS) {
    score += profile.weights[key] * Math.min(metrics[key], profile.caps[key]);
    maxScore += profile.weights[key] * profile.caps[key];
  }
  if (profile.wantsWifi && combo.mobo.wifi) score += 1.5;

  return { metrics, bottleneck, score, normalized: maxScore > 0 ? Math.min(100, (score / maxScore) * 100) : 0 };
}

export function comboPrice(combo: Combo) {
  return combo.cpu.price + combo.mobo.price + combo.ram.price + combo.gpu.price + combo.psu.price + combo.kit.price + combo.ssd.price;
}

/**
 * Percorre todas as combinações compatíveis.
 * - mode "best": maior (pontuação − custo ponderado) dentro do limite.
 * - mode "cheapest": combinação compatível mais barata (fallback de orçamento).
 * `locked` fixa peças já escolhidas pelo usuário ("Completar com a IA").
 */
function searchCombos(input: BuildInput, profile: Profile, limit: number, mode: "best" | "cheapest", locked: PartialBuild = {}): Combo | null {
  let best: Combo | null = null;
  let bestValue = Number.NEGATIVE_INFINITY;
  const cpus = locked.cpu ? [locked.cpu] : CPUS.filter((cpu) => input.brand === "any" || cpu.brand === input.brand);

  for (const cpu of cpus) {
    const igpu = integratedGpu(cpu);
    let gpus: GpuOption[] = igpu ? [igpu, ...GPUS] : GPUS;
    if (locked.gpu === "integrated") gpus = igpu ? [igpu] : [];
    else if (locked.gpu) gpus = [locked.gpu];
    const coolers = (locked.kit ? [locked.kit] : CASE_KITS).filter((kit) => kit.maxTdp >= cpu.power && (!kit.usesBoxCooler || cpu.boxCooler));

    for (const mobo of locked.mobo ? [locked.mobo] : MOBOS) {
      if (mobo.socket !== cpu.socket || mobo.maxCpuPower < cpu.power) continue;
      const kits = coolers.filter((kit) => kit.formFactors.includes(mobo.formFactor));

      for (const ram of locked.ram ? [locked.ram] : RAMS) {
        if (ram.memory !== mobo.memory) continue;
        const platformPrice = cpu.price + mobo.price + ram.price;
        if (platformPrice > limit) continue;

        for (const gpu of gpus) {
          const minWatts = requiredPsuWatts(cpu, gpu);

          for (const psu of locked.psu ? [locked.psu] : PSUS) {
            if (psu.watts < minWatts) continue;

            for (const kit of kits) {
              for (const ssd of locked.ssd ? [locked.ssd] : SSDS) {
                const combo: Combo = { cpu, mobo, ram, gpu, psu, kit, ssd };
                const total = comboPrice(combo);
                if (total > limit) continue;
                const value = mode === "cheapest" ? -total : analyzeCombo(combo, profile).score - (profile.lambda * total) / 1000;
                if (value > bestValue) {
                  bestValue = value;
                  best = combo;
                }
              }
            }
          }
        }
      }
    }
  }
  return best;
}

function pickPeripheralKit(input: BuildInput, signals: PromptSignals): PeripheralKit {
  const primary = input.objectives[0];
  const chains: Record<Objective, string[]> = {
    gaming: input.resolution === "4k" ? ["g4k", "g1440", "g1080", "basic"] : input.resolution === "1440p" ? ["g1440", "g1080", "basic"] : ["g1080", "basic"],
    arquitetura: ["creator", "dual", "basic"],
    dev: ["dual", "basic"],
    office: signals.dualMonitor ? ["dual", "basic"] : ["basic"],
  };
  const options = chains[primary].map((id) => PERIPHERAL_KITS[id]);
  return options.find((kit) => kit.price <= input.budget * 0.3) ?? options[options.length - 1];
}

function tierFor(pcTotal: number) {
  if (pcTotal < 3500) return "Entrada";
  if (pcTotal < 7000) return "Intermediária";
  if (pcTotal < 12000) return "Avançada";
  return "Entusiasta";
}

function describeParts(combo: Combo, input: BuildInput, profile: Profile, analysis: ComboAnalysis, peripherals: PeripheralKit | null): RecommendedPart[] {
  const { cpu, gpu, mobo, ram, ssd, psu, kit } = combo;
  const objectives = input.objectives;
  const has = (o: Objective) => objectives.includes(o);
  const res = RESOLUTION_LABEL[profile.resolution];
  const bottleneckPct = Math.round(analysis.bottleneck * 100);
  const draw = systemDraw(cpu, gpu);
  const margin = Math.round(((psu.watts - draw) / draw) * 100);
  const fps = estimateFps(analysis.metrics.game, profile.resolution);
  const integrated = gpu.brand === "integrated";

  // CPU: um trecho por uso escolhido.
  const cpuFragments: Record<Objective, string> = {
    gaming: integrated
      ? "Sem GPU dedicada por enquanto, a prioridade foi uma base sólida para receber uma placa de vídeo depois."
      : `Para jogos em ${res}, ${bottleneckPct <= 8 ? `acompanha a ${gpu.search} sem gargalo relevante` : `aproveita ~${100 - bottleneckPct}% do potencial da ${gpu.search}`}.`,
    arquitetura: `${cpu.multi >= 85 ? "Muitos núcleos aceleram renders em CPU (V-Ray, Corona, Cycles)" : "Equilibra núcleos para render e clock alto"}, e o desempenho por núcleo mantém o Revit fluido.`,
    dev: cpu.multi >= 80 ? "Compila projetos grandes e roda containers e VMs em paralelo com folga." : "Compila e roda os containers do dia a dia com tempo de build baixo.",
    office: "Sobra desempenho para Office, aulas online e dezenas de abas.",
  };
  const streamingNote = profile.signals.streaming && cpu.multi >= 60 ? " Os núcleos extras ajudam no encode do stream (OBS)." : "";

  // GPU
  let gpuReason: string;
  if (integrated) {
    gpuReason = has("gaming")
      ? `O orçamento não comporta uma GPU dedicada sem sacrificar o resto. O ${cpu.igpu?.name} roda e-sports leves em 720p/1080p no baixo; uma RTX 5060 ou RX 9060 XT é o primeiro upgrade recomendado.`
      : `Sem placa dedicada: o ${cpu.igpu?.name} atende ${has("dev") ? "IDEs, navegador e múltiplos monitores" : "Office, vídeos em 4K e videochamadas"} e economiza no orçamento e na conta de luz. Dá para instalar uma GPU dedicada depois.`;
  } else {
    const gpuFragments: string[] = [];
    if (has("gaming")) gpuFragments.push(`Estimativa de ~${fps} FPS em jogos AAA no ${res} (Ultra, sem upscaling) — mais com ${upscalerFor(gpu)} — e ${gpu.vram}GB de VRAM ${gpu.vram >= REQUIRED_VRAM[profile.resolution] ? "adequados" : "no limite"} para essa resolução.`);
    if (has("arquitetura")) gpuFragments.push(gpu.brand === "nvidia" ? "CUDA/OptiX acelera Blender (Cycles), Lumion, D5 Render e Twinmotion." : "Para render OptiX/CUDA a NVIDIA seria preferível; esta venceu no custo-benefício.");
    if (gpuFragments.length === 0) gpuFragments.push(`Garante múltiplos monitores e aceleração de interface${profile.signals.ai && gpu.brand === "nvidia" ? ", além de CUDA para modelos de IA locais" : ""}.`);
    gpuReason = `${gpu.note} ${gpuFragments.join(" ")}`;
  }

  // RAM: a mensagem do uso mais exigente.
  let ramReason: string;
  if (has("arquitetura")) {
    ramReason = ram.capacity >= 64 ? "64GB comportam modelos BIM grandes e cenas complexas sem usar o disco como memória." : ram.capacity >= 32 ? "32GB é o mínimo confortável para Revit + Lumion; 64GB é o próximo passo." : "16GB limitam projetos BIM grandes — priorize o upgrade para 32GB.";
  } else if (has("dev")) {
    ramReason = ram.capacity >= 64 ? "64GB rodam Docker, várias VMs, emuladores e IDEs simultaneamente." : ram.capacity >= 32 ? "32GB dão folga para Docker, IDE, navegador e emulador ao mesmo tempo." : "16GB funcionam para web leve; 32GB são recomendados para containers.";
  } else if (has("gaming")) {
    ramReason = ram.capacity >= 32 ? "32GB evitam travadas (stutter) em jogos modernos com Discord e navegador abertos." : "16GB atendem a maioria dos jogos atuais; 32GB é o upgrade natural.";
  } else {
    ramReason = "Dual channel deixa o sistema fluido por anos para estudo e trabalho.";
  }

  // SSD: considera a soma dos usos (ex.: arquitetura + jogos enche 500GB rápido).
  const heavyUses = objectives.filter((o) => HEAVY_STORAGE.includes(o));
  const ssdReason =
    heavyUses.length >= 2
      ? `Como o PC vai ser usado para ${heavyUses.map((o) => OBJECTIVE_LABEL[o]).join(" e ")}, a IA priorizou espaço: jogos AAA ocupam 100–150GB cada e projetos/bibliotecas crescem rápido — ${capacityLabel(ssd.capacity)} evitam ficar apagando arquivos.`
      : has("gaming")
        ? `Com ${capacityLabel(ssd.capacity)}, cabem vários jogos atuais (100–150GB cada).`
        : has("arquitetura")
          ? `Com ${capacityLabel(ssd.capacity)}, bibliotecas de texturas e projetos ficam no disco rápido.`
          : has("dev")
            ? `Com ${capacityLabel(ssd.capacity)}, repositórios, imagens Docker e SDKs carregam rápido.`
            : `Com ${capacityLabel(ssd.capacity)}, sobra espaço para documentos e arquivos de estudo.`;

  const parts: RecommendedPart[] = [
    {
      category: "cpu",
      name: cpu.name,
      price: cpu.price,
      reason: `${cpu.note} ${objectives.slice(0, 2).map((o) => cpuFragments[o]).join(" ")}${streamingNote}`,
      specs: [cpu.socket, `~${cpu.power}W`, cpu.igpu ? `iGPU ${cpu.igpu.name}` : "Sem vídeo integrado", cpu.boxCooler ? "Cooler incluso" : "Sem cooler box"],
      searchTerms: [cpu.search],
    },
    {
      category: "gpu",
      name: gpu.name,
      price: gpu.price,
      reason: gpuReason,
      specs: integrated ? ["Integrada ao CPU", "Sem custo extra"] : [`${gpu.vram}GB VRAM`, `~${gpu.power}W`, `Fonte ${gpu.minPsu}W+`],
      searchTerms: integrated ? [] : [gpu.search],
    },
    {
      category: "mobo",
      name: mobo.name,
      price: mobo.price,
      reason: `${mobo.note} Socket ${mobo.socket} compatível com o ${cpu.search}, memória ${mobo.memory} e formato ${mobo.formFactor}${mobo.wifi ? ", com Wi-Fi integrado" : ""}.`,
      specs: [mobo.socket, mobo.memory, mobo.formFactor, mobo.wifi ? "Wi-Fi" : "Sem Wi-Fi"],
      searchTerms: [mobo.search],
    },
    {
      category: "ram",
      name: ram.name,
      price: ram.price,
      reason: `${ram.note} ${ramReason}`,
      specs: [`${ram.capacity}GB`, ram.memory, "Dual channel"],
      searchTerms: [ram.search],
    },
    {
      category: "ssd",
      name: ssd.name,
      price: ssd.price,
      reason: `${ssd.note} ${ssdReason}`,
      specs: [capacityLabel(ssd.capacity), "NVMe M.2", "PCIe 4.0"],
      searchTerms: [ssd.search],
    },
    {
      category: "psu",
      name: psu.name,
      price: psu.price,
      reason: `${psu.note} Consumo estimado de ~${draw}W: a fonte de ${psu.watts}W dá ${margin}% de folga${gpu.minPsu ? ` e atende a recomendação do fabricante da GPU (${gpu.minPsu}W)` : ""}.`,
      specs: [`${psu.watts}W`, psu.rating],
      searchTerms: [psu.search],
    },
    {
      category: "case",
      name: kit.name,
      price: kit.price,
      reason: `${kit.note} ${kit.usesBoxCooler ? `O cooler box dá conta dos ~${cpu.power}W do ${cpu.search}.` : `O cooler suporta até ~${kit.maxTdp}W e o ${cpu.search} dissipa ~${cpu.power}W.`}${profile.silent ? " Escolhido com prioridade para baixo ruído." : ""}`,
      specs: [kit.usesBoxCooler ? "Cooler box" : `Cooler até ${kit.maxTdp}W`, kit.formFactors.join(" / ")],
      searchTerms: kit.coolerSearch ? [kit.search, kit.coolerSearch] : [kit.search],
    },
  ];

  if (peripherals) {
    parts.push({
      category: "extra",
      name: peripherals.name,
      price: peripherals.price,
      reason: `${peripherals.note} Valor reservado do orçamento total antes de montar o PC.`,
      specs: ["Monitor", "Teclado", "Mouse"],
      searchTerms: [peripherals.search],
    });
  }
  return parts;
}

const PLATFORM_NOTE: Record<Socket, string> = {
  AM5: "Plataforma AM5: a AMD mantém suporte a novas gerações, permitindo trocar só o processador no futuro.",
  AM4: "Plataforma AM4: madura e barata, porém sem novas gerações de processador — upgrade futuro limitado.",
  LGA1200: "Plataforma LGA1200: descontinuada, sem upgrades de processador disponíveis.",
  LGA1700: "Plataforma LGA1700: custo-benefício alto, mas é fim de linha para upgrades de CPU Intel.",
  LGA1851: "Plataforma LGA1851 (Core Ultra 200S): geração atual da Intel, com DDR5 e PCIe 5.0.",
};

function buildInsights(combo: Combo, input: BuildInput, profile: Profile, analysis: ComboAnalysis, total: number, overBudget: boolean): Insight[] {
  const { cpu, gpu, ram, ssd } = combo;
  const has = (o: Objective) => input.objectives.includes(o);
  const insights: Insight[] = [];
  const res = RESOLUTION_LABEL[profile.resolution];
  const integrated = gpu.brand === "integrated";
  const fps = estimateFps(analysis.metrics.game, profile.resolution);

  if (overBudget) {
    insights.push({
      tone: "warning",
      text: `Nenhuma combinação compatível cabe em ${brl(input.budget)}. Exibimos a build mínima viável (${brl(total)}) — aumente o orçamento${input.includePeripherals ? " ou desative os periféricos" : ""}.`,
    });
  }

  if (has("gaming")) {
    if (integrated) {
      insights.push({ tone: "warning", text: "Para jogar com placa de vídeo dedicada, o orçamento mínimo sugerido é de ~R$ 3.500 (sem periféricos)." });
    } else if (analysis.bottleneck > 0.1) {
      insights.push({ tone: "warning", text: `Gargalo estimado de ${Math.round(analysis.bottleneck * 100)}% da CPU sobre a GPU em ${res}. Um processador mais forte é o próximo upgrade ideal.` });
    } else {
      insights.push({ tone: "success", text: `CPU e GPU equilibradas em ${res}: gargalo estimado abaixo de 10%.` });
    }
  }

  if (input.objectives.length > 1) {
    insights.push({ tone: "info", text: `Build pensada para ${input.objectives.map((o) => OBJECTIVE_LABEL[o]).join(" + ")}: a IA equilibrou as prioridades de cada uso em vez de otimizar só um deles.` });
  }
  if (profile.storageNeed >= 2000 && ssd.capacity >= 2000) {
    insights.push({ tone: "success", text: `Armazenamento de ${capacityLabel(ssd.capacity)}: com mais de um uso pesado, 500GB–1TB lotam rápido. Se precisar de mais, um segundo SSD pode ser instalado depois.` });
  } else if (ssd.capacity < profile.storageNeed) {
    insights.push({ tone: "warning", text: `O SSD de ${capacityLabel(ssd.capacity)} ficou abaixo do ideal (${capacityLabel(profile.storageNeed)}) para o seu uso — é o primeiro upgrade a considerar.` });
  }

  for (const game of profile.signals.games.slice(0, 2)) {
    if (integrated) continue;
    insights.push(
      game.kind === "heavy"
        ? { tone: "info", text: `${game.name}: ~${fps} FPS estimados em ${res} no Ultra sem upscaling; com ${upscalerFor(gpu)} ativado, espere de 30% a 60% a mais.` }
        : { tone: "info", text: `${game.name} é competitivo e leve: espere bem mais de ${Math.min(400, fps * 2)} FPS — nesse caso a CPU é o fator principal.` },
    );
  }

  insights.push({ tone: "info", text: PLATFORM_NOTE[cpu.socket] });

  const leftover = input.budget - total;
  if (!overBudget && leftover >= Math.max(800, input.budget * 0.15)) {
    insights.push({
      tone: "success",
      text: `A IA economizou ${brl(leftover)}: acima disso o ganho para ${input.objectives.map((o) => OBJECTIVE_LABEL[o]).join(" + ")} seria pequeno. Considere usar a sobra em um bom monitor, periféricos ou um nobreak.`,
    });
  }

  if (has("arquitetura") && gpu.brand === "nvidia") {
    insights.push({ tone: "success", text: "GPU NVIDIA escolhida por CUDA/OptiX: acelera Blender (Cycles), Lumion, D5 Render e V-Ray GPU." });
  }
  if (profile.signals.ai) {
    insights.push(
      gpu.brand === "nvidia"
        ? { tone: "success", text: `CUDA disponível: a ${gpu.search} roda modelos de IA locais com ${gpu.vram}GB de VRAM.` }
        : { tone: "warning", text: "Para IA local (PyTorch, Stable Diffusion, LLMs), GPUs NVIDIA com CUDA têm suporte bem mais amplo." },
    );
  }
  if (profile.signals.dualMonitor) {
    insights.push({ tone: "info", text: `Uso de 2+ monitores suportado pelas saídas ${integrated ? "HDMI/DisplayPort da placa-mãe" : "da placa de vídeo"} sem perda relevante de desempenho.` });
  }
  if (profile.signals.virtualization && ram.capacity < 32) {
    insights.push({ tone: "warning", text: "Para Docker, VMs e emuladores, 32GB de RAM são recomendados — é o primeiro upgrade desta build." });
  }
  if (profile.silent) {
    insights.push({ tone: "success", text: "Modo silêncio ativo: cooler, gabinete e fonte foram ponderados por baixo ruído e boa refrigeração." });
  }

  return insights;
}

function compatibilityFor(combo: Combo): CompatibilityCheck[] {
  const { cpu, gpu, mobo, ram, psu, kit } = combo;
  const integrated = gpu.brand === "integrated";
  return [
    { label: "Socket", detail: `${cpu.socket} no processador e na placa-mãe`, ok: cpu.socket === mobo.socket },
    { label: "VRM", detail: `Placa-mãe sustenta ~${mobo.maxCpuPower}W · CPU usa ~${cpu.power}W`, ok: mobo.maxCpuPower >= cpu.power },
    { label: "Memória", detail: `Placa-mãe ${mobo.memory} com kit ${ram.capacity}GB ${ram.memory}`, ok: mobo.memory === ram.memory },
    { label: "Fonte", detail: `~${systemDraw(cpu, gpu)}W estimados · fonte de ${psu.watts}W`, ok: psu.watts >= requiredPsuWatts(cpu, gpu) },
    {
      label: "Refrigeração",
      detail: kit.usesBoxCooler ? `Cooler box para CPU de ~${cpu.power}W` : `CPU ~${cpu.power}W · cooler até ${kit.maxTdp}W`,
      ok: kit.maxTdp >= cpu.power && (!kit.usesBoxCooler || cpu.boxCooler),
    },
    { label: "Gabinete", detail: `Formato ${mobo.formFactor} suportado`, ok: kit.formFactors.includes(mobo.formFactor) },
    { label: "Vídeo", detail: integrated ? `Saída de vídeo pelo ${cpu.igpu?.name}` : `GPU PCIe x16 · requer ${gpu.minPsu}W`, ok: integrated ? cpu.igpu !== null : true },
  ];
}

/**
 * Executa o motor local completo e monta o resultado no formato da API.
 * `signalsOverride`: sinais extraídos do texto pelo Gemini (senão, palavras-chave).
 */
export function computeLocalBuild(rawInput: BuildInput, locked: PartialBuild = {}, signalsOverride?: PromptSignals): BuildResult {
  const input = normalizeInput(rawInput);
  const signals = signalsOverride ?? parsePrompt(input.prompt);
  const profile = buildProfile(input, signals);
  const peripherals = input.includePeripherals ? pickPeripheralKit(input, signals) : null;
  const pcBudget = input.budget - (peripherals?.price ?? 0);

  const combo = searchCombos(input, profile, pcBudget, "best", locked) ?? searchCombos(input, profile, Number.POSITIVE_INFINITY, "cheapest", locked);
  if (!combo) throw new Error("As peças fixadas são incompatíveis entre si: nenhuma combinação encontrada.");

  const analysis = analyzeCombo(combo, profile);
  const pcTotal = comboPrice(combo);
  const total = pcTotal + (peripherals?.price ?? 0);
  const overBudget = total > input.budget;
  const { cpu, gpu, mobo, ram } = combo;
  const integrated = gpu.brand === "integrated";

  const interpretation = [
    ...input.objectives.map((o) => (o === "gaming" ? `Gaming ${RESOLUTION_LABEL[input.resolution]}` : OBJECTIVE_LABEL[o])),
    `Teto de ${brl(input.budget)}`,
    input.brand === "any" ? "Marca indiferente" : `Preferência ${input.brand === "amd" ? "AMD" : "Intel"}`,
    ...(profile.silent ? ["Foco em silêncio"] : []),
    ...(peripherals ? ["Com monitor e periféricos"] : []),
    ...(profile.storageNeed >= 2000 ? ["Armazenamento extra (2TB+)"] : []),
    ...signals.games.map((game) => `${game.name} (${game.kind === "heavy" ? "AAA pesado" : "competitivo"})`),
    ...(signals.ultra ? ["Gráficos no Ultra"] : []),
    ...(signals.streaming ? ["Streaming"] : []),
    ...(signals.dualMonitor ? ["Múltiplos monitores"] : []),
    ...(signals.render ? ["Render 3D / BIM"] : []),
    ...(signals.editing ? ["Edição de vídeo"] : []),
    ...(signals.ai ? ["IA local / CUDA"] : []),
    ...(signals.virtualization ? ["Docker / VMs"] : []),
    ...(signals.wifi ? ["Wi-Fi integrado"] : []),
  ];

  return {
    parts: describeParts(combo, input, profile, analysis, peripherals),
    total,
    budget: input.budget,
    tier: tierFor(pcTotal),
    platform: `${cpu.socket} · ${mobo.memory}`,
    score: Math.round(analysis.normalized),
    performance: [
      { label: "Jogos", value: Math.round(analysis.metrics.game) },
      { label: "Render & Criação", value: Math.round(Math.min(100, analysis.metrics.render * 0.6 + cpu.multi * 0.4)) },
      { label: "Multitarefa & Código", value: Math.round(cpu.multi * 0.55 + ram.score * 0.45) },
    ],
    fpsEstimate: input.objectives.includes("gaming") && !integrated ? estimateFps(analysis.metrics.game, input.resolution) : null,
    bottleneck: analysis.bottleneck,
    compatibility: compatibilityFor(combo),
    insights: buildInsights(combo, input, profile, analysis, total, overBudget),
    interpretation,
    overBudget,
    source: "local",
    input,
  };
}

/**
 * "Completar com a IA": mantém as peças escolhidas e preenche o resto com a
 * melhor combinação compatível. Retorna null se as peças fixadas não combinam.
 */
export function completeBuild(locked: PartialBuild, rawInput: BuildInput): Combo | null {
  const input = normalizeInput(rawInput);
  const profile = buildProfile(input, parsePrompt(input.prompt));
  return searchCombos(input, profile, input.budget, "best", locked) ?? searchCombos(input, profile, Number.POSITIVE_INFINITY, "cheapest", locked);
}

/* ============================================================================
 * AVALIAÇÃO DE UMA BUILD DO USUÁRIO ("Monte você mesmo" e "Analisar PDF")
 * Aceita peças faltando ou incompatíveis e explica o que está bom ou ruim.
 * ==========================================================================*/

export interface ObjectiveFit {
  objective: Objective;
  score: number;
  label: string;
}

export interface BuildEvaluation {
  missing: PartCategory[];
  checks: CompatibilityCheck[];
  total: number;
  fits: ObjectiveFit[];
  overall: number | null;
  bottleneck: number | null;
  fpsEstimate: number | null;
  verdict: { tone: Insight["tone"]; title: string; text: string };
  tips: Insight[];
}

/** Peças neutras usadas só para pontuar quando algo não foi informado. */
const NEUTRAL_MOBO: MoboOption = { id: "neutral-mobo", name: "", search: "", price: 0, note: "", socket: "AM5", memory: "DDR5", formFactor: "ATX", wifi: false, maxCpuPower: 300, score: 50 };
const NEUTRAL_PSU: PsuOption = { id: "neutral-psu", name: "", search: "", price: 0, note: "", watts: 2000, rating: "", score: 50 };
const NEUTRAL_KIT: CaseKitOption = { id: "neutral-kit", name: "", search: "", price: 0, note: "", coolerSearch: null, maxTdp: 400, formFactors: ["mATX", "ATX"], usesBoxCooler: false, cooling: 50, silence: 50 };
const NEUTRAL_SSD: SsdOption = { id: "neutral-ssd", name: "", search: "", price: 0, note: "", capacity: 1000, score: 50, kind: "nvme" };
const NEUTRAL_RAM: RamOption = { id: "neutral-ram", name: "", search: "", price: 0, note: "", memory: "DDR5", capacity: 16, score: 40 };

export function resolveGpu(build: PartialBuild): GpuOption | null {
  if (!build.gpu) return null;
  if (build.gpu === "integrated") return build.cpu ? integratedGpu(build.cpu) : null;
  return build.gpu;
}

export function buildPartsPrice(build: PartialBuild) {
  const gpu = build.gpu && build.gpu !== "integrated" ? build.gpu.price : 0;
  return (build.cpu?.price ?? 0) + (build.mobo?.price ?? 0) + (build.ram?.price ?? 0) + gpu + (build.ssd?.price ?? 0) + (build.psu?.price ?? 0) + (build.kit?.price ?? 0);
}

function partialChecks(build: PartialBuild): CompatibilityCheck[] {
  const { cpu, mobo, ram, psu, kit } = build;
  const gpu = resolveGpu(build);
  const checks: CompatibilityCheck[] = [];
  if (cpu && mobo) {
    checks.push({ label: "Socket", detail: cpu.socket === mobo.socket ? `${cpu.socket} no processador e na placa-mãe` : `Processador ${cpu.socket} não encaixa em placa-mãe ${mobo.socket}`, ok: cpu.socket === mobo.socket });
    checks.push({ label: "VRM", detail: `Placa-mãe sustenta ~${mobo.maxCpuPower}W · CPU usa ~${cpu.power}W`, ok: mobo.maxCpuPower >= cpu.power });
  }
  if (mobo && ram) {
    checks.push({ label: "Memória", detail: mobo.memory === ram.memory ? `${ram.memory} na placa e no kit` : `Placa-mãe aceita ${mobo.memory}, mas a memória é ${ram.memory}`, ok: mobo.memory === ram.memory });
  }
  if (cpu && build.gpu === "integrated") {
    checks.push({ label: "Vídeo", detail: cpu.igpu ? `Saída de vídeo pelo ${cpu.igpu.name}` : `O ${cpu.search} não tem vídeo integrado: é preciso uma placa de vídeo`, ok: cpu.igpu !== null });
  }
  if (cpu && gpu && psu) {
    const needed = requiredPsuWatts(cpu, gpu);
    checks.push({ label: "Fonte", detail: psu.watts >= needed ? `~${systemDraw(cpu, gpu)}W estimados · fonte de ${psu.watts}W` : `Fonte de ${psu.watts}W abaixo do recomendado (${needed}W)`, ok: psu.watts >= needed });
  }
  if (cpu && kit) {
    const ok = kit.maxTdp >= cpu.power && (!kit.usesBoxCooler || cpu.boxCooler);
    checks.push({
      label: "Refrigeração",
      detail: kit.usesBoxCooler && !cpu.boxCooler ? `O ${cpu.search} não vem com cooler box` : `CPU ~${cpu.power}W · cooler até ${kit.maxTdp}W`,
      ok,
    });
  }
  if (mobo && kit) {
    checks.push({ label: "Gabinete", detail: kit.formFactors.includes(mobo.formFactor) ? `Formato ${mobo.formFactor} suportado` : `Gabinete não comporta placa ${mobo.formFactor}`, ok: kit.formFactors.includes(mobo.formFactor) });
  }
  return checks;
}

function singleProfile(objectives: Objective[], resolution: Resolution, prompt = ""): Profile {
  return buildProfile({ budget: BUDGET_MAX, objectives, resolution, brand: "any", includePeripherals: false, silent: false, prompt }, parsePrompt(prompt));
}

export function evaluateBuild(build: PartialBuild, rawObjectives: Objective[], resolution: Resolution, prompt = ""): BuildEvaluation {
  const objectives = normalizeInput({ budget: BUDGET_MIN, objectives: rawObjectives, resolution, brand: "any", includePeripherals: false, silent: false, prompt }).objectives;
  const has = (o: Objective) => objectives.includes(o);
  const gpu = resolveGpu(build);
  const checks = partialChecks(build);
  const missing = (["cpu", "gpu", "mobo", "ram", "ssd", "psu", "case"] as PartCategory[]).filter((category) => {
    if (category === "case") return !build.kit;
    if (category === "gpu") return !build.gpu;
    return !build[category as keyof PartialBuild];
  });
  const total = buildPartsPrice(build);
  const tips: Insight[] = [];

  // Sem CPU e GPU não há como estimar desempenho.
  if (!build.cpu || !gpu) {
    return {
      missing,
      checks,
      total,
      fits: [],
      overall: null,
      bottleneck: null,
      fpsEstimate: null,
      verdict: {
        tone: "info",
        title: build.cpu && build.gpu === "integrated" && !build.cpu.igpu ? "Escolha uma placa de vídeo" : "Escolha processador e placa de vídeo",
        text: "Com CPU e GPU definidos a IA já consegue estimar o desempenho para o seu uso.",
      },
      tips,
    };
  }

  const combo: Combo = {
    cpu: build.cpu,
    gpu,
    mobo: build.mobo ?? { ...NEUTRAL_MOBO, socket: build.cpu.socket, memory: build.ram?.memory ?? "DDR5" },
    ram: build.ram ?? NEUTRAL_RAM,
    ssd: build.ssd ?? NEUTRAL_SSD,
    psu: build.psu ?? NEUTRAL_PSU,
    kit: build.kit ?? NEUTRAL_KIT,
  };
  const profile = singleProfile(objectives, resolution, prompt);
  const analysis = analyzeCombo(combo, profile);
  const fits = objectives.map((objective) => {
    const score = Math.round(analyzeCombo(combo, singleProfile([objective], resolution, prompt)).normalized);
    return { objective, score, label: scoreLabel(score) };
  });
  const overall = Math.round(analysis.normalized);
  const failing = checks.filter((check) => !check.ok);
  const res = RESOLUTION_LABEL[profile.resolution];

  // Correções de compatibilidade, com sugestão concreta do catálogo.
  const { mobo, ram, psu, kit, ssd } = build;
  const cpu = combo.cpu;
  if (mobo && (cpu.socket !== mobo.socket || mobo.maxCpuPower < cpu.power)) {
    const fix = MOBOS.filter((m) => m.socket === cpu.socket && m.maxCpuPower >= cpu.power).sort((a, b) => a.price - b.price)[0];
    tips.push({ tone: "warning", text: fix ? `Placa-mãe incompatível com o ${cpu.search}. Uma opção que funciona: ${fix.name} (${brl(fix.price)}).` : `Nenhuma placa-mãe do catálogo atende o ${cpu.search}.` });
  }
  if (mobo && ram && mobo.memory !== ram.memory) {
    const fix = RAMS.filter((r) => r.memory === mobo.memory && r.capacity === ram.capacity)[0] ?? RAMS.find((r) => r.memory === mobo.memory);
    tips.push({ tone: "warning", text: `Memória ${ram.memory} não funciona nessa placa (${mobo.memory}).${fix ? ` Troque por: ${fix.name} (${brl(fix.price)}).` : ""}` });
  }
  if (build.gpu === "integrated" && !cpu.igpu) {
    tips.push({ tone: "warning", text: `O ${cpu.search} não tem vídeo integrado — sem placa de vídeo o PC não dá imagem.` });
  }
  if (psu && psu.watts < requiredPsuWatts(cpu, gpu)) {
    const needed = requiredPsuWatts(cpu, gpu);
    const fix = PSUS.filter((p) => p.watts >= needed).sort((a, b) => a.price - b.price)[0];
    tips.push({ tone: "warning", text: `Fonte fraca: o conjunto pede pelo menos ${needed}W.${fix ? ` Sugestão: ${fix.name} (${brl(fix.price)}).` : ""}` });
  }
  if (kit && (kit.maxTdp < cpu.power || (kit.usesBoxCooler && !cpu.boxCooler))) {
    const fix = CASE_KITS.filter((k) => !k.usesBoxCooler && k.maxTdp >= cpu.power).sort((a, b) => a.price - b.price)[0];
    tips.push({ tone: "warning", text: `Refrigeração insuficiente para o ${cpu.search}.${fix ? ` Sugestão: ${fix.name} (${brl(fix.price)}).` : ""}` });
  }
  if (mobo && kit && !kit.formFactors.includes(mobo.formFactor)) {
    tips.push({ tone: "warning", text: `O gabinete escolhido só aceita placas ${kit.formFactors.join("/")}; a placa-mãe é ${mobo.formFactor}.` });
  }

  // Adequação ao uso.
  if (has("gaming")) {
    if (gpu.brand === "integrated") tips.push({ tone: "warning", text: "Para jogar, o vídeo integrado só roda títulos leves em resoluções baixas. Uma GPU dedicada faz enorme diferença." });
    else if (analysis.bottleneck > 0.15) {
      const better = CPUS.filter((c) => c.socket === cpu.socket && c.gaming * CPU_RES_FACTOR[profile.resolution] >= gpu.gaming).sort((a, b) => a.price - b.price)[0];
      tips.push({ tone: "warning", text: `Gargalo de ~${Math.round(analysis.bottleneck * 100)}%: o processador segura a ${gpu.search} em ${res}.${better ? ` No mesmo socket, o ${better.search} (${brl(better.price)}) resolve.` : ""}` });
    } else tips.push({ tone: "success", text: `CPU e GPU equilibradas para jogos em ${res}.` });
    if (gpu.brand !== "integrated" && gpu.vram < REQUIRED_VRAM[profile.resolution]) tips.push({ tone: "warning", text: `${gpu.vram}GB de VRAM é pouco para ${res} no Ultra; o recomendado é ${REQUIRED_VRAM[profile.resolution]}GB ou mais.` });
  }
  if (has("arquitetura")) {
    if (gpu.brand !== "nvidia") tips.push({ tone: "info", text: "Para render em GPU (Lumion, D5, Blender OptiX), placas NVIDIA com CUDA rendem bem mais." });
    if (ram && ram.capacity < 32) tips.push({ tone: "warning", text: `${ram.capacity}GB de RAM é pouco para Revit/Lumion — o recomendado são 32GB ou mais.` });
  }
  if (has("dev") && ram && ram.capacity < 32) tips.push({ tone: "warning", text: "Para Docker, VMs e IDEs pesadas, 32GB de RAM evitam lentidão." });
  if (ram && ram.capacity < 16) tips.push({ tone: "warning", text: `${ram.capacity}GB de RAM deixa o sistema lento até para navegar — 16GB é o mínimo atual.` });
  if (ssd) {
    const need = profile.storageNeed;
    if (ssd.kind === "hdd") tips.push({ tone: "warning", text: "HD mecânico como disco principal deixa tudo lento. Um SSD NVMe é o upgrade com mais impacto por real." });
    else if (ssd.capacity < need) {
      tips.push({
        tone: "warning",
        text:
          objectives.length > 1
            ? `${capacityLabel(ssd.capacity)} é pouco para ${objectives.map((o) => OBJECTIVE_LABEL[o]).join(" + ")} — projetos e jogos disputam espaço. Recomendado: ${capacityLabel(need)} ou mais.`
            : `${capacityLabel(ssd.capacity)} pode encher rápido; para esse uso o ideal é ${capacityLabel(need)}.`,
      });
    }
  }
  const heavyGpu = gpu.brand !== "integrated" && gpu.gaming >= 70;
  if (heavyGpu && !has("gaming") && !has("arquitetura")) {
    tips.push({ tone: "info", text: `A ${gpu.search} é muito mais do que ${objectives.map((o) => OBJECTIVE_LABEL[o]).join(" e ")} exige — dá para economizar bastante nela.` });
  }

  const missingText = missing.length ? ` Faltam: ${missing.map((m) => CATEGORY_LABEL[m]).join(", ")}.` : "";
  const verdict: BuildEvaluation["verdict"] =
    failing.length > 0
      ? { tone: "warning", title: "Há incompatibilidades", text: `${failing.length} problema(s) impedem essa build de funcionar como está. Veja as correções sugeridas.${missingText}` }
      : overall >= 70
        ? { tone: "success", title: `${scoreLabel(overall)} para o seu uso`, text: `Pontuação ${overall}/100 para ${objectivesLabel(objectives, has("gaming") ? resolution : undefined)}.${missingText}` }
        : overall >= 45
          ? { tone: "info", title: "Atende, com ressalvas", text: `Pontuação ${overall}/100. Veja abaixo onde vale melhorar.${missingText}` }
          : { tone: "warning", title: "Fraca para o seu uso", text: `Pontuação ${overall}/100 — essa configuração vai sofrer no que você pretende fazer.${missingText}` };

  return {
    missing,
    checks,
    total,
    fits,
    overall,
    bottleneck: has("gaming") && gpu.brand !== "integrated" ? analysis.bottleneck : null,
    fpsEstimate: has("gaming") && gpu.brand !== "integrated" ? estimateFps(analysis.metrics.game, resolution) : null,
    verdict,
    tips,
  };
}

/* ============================================================================
 * EXPORTAÇÃO
 * ==========================================================================*/

export function buildSummaryText(result: BuildResult) {
  const { input } = result;
  const line = "-".repeat(60);
  const lines = [
    "SMARTBUILD AI — RESUMO DO ORÇAMENTO",
    `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
    line,
    `Uso: ${objectivesLabel(input.objectives, input.objectives.includes("gaming") ? input.resolution : undefined)}`,
    `Orçamento máximo: ${brl(input.budget)}`,
    `Preferências: marca ${input.brand === "any" ? "indiferente" : input.brand.toUpperCase()} · periféricos ${input.includePeripherals ? "sim" : "não"} · silêncio ${input.silent ? "sim" : "não"}`,
    ...(input.prompt ? [`Pedido: "${input.prompt}"`] : []),
    "",
    "PEÇAS RECOMENDADAS",
    line,
    ...result.parts.flatMap((part, index) => [
      `${index + 1}. ${CATEGORY_LABEL[part.category]}: ${part.name} — ${brl(part.price)}`,
      `   Motivo: ${part.reason}`,
      ...(part.searchTerms[0] ? [`   Buscar preço: ${googleShoppingUrl(part.searchTerms[0])}`] : []),
    ]),
    line,
    `TOTAL: ${brl(result.total)} (${((result.total / result.budget) * 100).toFixed(1).replace(".", ",")}% do orçamento)`,
    `Classe: Build ${result.tier} · Plataforma ${result.platform}`,
    `Desempenho estimado para o uso: ${result.score}/100${result.fpsEstimate ? ` · ~${result.fpsEstimate} FPS em AAA (Ultra)` : ""}`,
    "",
    "COMPATIBILIDADE",
    ...result.compatibility.map((check) => `[${check.ok ? "OK" : "ATENÇÃO"}] ${check.label}: ${check.detail}`),
    "",
    "OBSERVAÇÕES DA IA",
    ...result.insights.map((insight) => `- ${insight.text}`),
    "",
    "Preços estimados de referência (mercado brasileiro). Confira os links para o menor preço do dia.",
  ];
  return lines.join("\n");
}
