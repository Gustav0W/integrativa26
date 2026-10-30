import { CASE_KITS, CHIPSETS, CPUS, GPUS, MOBOS, PSUS, RAMS, REFERENCE_CPUS, REFERENCE_GPUS, SSDS, genericCooler, genericMobo, genericPsu, genericRam, genericStorage } from "./catalog";
import type { BrandPreference, CatalogItem, MemoryType, Objective, PartialBuild, PromptSignals, Resolution, SsdOption } from "./types";

/* ============================================================================
 * "IA" de linguagem natural local (offline).
 * Extrai intenções de textos livres e especificações de PDFs/orçamentos.
 * Quando o endpoint de LLM estiver ativo, ele substitui estas heurísticas.
 * ==========================================================================*/

/** Minúsculas e sem acentos; `keepLines` preserva quebras de linha (útil em orçamentos). */
export function normalizeText(text: string, keepLines = false) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(keepLines ? /[^\S\n]+/g : /\s+/g, " ");
}

const GAME_LIBRARY: { pattern: RegExp; name: string; kind: "heavy" | "competitive" }[] = [
  { pattern: /baldur/, name: "Baldur's Gate 3", kind: "heavy" },
  { pattern: /cyberpunk/, name: "Cyberpunk 2077", kind: "heavy" },
  { pattern: /alan wake/, name: "Alan Wake 2", kind: "heavy" },
  { pattern: /wukong|black myth/, name: "Black Myth: Wukong", kind: "heavy" },
  { pattern: /\bgta\b|grand theft/, name: "GTA V / GTA VI", kind: "heavy" },
  { pattern: /elden ring/, name: "Elden Ring", kind: "heavy" },
  { pattern: /red dead|rdr ?2/, name: "Red Dead Redemption 2", kind: "heavy" },
  { pattern: /hogwarts/, name: "Hogwarts Legacy", kind: "heavy" },
  { pattern: /starfield/, name: "Starfield", kind: "heavy" },
  { pattern: /flight sim|msfs/, name: "Microsoft Flight Simulator", kind: "heavy" },
  { pattern: /warzone|call of duty|\bcod\b/, name: "Call of Duty: Warzone", kind: "competitive" },
  { pattern: /valorant/, name: "Valorant", kind: "competitive" },
  { pattern: /\bcs ?2\b|counter.?strike/, name: "Counter-Strike 2", kind: "competitive" },
  { pattern: /fortnite/, name: "Fortnite", kind: "competitive" },
  { pattern: /league of legends|\blol\b/, name: "League of Legends", kind: "competitive" },
  { pattern: /minecraft/, name: "Minecraft", kind: "competitive" },
];

/** Sinais finos do pedido (jogos citados, streaming, IA local...). */
export function parsePrompt(prompt: string): PromptSignals {
  const text = normalizeText(prompt);
  return {
    games: GAME_LIBRARY.filter((game) => game.pattern.test(text)).map(({ name, kind }) => ({ name, kind })),
    ultra: /ultra|maxim|\bmax\b|4k|ray ?tracing|\brt\b|path ?tracing/.test(text),
    streaming: /stream|twitch|\bobs\b|\blive\b|transmit/.test(text),
    dualMonitor: /\b(dois|duas|2|tres|3|multiplos|varios)\s+monitor|dual.?monitor|multi.?monitor/.test(text),
    silent: /silenc|barulho|ruido|quiet|silent/.test(text),
    wifi: /wi-?fi|wireless/.test(text),
    render: /blender|render|lumion|revit|v-?ray|corona|unreal|\bd5\b|sketchup|autocad|archicad|3ds ?max|twinmotion/.test(text),
    editing: /premiere|davinci|after effects|edicao de video|editar video|edito video/.test(text),
    ai: /\bia\b|inteligencia artificial|\bllm|machine learning|deep learning|stable diffusion|cuda|ollama|pytorch|tensorflow/.test(text),
    virtualization: /docker|\bvms?\b|maquinas? virtua|virtualiza|kubernetes|android studio|emulador|\bwsl\b/.test(text),
  };
}

/* ----------------------------------------------------------------------------
 * Pedido em texto livre ("Conversar com a IA")
 * --------------------------------------------------------------------------*/

export interface ParsedRequest {
  budget: number | null;
  objectives: Objective[];
  resolution: Resolution | null;
  brand: BrandPreference | null;
  silent: boolean;
  peripherals: boolean | null;
  /** Ajuste relativo em mensagens de continuação ("mais barato", "mais potente"). */
  adjust: "cheaper" | "stronger" | null;
  /** O usuário quer trocar os usos ("só", "apenas") em vez de somar. */
  exclusive: boolean;
}

const OBJECTIVE_PATTERNS: Record<Objective, RegExp> = {
  gaming: /\bjog|\bgame|gamer|gaming|\bfps\b|steam|\bplay|valorant|fortnite|warzone|cyberpunk|baldur|\bgta\b|minecraft|counter.?strike|\bcs ?2\b|league of legends|elden ring|hogwarts/,
  arquitetura: /arquitet|revit|lumion|render|blender|sketchup|autocad|archicad|\bbim\b|\b3d\b|twinmotion|v-?ray|\bd5\b|modelagem|maquete|engenharia civil|design de interiores/,
  dev: /program|desenvolv|codigo|\bdev\b|docker|\bvms?\b|android studio|compil|software|back-?end|front-?end|full-?stack|\bti\b|machine learning|data science|ciencia de dados/,
  office: /escritorio|\boffice\b|estud|faculdade|\baula|trabalho|home office|planilha|excel|\bword\b|navegar|internet|escola|uso basico|dia a dia/,
};

function parseMoney(raw: string) {
  return Number(raw.replace(/\./g, "").replace(",", "."));
}

export function parseRequest(raw: string): ParsedRequest {
  const text = normalizeText(raw);

  let budget: number | null = null;
  // "5 mil", "6k" — mas "4k"/"8k" sozinhos são resolução, não dinheiro.
  const thousand = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*(mil|k)\b/g)].find((m) => !(m[2] === "k" && /^[48]$/.test(m[1])));
  const currency = text.match(/r\$\s*(\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{2})?/);
  const plain = text.match(/(?:orcamento|ate|gastar|tenho|budget|investir|pagar|valor|uns|cerca de)\D{0,15}(\d{4,5})\b/) ?? text.match(/\b(\d{4,5})\s*(?:reais|conto|pila|pratas)/);
  if (thousand) budget = Number(thousand[1].replace(",", ".")) * 1000;
  else if (currency) budget = parseMoney(currency[1]);
  else if (plain) budget = Number(plain[1]);
  if (budget !== null && (!Number.isFinite(budget) || budget < 500)) budget = null;

  const objectives = (Object.keys(OBJECTIVE_PATTERNS) as Objective[]).filter((o) => OBJECTIVE_PATTERNS[o].test(text));

  let resolution: Resolution | null = null;
  if (/4k|2160p?|ultra ?hd/.test(text)) resolution = "4k";
  else if (/1440p?|\b2k\b|qhd/.test(text)) resolution = "1440p";
  else if (/1080p?|full ?hd/.test(text)) resolution = "1080p";

  const amd = /\bamd\b|ryzen|radeon/.test(text);
  const intel = /intel|core i\d|core ultra/.test(text);
  const brand: BrandPreference | null = amd && !intel ? "amd" : intel && !amd ? "intel" : null;

  let peripherals: boolean | null = null;
  if (/sem monitor|ja tenho monitor|so o gabinete|so a cpu/.test(text)) peripherals = false;
  else if (/com monitor|incluir monitor|inclui monitor|periferic|teclado e mouse|monitor incluso|preciso de monitor/.test(text)) peripherals = true;

  let adjust: ParsedRequest["adjust"] = null;
  if (/mais barat|economi|reduz|diminu|menos dinheiro|ta caro|muito caro/.test(text)) adjust = "cheaper";
  else if (/mais potente|mais forte|melhor desempenho|aument|upgrade|mais rapido|turbin/.test(text)) adjust = "stronger";

  return {
    budget,
    objectives,
    resolution,
    brand,
    silent: /silenc|barulho|ruido|quiet/.test(text),
    peripherals,
    adjust,
    exclusive: /\b(so|apenas|somente)\b/.test(text),
  };
}

/* ----------------------------------------------------------------------------
 * Especificações em PDF / texto colado ("Analisar PDF")
 * --------------------------------------------------------------------------*/

export interface DetectedSpecs {
  build: PartialBuild;
  /** O que foi reconhecido, para mostrar ao usuário. */
  found: { category: string; label: string; known: boolean }[];
  /** Modelos citados que não estão na base da IA. */
  unknown: string[];
  totalPrice: number | null;
}

/** Palavras ignoradas ao comparar nomes ("Core i5-12400F" ≈ "i5 12400f"). */
const NOISE_WORDS = new Set(["amd", "intel", "nvidia", "geforce", "radeon", "core", "processador", "placa", "de", "video"]);

function modelPattern(search: string) {
  const tokens = normalizeText(search)
    .replace(/[-/]/g, " ")
    .split(" ")
    .filter((token) => token && !NOISE_WORDS.has(token) && !/^\d+gb$/.test(token));
  return new RegExp(`(?:^|[^a-z0-9])${tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[\\s-]*")}(?![a-z0-9])`);
}

/** Procura o modelo mais específico citado (ex.: "RTX 5060 Ti" antes de "RTX 5060"). */
function findModel<T extends CatalogItem>(text: string, options: T[]): T | null {
  const sorted = [...options].sort((a, b) => b.search.length - a.search.length);
  return sorted.find((option) => modelPattern(option.search).test(text)) ?? null;
}

export function parseSpecs(raw: string): DetectedSpecs {
  const text = normalizeText(raw, true);
  const build: PartialBuild = {};
  const found: DetectedSpecs["found"] = [];
  const unknown: string[] = [];

  // Processador
  const cpu = findModel(text, [...CPUS, ...REFERENCE_CPUS]);
  if (cpu) {
    build.cpu = cpu;
    found.push({ category: "Processador", label: cpu.name, known: true });
  } else {
    const generic = text.match(/ryzen\s*[3579]\s*\d{4}\w*|core\s*ultra\s*[579]\s*\d{3}\w*|\bi[3579][\s-]*\d{4,5}\w*|athlon\s*\w+|pentium\s*\w+|celeron\s*\w+|xeon\s*[\w-]+/);
    if (generic) unknown.push(`Processador "${generic[0]}"`);
  }

  // Placa de vídeo
  const gpu = findModel(text, [...GPUS, ...REFERENCE_GPUS]);
  if (gpu) {
    build.gpu = gpu;
    found.push({ category: "Placa de vídeo", label: gpu.name, known: true });
  } else {
    const generic = text.match(/(?:rtx|gtx|gt)\s*\d{3,4}(?:\s*(?:ti|super))*|\brx\s*\d{3,4}\s*(?:xtx|xt|gre)?|\barc\s*[ab]\d{3}/);
    if (generic) unknown.push(`Placa de vídeo "${generic[0]}"`);
    else if (build.cpu?.igpu && /video integrado|grafico integrado|igpu|sem placa de video/.test(text)) {
      build.gpu = "integrated";
      found.push({ category: "Placa de vídeo", label: `Vídeo integrado (${build.cpu.igpu.name})`, known: true });
    }
  }

  // Memória RAM: "2x8GB", "16GB DDR4", "memória 32 GB"
  const kit = text.match(/(\d)\s*x\s*(\d{1,2})\s*gb[^\n]{0,30}?(ddr[45])?/);
  const near = text.match(/(\d{1,3})\s*gb[^\d\n]{0,25}?(?<!g)(ddr[45])/) ?? text.match(/(?:memoria|ram)\D{0,25}(\d{1,3})\s*gb/) ?? text.match(/(\d{1,3})\s*gb\s*(?:de\s*)?(?:memoria|ram)/);
  const memType = (text.match(/(?<!g)ddr[45]/)?.[0]?.toUpperCase() as MemoryType | undefined) ?? undefined;
  const ramCapacity = kit ? Number(kit[1]) * Number(kit[2]) : near ? Number(near[1]) : null;
  if (ramCapacity && ramCapacity >= 4 && ramCapacity <= 256) {
    const memory: MemoryType = memType ?? (build.cpu?.socket === "AM5" || build.cpu?.socket === "LGA1851" ? "DDR5" : "DDR4");
    build.ram = findModel(text, RAMS) ?? genericRam(ramCapacity, memory);
    found.push({ category: "Memória", label: build.ram.name, known: true });
  }

  // Armazenamento principal
  // Primeiro "SSD 480GB", depois "1TB NVMe" (distância curta para não confundir com VRAM).
  // Se houver SSD e HD, o SSD é o disco principal.
  const typeMatches = [...text.matchAll(/(ssd|nvme|m\.2|\bhdd?\b)[^\d\n]{0,25}(\d+(?:[.,]\d+)?)\s*(tb|gb)/g)];
  const typeFirst = typeMatches.find((m) => !/^hd/.test(m[1])) ?? typeMatches[0];
  const sizeFirst = text.match(/(\d+(?:[.,]\d+)?)\s*(tb|gb)[^\n]{0,12}?(nvme|m\.2|ssd|sata|\bhdd?\b)/);
  const storage = typeFirst ? [typeFirst[2], typeFirst[3], typeFirst[1]] : sizeFirst ? [sizeFirst[1], sizeFirst[2], sizeFirst[3]] : null;
  const capacity = storage ? Math.round(Number(storage[0].replace(",", ".")) * (storage[1] === "tb" ? 1000 : 1)) : 0;
  if (storage && capacity >= 120) {
    const kindWord = storage[2];
    const kind: SsdOption["kind"] = /nvme|m\.2/.test(kindWord) || /nvme|m\.2/.test(text) ? "nvme" : /hd/.test(kindWord) ? "hdd" : "sata";
    build.ssd = findModel(text, SSDS) ?? genericStorage(capacity, kind);
    found.push({ category: "Armazenamento", label: build.ssd.name, known: true });
  }

  // Fonte
  const psuModel = findModel(text, PSUS);
  const psuWatts = text.match(/(?:fonte|psu|power supply)[^\n]{0,40}?(\d{3,4})\s*w\b/) ?? text.match(/(\d{3,4})\s*w\b[^\n]{0,30}?(?:80\s*plus|fonte|modular)/);
  if (psuModel) build.psu = psuModel;
  else if (psuWatts) build.psu = genericPsu(Number(psuWatts[1]), text.match(/80\s*plus\s*(white|bronze|silver|gold|platinum|titanium)/)?.[1] ?? null);
  if (build.psu) found.push({ category: "Fonte", label: build.psu.name, known: true });

  // Placa-mãe: modelo do catálogo ou chipset (B550, H610M...)
  const moboModel = findModel(text, MOBOS);
  if (moboModel) build.mobo = moboModel;
  else {
    const chipset = Object.keys(CHIPSETS)
      .sort((a, b) => b.length - a.length)
      .map((key) => ({ key, match: text.match(new RegExp(`\\b${key}(m)?(?:[\\s-]|\\b)`)) }))
      .find((entry) => entry.match);
    if (chipset?.match) {
      const memory: MemoryType = build.ram?.memory ?? (/d4\b|ddr4/.test(text) ? "DDR4" : CHIPSETS[chipset.key].socket === "AM5" || CHIPSETS[chipset.key].socket === "LGA1851" ? "DDR5" : "DDR4");
      build.mobo = genericMobo(chipset.key, memory, Boolean(chipset.match[1]) || /m-atx|micro ?atx|matx/.test(text), /wi-?fi/.test(text)) ?? undefined;
    }
  }
  if (build.mobo) found.push({ category: "Placa-mãe", label: build.mobo.name, known: true });

  // Cooler / gabinete
  const kitModel = findModel(text, CASE_KITS);
  if (kitModel) build.kit = kitModel;
  else if (/water ?cooler|watercooler|refrigeracao liquida|\baio\b/.test(text)) build.kit = genericCooler("water");
  else if (/cooler/.test(text)) build.kit = /cooler box|cooler original|cooler incluso/.test(text) && build.cpu?.boxCooler ? genericCooler("box") : genericCooler("air");
  if (build.kit) found.push({ category: "Refrigeração", label: build.kit.name, known: true });

  // Preço: linha de total ou, na falta dela, soma dos itens.
  let totalPrice: number | null = null;
  const totalLine = text.match(/total[^\n]{0,40}?r\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/);
  if (totalLine) totalPrice = parseMoney(totalLine[1]);
  else {
    const prices = [...text.matchAll(/r\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/g)].map((m) => parseMoney(m[1])).filter((v) => v >= 50);
    if (prices.length >= 2) {
      const max = Math.max(...prices);
      const rest = prices.reduce((sum, v) => sum + v, 0) - max;
      totalPrice = max >= rest * 0.9 ? max : max + rest;
    } else if (prices.length === 1) totalPrice = prices[0];
  }

  return { build, found, unknown, totalPrice };
}
