"use client";

import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bot,
  BrainCircuit,
  Check,
  CircleCheck,
  CircuitBoard,
  CodeXml,
  Copy,
  Cpu,
  Download,
  DraftingCompass,
  ExternalLink,
  Fan,
  Gamepad2,
  Gauge,
  Gpu,
  GraduationCap,
  HardDrive,
  Info,
  LoaderCircle,
  MemoryStick,
  MessageSquareText,
  Monitor,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  TriangleAlert,
  Volume2,
  Wallet,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";

/* ============================================================================
 * SmartBuild AI — Dashboard principal
 * ----------------------------------------------------------------------------
 * Estrutura do arquivo:
 *   1. Tipos
 *   2. Catálogo de peças (preços de referência do mercado brasileiro, em R$)
 *   3. Presets de demonstração (cenários prontos para a apresentação)
 *   4. Motor local de recomendação (funciona 100% offline)
 *   5. Integração com a API de IA (/api/recomendacao)
 *   6. Componentes de interface
 *   7. Página
 * ==========================================================================*/

/* ============================================================================
 * 1. TIPOS
 * ==========================================================================*/

type Objective = "gaming" | "arquitetura" | "dev" | "office";
type Resolution = "1080p" | "1440p" | "4k";
type BrandPreference = "any" | "amd" | "intel";
type Socket = "AM4" | "AM5" | "LGA1700" | "LGA1851";
type MemoryType = "DDR4" | "DDR5";
type FormFactor = "mATX" | "ATX";
type PartCategory = "cpu" | "gpu" | "mobo" | "ram" | "ssd" | "psu" | "case" | "extra";
type MetricKey = "game" | "render" | "cpuMulti" | "cpuSingle" | "ram" | "ssd" | "mobo" | "psu" | "cooling";
type MetricTable = Record<MetricKey, number>;
type InsightTone = "success" | "info" | "warning";

/** Dados que o usuário envia para a IA (local ou remota). */
interface BuildInput {
  budget: number;
  objective: Objective;
  resolution: Resolution;
  brand: BrandPreference;
  includePeripherals: boolean;
  silent: boolean;
  prompt: string;
}

interface RecommendedPart {
  category: PartCategory;
  name: string;
  price: number;
  reason: string;
  specs: string[];
  /** Termos usados nos links de busca de preço (vazio = nada a comprar). */
  searchTerms: string[];
}

interface CompatibilityCheck {
  label: string;
  detail: string;
  ok: boolean;
}

interface PerformanceMetric {
  label: string;
  value: number;
}

interface Insight {
  tone: InsightTone;
  text: string;
}

/** Resposta completa de uma recomendação. É também o contrato JSON da API. */
interface BuildResult {
  parts: RecommendedPart[];
  total: number;
  budget: number;
  tier: string;
  platform: string;
  score: number;
  performance: PerformanceMetric[];
  fpsEstimate: number | null;
  bottleneck: number;
  compatibility: CompatibilityCheck[];
  insights: Insight[];
  interpretation: string[];
  overBudget: boolean;
  source: "local" | "api";
  input: BuildInput;
}

interface CatalogItem {
  id: string;
  name: string;
  search: string;
  price: number;
  note: string;
}

interface CpuOption extends CatalogItem {
  brand: "amd" | "intel";
  socket: Socket;
  /** Consumo/dissipação típica em carga (W), usado para fonte e cooler. */
  power: number;
  /** Desempenho em jogos / por núcleo (0–100). */
  gaming: number;
  /** Desempenho multi-núcleo (0–100). */
  multi: number;
  boxCooler: boolean;
  igpu: { name: string; gaming: number; render: number } | null;
}

interface MoboOption extends CatalogItem {
  socket: Socket;
  memory: MemoryType;
  formFactor: FormFactor;
  wifi: boolean;
  /** Potência de CPU que o VRM sustenta com folga (W). */
  maxCpuPower: number;
  score: number;
}

interface RamOption extends CatalogItem {
  memory: MemoryType;
  capacity: number;
  score: number;
}

interface SsdOption extends CatalogItem {
  capacity: number;
  score: number;
}

interface GpuOption extends CatalogItem {
  brand: "nvidia" | "amd" | "intel" | "integrated";
  vram: number;
  power: number;
  /** Fonte mínima recomendada pelo fabricante (W). */
  minPsu: number;
  gaming: number;
  render: number;
}

interface PsuOption extends CatalogItem {
  watts: number;
  rating: string;
  score: number;
}

interface CaseKitOption extends CatalogItem {
  coolerSearch: string | null;
  maxTdp: number;
  formFactors: FormFactor[];
  usesBoxCooler: boolean;
  cooling: number;
  silence: number;
}

type PeripheralKit = CatalogItem;

interface Combo {
  cpu: CpuOption;
  mobo: MoboOption;
  ram: RamOption;
  gpu: GpuOption;
  psu: PsuOption;
  kit: CaseKitOption;
  ssd: SsdOption;
}

interface PromptSignals {
  games: { name: string; kind: "heavy" | "competitive" }[];
  ultra: boolean;
  streaming: boolean;
  dualMonitor: boolean;
  silent: boolean;
  wifi: boolean;
  render: boolean;
  editing: boolean;
  ai: boolean;
  virtualization: boolean;
}

interface Profile {
  weights: MetricTable;
  caps: MetricTable;
  /** Penalidade por R$ 1.000 gastos: evita gastar onde o ganho é irrelevante. */
  lambda: number;
  silent: boolean;
  wantsWifi: boolean;
  resolution: Resolution;
  signals: PromptSignals;
}

interface ComboAnalysis {
  metrics: MetricTable;
  bottleneck: number;
  score: number;
  normalized: number;
}

/* ============================================================================
 * 2. CATÁLOGO DE PEÇAS — preços de referência (R$, mercado brasileiro)
 * Valores aproximados de lojas como KaBuM!, Pichau e Terabyte. Atualize aqui
 * antes da apresentação ou substitua por uma API de preços no futuro.
 * ==========================================================================*/

const BUDGET_MIN = 2000;
const BUDGET_MAX = 20000;

const CPUS: CpuOption[] = [
  {
    id: "r5-5600g",
    name: "AMD Ryzen 5 5600G (6C/12T, Radeon Vega 7)",
    search: "Ryzen 5 5600G",
    brand: "amd",
    socket: "AM4",
    power: 65,
    gaming: 40,
    multi: 38,
    boxCooler: true,
    igpu: { name: "Radeon Vega 7", gaming: 8, render: 5 },
    price: 629,
    note: "APU com vídeo integrado e cooler box incluso: o caminho mais barato para um PC completo.",
  },
  {
    id: "r5-5600",
    name: "AMD Ryzen 5 5600 (6C/12T)",
    search: "Ryzen 5 5600",
    brand: "amd",
    socket: "AM4",
    power: 65,
    gaming: 50,
    multi: 42,
    boxCooler: true,
    igpu: null,
    price: 599,
    note: "Melhor custo-benefício para jogos em placas AM4 baratas, com cooler incluso.",
  },
  {
    id: "r7-5700x3d",
    name: "AMD Ryzen 7 5700X3D (8C/16T, 3D V-Cache)",
    search: "Ryzen 7 5700X3D",
    brand: "amd",
    socket: "AM4",
    power: 105,
    gaming: 68,
    multi: 56,
    boxCooler: false,
    igpu: null,
    price: 1299,
    note: "O 3D V-Cache entrega FPS de CPU topo de linha mantendo a plataforma AM4 (DDR4) barata.",
  },
  {
    id: "r5-8600g",
    name: "AMD Ryzen 5 8600G (6C/12T, Radeon 760M)",
    search: "Ryzen 5 8600G",
    brand: "amd",
    socket: "AM5",
    power: 65,
    gaming: 56,
    multi: 50,
    boxCooler: true,
    igpu: { name: "Radeon 760M", gaming: 16, render: 9 },
    price: 1149,
    note: "APU AM5 com um dos vídeos integrados mais fortes do mercado — roda e-sports sem placa dedicada.",
  },
  {
    id: "r5-7600",
    name: "AMD Ryzen 5 7600 (6C/12T)",
    search: "Ryzen 5 7600",
    brand: "amd",
    socket: "AM5",
    power: 65,
    gaming: 66,
    multi: 52,
    boxCooler: true,
    igpu: { name: "Radeon Graphics (2 CUs)", gaming: 3, render: 2 },
    price: 1049,
    note: "Porta de entrada da plataforma AM5 com DDR5 e ótimo desempenho por real em jogos.",
  },
  {
    id: "r5-9600x",
    name: "AMD Ryzen 5 9600X (6C/12T, Zen 5)",
    search: "Ryzen 5 9600X",
    brand: "amd",
    socket: "AM5",
    power: 88,
    gaming: 72,
    multi: 58,
    boxCooler: false,
    igpu: { name: "Radeon Graphics (2 CUs)", gaming: 3, render: 2 },
    price: 1399,
    note: "Arquitetura Zen 5 com IPC alto: excelente em jogos com consumo baixo.",
  },
  {
    id: "r7-9700x",
    name: "AMD Ryzen 7 9700X (8C/16T, Zen 5)",
    search: "Ryzen 7 9700X",
    brand: "amd",
    socket: "AM5",
    power: 88,
    gaming: 76,
    multi: 70,
    boxCooler: false,
    igpu: { name: "Radeon Graphics (2 CUs)", gaming: 3, render: 2 },
    price: 1899,
    note: "8 núcleos Zen 5 eficientes: equilibra jogos, compilação e criação de conteúdo.",
  },
  {
    id: "r7-9800x3d",
    name: "AMD Ryzen 7 9800X3D (8C/16T, 3D V-Cache)",
    search: "Ryzen 7 9800X3D",
    brand: "amd",
    socket: "AM5",
    power: 120,
    gaming: 100,
    multi: 76,
    boxCooler: false,
    igpu: { name: "Radeon Graphics (2 CUs)", gaming: 3, render: 2 },
    price: 3199,
    note: "Referência atual em desempenho para jogos graças ao 3D V-Cache de 2ª geração.",
  },
  {
    id: "r9-9900x",
    name: "AMD Ryzen 9 9900X (12C/24T)",
    search: "Ryzen 9 9900X",
    brand: "amd",
    socket: "AM5",
    power: 120,
    gaming: 80,
    multi: 87,
    boxCooler: false,
    igpu: { name: "Radeon Graphics (2 CUs)", gaming: 3, render: 2 },
    price: 2599,
    note: "12 núcleos para render, compilação e virtualização sem abrir mão de desempenho em jogos.",
  },
  {
    id: "r9-9950x",
    name: "AMD Ryzen 9 9950X (16C/32T)",
    search: "Ryzen 9 9950X",
    brand: "amd",
    socket: "AM5",
    power: 170,
    gaming: 84,
    multi: 100,
    boxCooler: false,
    igpu: { name: "Radeon Graphics (2 CUs)", gaming: 3, render: 2 },
    price: 3799,
    note: "16 núcleos Zen 5: topo de linha para render em CPU, VMs e compilação pesada.",
  },
  {
    id: "i3-12100",
    name: "Intel Core i3-12100 (4C/8T, UHD 730)",
    search: "Core i3-12100",
    brand: "intel",
    socket: "LGA1700",
    power: 89,
    gaming: 42,
    multi: 28,
    boxCooler: true,
    igpu: { name: "Intel UHD 730", gaming: 4, render: 3 },
    price: 579,
    note: "Quad-core moderno com vídeo integrado, ideal para estudos e escritório.",
  },
  {
    id: "i5-12400f",
    name: "Intel Core i5-12400F (6C/12T)",
    search: "Core i5-12400F",
    brand: "intel",
    socket: "LGA1700",
    power: 90,
    gaming: 52,
    multi: 45,
    boxCooler: true,
    igpu: null,
    price: 679,
    note: "Seis núcleos de alto desempenho a preço baixo; exige placa de vídeo dedicada (sufixo F).",
  },
  {
    id: "i5-14400f",
    name: "Intel Core i5-14400F (10C/16T)",
    search: "Core i5-14400F",
    brand: "intel",
    socket: "LGA1700",
    power: 148,
    gaming: 62,
    multi: 62,
    boxCooler: true,
    igpu: null,
    price: 1099,
    note: "Núcleos P + E dão fôlego para jogar e fazer stream ao mesmo tempo.",
  },
  {
    id: "i5-14600kf",
    name: "Intel Core i5-14600KF (14C/20T)",
    search: "Core i5-14600KF",
    brand: "intel",
    socket: "LGA1700",
    power: 181,
    gaming: 72,
    multi: 76,
    boxCooler: false,
    igpu: null,
    price: 1549,
    note: "14 núcleos com clocks altos: forte em jogos e em produtividade multitarefa.",
  },
  {
    id: "u5-245k",
    name: "Intel Core Ultra 5 245K (14C/14T)",
    search: "Core Ultra 5 245K",
    brand: "intel",
    socket: "LGA1851",
    power: 159,
    gaming: 70,
    multi: 76,
    boxCooler: false,
    igpu: { name: "Intel Graphics (Xe)", gaming: 11, render: 8 },
    price: 1749,
    note: "Plataforma Intel mais recente (LGA1851), eficiente e com NPU para recursos de IA.",
  },
  {
    id: "u7-265k",
    name: "Intel Core Ultra 7 265K (20C/20T)",
    search: "Core Ultra 7 265K",
    brand: "intel",
    socket: "LGA1851",
    power: 250,
    gaming: 76,
    multi: 91,
    boxCooler: false,
    igpu: { name: "Intel Graphics (Xe)", gaming: 12, render: 9 },
    price: 2299,
    note: "20 núcleos com ótimo custo por núcleo — excelente para render, compilação e Revit.",
  },
  {
    id: "u9-285k",
    name: "Intel Core Ultra 9 285K (24C/24T)",
    search: "Core Ultra 9 285K",
    brand: "intel",
    socket: "LGA1851",
    power: 250,
    gaming: 80,
    multi: 99,
    boxCooler: false,
    igpu: { name: "Intel Graphics (Xe)", gaming: 12, render: 9 },
    price: 3599,
    note: "Topo da Intel para estações de trabalho: 24 núcleos e suporte a DDR5 de alta frequência.",
  },
];

const MOBOS: MoboOption[] = [
  { id: "a520m", name: "ASUS Prime A520M-K", search: "ASUS Prime A520M-K", socket: "AM4", memory: "DDR4", formFactor: "mATX", wifi: false, maxCpuPower: 105, score: 30, price: 379, note: "Chipset A520 de entrada: cumpre o básico com estabilidade para CPUs de 65W." },
  { id: "b550m", name: "Gigabyte B550M Aorus Elite", search: "Gigabyte B550M Aorus Elite", socket: "AM4", memory: "DDR4", formFactor: "mATX", wifi: false, maxCpuPower: 170, score: 55, price: 749, note: "B550 com VRM reforçado e PCIe 4.0 para SSD e placa de vídeo." },
  { id: "a620m", name: "ASRock A620M-HDV/M.2+", search: "ASRock A620M-HDV/M.2+", socket: "AM5", memory: "DDR5", formFactor: "mATX", wifi: false, maxCpuPower: 120, score: 40, price: 649, note: "Entrada mais barata da plataforma AM5, com slot M.2 e DDR5." },
  { id: "b650m", name: "MSI B650M Gaming Plus WiFi", search: "MSI B650M Gaming Plus WiFi", socket: "AM5", memory: "DDR5", formFactor: "mATX", wifi: true, maxCpuPower: 230, score: 65, price: 1099, note: "B650 com Wi-Fi 6E, bom VRM e dois slots M.2 — escolha equilibrada em AM5." },
  { id: "b850", name: "ASUS TUF Gaming B850-Plus WiFi", search: "ASUS TUF Gaming B850-Plus WiFi", socket: "AM5", memory: "DDR5", formFactor: "ATX", wifi: true, maxCpuPower: 250, score: 80, price: 1699, note: "B850 com PCIe 5.0 no M.2, Wi-Fi 7 e VRM robusto para CPUs de 12–16 núcleos." },
  { id: "x870", name: "MSI MAG X870 Tomahawk WiFi", search: "MSI MAG X870 Tomahawk WiFi", socket: "AM5", memory: "DDR5", formFactor: "ATX", wifi: true, maxCpuPower: 300, score: 92, price: 2399, note: "X870 com USB4, PCIe 5.0 na GPU e no SSD e VRM topo para Ryzen 9." },
  { id: "h610m", name: "ASUS Prime H610M-E D4", search: "ASUS Prime H610M-E D4", socket: "LGA1700", memory: "DDR4", formFactor: "mATX", wifi: false, maxCpuPower: 125, score: 28, price: 429, note: "Entrada LGA1700 com DDR4 — barata e suficiente para i3/i5 sem overclock." },
  { id: "b760m-d4", name: "Gigabyte B760M Gaming X DDR4", search: "Gigabyte B760M Gaming X DDR4", socket: "LGA1700", memory: "DDR4", formFactor: "mATX", wifi: false, maxCpuPower: 200, score: 50, price: 849, note: "B760 DDR4 com bom VRM: aproveita memórias DDR4, mais baratas." },
  { id: "b760m-d5", name: "MSI MAG B760M Mortar WiFi", search: "MSI MAG B760M Mortar WiFi", socket: "LGA1700", memory: "DDR5", formFactor: "mATX", wifi: true, maxCpuPower: 253, score: 70, price: 1349, note: "B760 DDR5 com Wi-Fi e VRM sólido para i5/i7 de 14ª geração." },
  { id: "z790", name: "ASUS TUF Gaming Z790-Plus WiFi", search: "ASUS TUF Gaming Z790-Plus WiFi", socket: "LGA1700", memory: "DDR5", formFactor: "ATX", wifi: true, maxCpuPower: 300, score: 85, price: 2099, note: "Z790 libera overclock nos processadores K e tem VRM para i7/i9." },
  { id: "b860m", name: "Gigabyte B860M Aorus Elite WiFi6E", search: "Gigabyte B860M Aorus Elite WiFi6E", socket: "LGA1851", memory: "DDR5", formFactor: "mATX", wifi: true, maxCpuPower: 250, score: 72, price: 1449, note: "B860 da nova plataforma Intel, com Wi-Fi 6E e suporte a DDR5 rápida." },
  { id: "z890", name: "MSI MAG Z890 Tomahawk WiFi", search: "MSI MAG Z890 Tomahawk WiFi", socket: "LGA1851", memory: "DDR5", formFactor: "ATX", wifi: true, maxCpuPower: 300, score: 92, price: 2699, note: "Z890 topo para Core Ultra K, com Thunderbolt 4 e VRM para 250W+." },
];

const RAMS: RamOption[] = [
  { id: "ddr4-16", name: "Kingston Fury Beast 16GB (2x8GB) DDR4 3200MHz", search: "Kingston Fury Beast 16GB 2x8 DDR4 3200", memory: "DDR4", capacity: 16, score: 35, price: 279, note: "Kit dual channel DDR4 confiável e barato." },
  { id: "ddr4-32", name: "Corsair Vengeance LPX 32GB (2x16GB) DDR4 3600MHz", search: "Corsair Vengeance LPX 32GB 2x16 DDR4 3600", memory: "DDR4", capacity: 32, score: 62, price: 549, note: "32GB DDR4 em dual channel com latência baixa." },
  { id: "ddr4-64", name: "Kingston Fury Beast 64GB (2x32GB) DDR4 3200MHz", search: "Kingston Fury Beast 64GB 2x32 DDR4 3200", memory: "DDR4", capacity: 64, score: 82, price: 1099, note: "64GB DDR4: muita memória para VMs e projetos grandes pagando pouco." },
  { id: "ddr5-16", name: "Kingston Fury Beast 16GB (2x8GB) DDR5 5600MHz", search: "Kingston Fury Beast 16GB 2x8 DDR5 5600", memory: "DDR5", capacity: 16, score: 45, price: 449, note: "DDR5 5600MHz em dual channel, base da plataforma moderna." },
  { id: "ddr5-32", name: "Kingston Fury Beast 32GB (2x16GB) DDR5 6000MHz CL30", search: "Kingston Fury Beast 32GB 2x16 DDR5 6000 CL30", memory: "DDR5", capacity: 32, score: 75, price: 849, note: "DDR5 6000MHz CL30 — o ponto ideal (sweet spot) para Ryzen AM5 e Core Ultra." },
  { id: "ddr5-64", name: "Corsair Vengeance 64GB (2x32GB) DDR5 6000MHz CL30", search: "Corsair Vengeance 64GB 2x32 DDR5 6000 CL30", memory: "DDR5", capacity: 64, score: 95, price: 1699, note: "64GB DDR5 6000MHz CL30 para estações de trabalho e cenas 3D gigantes." },
];

const SSDS: SsdOption[] = [
  { id: "nv3-500", name: "Kingston NV3 500GB NVMe PCIe 4.0", search: "Kingston NV3 500GB", capacity: 500, score: 28, price: 219, note: "NVMe PCIe 4.0 de entrada: o Windows inicia em segundos." },
  { id: "sn580-1tb", name: "WD Blue SN580 1TB NVMe PCIe 4.0", search: "WD Blue SN580 1TB", capacity: 1000, score: 55, price: 399, note: "NVMe PCIe 4.0 eficiente e frio, com ótimo custo por GB." },
  { id: "990evo-2tb", name: "Samsung 990 EVO Plus 2TB NVMe PCIe 4.0", search: "Samsung 990 EVO Plus 2TB", capacity: 2000, score: 76, price: 849, note: "2TB com leitura de até 7.250 MB/s — espaço para dezenas de jogos e projetos." },
  { id: "sn850x-2tb", name: "WD Black SN850X 2TB NVMe PCIe 4.0", search: "WD Black SN850X 2TB", capacity: 2000, score: 86, price: 1099, note: "Um dos SSDs PCIe 4.0 mais rápidos, com cache generoso e suporte a DirectStorage." },
  { id: "990pro-4tb", name: "Samsung 990 Pro 4TB NVMe PCIe 4.0", search: "Samsung 990 Pro 4TB", capacity: 4000, score: 100, price: 2199, note: "4TB de altíssimo desempenho para bibliotecas de assets, renders e VMs." },
];

const GPUS: GpuOption[] = [
  { id: "rtx3050", name: "NVIDIA GeForce RTX 3050 6GB", search: "RTX 3050 6GB", brand: "nvidia", vram: 6, power: 70, minPsu: 550, gaming: 24, render: 22, price: 1099, note: "Placa de entrada da NVIDIA com DLSS; boa para e-sports em 1080p." },
  { id: "rx6600", name: "AMD Radeon RX 6600 8GB", search: "Radeon RX 6600 8GB", brand: "amd", vram: 8, power: 132, minPsu: 450, gaming: 34, render: 18, price: 1249, note: "Uma das placas com melhor custo por FPS em 1080p no mercado brasileiro." },
  { id: "b580", name: "Intel Arc B580 12GB", search: "Intel Arc B580", brand: "intel", vram: 12, power: 190, minPsu: 600, gaming: 44, render: 30, price: 1849, note: "12GB de VRAM e XeSS a preço intermediário — ótimo valor em 1080p/1440p." },
  { id: "rtx5060", name: "NVIDIA GeForce RTX 5060 8GB", search: "RTX 5060 8GB", brand: "nvidia", vram: 8, power: 145, minPsu: 550, gaming: 48, render: 46, price: 2099, note: "Arquitetura Blackwell com DLSS 4 e Multi Frame Generation, muito eficiente." },
  { id: "rx9060xt", name: "AMD Radeon RX 9060 XT 16GB", search: "RX 9060 XT 16GB", brand: "amd", vram: 16, power: 160, minPsu: 450, gaming: 53, render: 34, price: 2499, note: "16GB de VRAM e FSR 4: sobra memória para texturas no Ultra." },
  { id: "rtx5060ti", name: "NVIDIA GeForce RTX 5060 Ti 16GB", search: "RTX 5060 Ti 16GB", brand: "nvidia", vram: 16, power: 180, minPsu: 600, gaming: 57, render: 56, price: 2999, note: "16GB de VRAM + DLSS 4: versátil para jogos e para IA/render com CUDA." },
  { id: "rtx5070", name: "NVIDIA GeForce RTX 5070 12GB", search: "RTX 5070 12GB", brand: "nvidia", vram: 12, power: 250, minPsu: 650, gaming: 72, render: 68, price: 3999, note: "Alto nível em 1440p com DLSS 4 e ray tracing competente." },
  { id: "rx9070", name: "AMD Radeon RX 9070 16GB", search: "RX 9070 16GB", brand: "amd", vram: 16, power: 220, minPsu: 650, gaming: 73, render: 46, price: 4099, note: "16GB e excelente desempenho de rasterização em 1440p com consumo controlado." },
  { id: "rx9070xt", name: "AMD Radeon RX 9070 XT 16GB", search: "RX 9070 XT 16GB", brand: "amd", vram: 16, power: 304, minPsu: 750, gaming: 80, render: 50, price: 4699, note: "Rasterização de classe alta e 16GB de VRAM: forte para 1440p Ultra e 4K com FSR 4." },
  { id: "rtx5070ti", name: "NVIDIA GeForce RTX 5070 Ti 16GB", search: "RTX 5070 Ti 16GB", brand: "nvidia", vram: 16, power: 300, minPsu: 750, gaming: 84, render: 82, price: 6199, note: "16GB de VRAM e CUDA/OptiX: referência para 1440p com alto FPS, 4K e render 3D." },
  { id: "rtx5080", name: "NVIDIA GeForce RTX 5080 16GB", search: "RTX 5080 16GB", brand: "nvidia", vram: 16, power: 360, minPsu: 850, gaming: 92, render: 90, price: 7999, note: "Placa entusiasta para 4K com ray tracing e render por GPU de cenas pesadas." },
];

const PSUS: PsuOption[] = [
  { id: "cv450", name: "Corsair CV450 450W 80 Plus Bronze", search: "Corsair CV450", watts: 450, rating: "80 Plus Bronze", score: 20, price: 269, note: "Fonte 80 Plus Bronze honesta para PCs sem placa de vídeo dedicada." },
  { id: "a550bn", name: "MSI MAG A550BN 550W 80 Plus Bronze", search: "MSI MAG A550BN", watts: 550, rating: "80 Plus Bronze", score: 30, price: 329, note: "80 Plus Bronze com proteções completas (OVP/OCP/SCP)." },
  { id: "cx650", name: "Corsair CX650 650W 80 Plus Bronze", search: "Corsair CX650", watts: 650, rating: "80 Plus Bronze", score: 45, price: 429, note: "Linha consagrada da Corsair, estável para GPUs intermediárias." },
  { id: "a750gl", name: "MSI MAG A750GL PCIE5 750W 80 Plus Gold", search: "MSI MAG A750GL PCIE5", watts: 750, rating: "80 Plus Gold", score: 65, price: 629, note: "80 Plus Gold com conector 12V-2x6 (PCIe 5.0) nativo para GPUs modernas." },
  { id: "rm850e", name: "Corsair RM850e 850W 80 Plus Gold ATX 3.1", search: "Corsair RM850e", watts: 850, rating: "80 Plus Gold", score: 80, price: 849, note: "ATX 3.1 totalmente modular, 80 Plus Gold e ventoinha silenciosa (modo zero RPM)." },
  { id: "rm1000x", name: "Corsair RM1000x 1000W 80 Plus Gold ATX 3.1", search: "Corsair RM1000x", watts: 1000, rating: "80 Plus Gold", score: 92, price: 1299, note: "1000W Gold ATX 3.1 com folga de sobra para GPUs topo e upgrades futuros." },
];

const CASE_KITS: CaseKitOption[] = [
  { id: "kit-box", name: "Gabinete Montech AIR 100 Lite + Cooler box do processador", search: "Montech AIR 100 Lite", coolerSearch: null, maxTdp: 95, formFactors: ["mATX"], usesBoxCooler: true, cooling: 22, silence: 15, price: 219, note: "Gabinete compacto com boa ventilação frontal, aproveitando o cooler que já vem com o processador." },
  { id: "kit-budget", name: "Gabinete Montech X3 Mesh + Cooler DeepCool AG400", search: "Montech X3 Mesh", coolerSearch: "DeepCool AG400", maxTdp: 180, formFactors: ["mATX", "ATX"], usesBoxCooler: false, cooling: 38, silence: 25, price: 449, note: "Frontal mesh com 6 fans inclusos e cooler tower de 4 heatpipes." },
  { id: "kit-entry", name: "Gabinete Montech AIR 903 Base + Cooler DeepCool AK400", search: "Montech AIR 903 Base", coolerSearch: "DeepCool AK400", maxTdp: 200, formFactors: ["mATX", "ATX"], usesBoxCooler: false, cooling: 50, silence: 40, price: 649, note: "Ótimo fluxo de ar com 3 fans de 140mm e cooler tower silencioso." },
  { id: "kit-mid", name: "Gabinete Lian Li Lancool 207 + Cooler Thermalright Peerless Assassin 120 SE", search: "Lian Li Lancool 207", coolerSearch: "Thermalright Peerless Assassin 120 SE", maxTdp: 245, formFactors: ["mATX", "ATX"], usesBoxCooler: false, cooling: 72, silence: 58, price: 899, note: "Fluxo de ar excelente e cooler dual tower que rivaliza com water coolers." },
  { id: "kit-aio", name: "Gabinete NZXT H6 Flow + Water Cooler Arctic Liquid Freezer III Pro 360", search: "NZXT H6 Flow", coolerSearch: "Arctic Liquid Freezer III Pro 360", maxTdp: 320, formFactors: ["mATX", "ATX"], usesBoxCooler: false, cooling: 95, silence: 72, price: 1699, note: "Water cooler de 360mm para CPUs de alto consumo e visual panorâmico." },
  { id: "kit-silent", name: "Gabinete Fractal Design North + Cooler Noctua NH-D15 G2", search: "Fractal Design North", coolerSearch: "Noctua NH-D15 G2", maxTdp: 260, formFactors: ["mATX", "ATX"], usesBoxCooler: false, cooling: 88, silence: 100, price: 2299, note: "Combinação referência em silêncio: frontal em madeira/mesh e um dos coolers a ar mais silenciosos do mercado." },
];

const PERIPHERAL_KITS: Record<string, PeripheralKit> = {
  basic: { id: "basic", name: "Kit Essencial: Monitor AOC 24B30HM2 24\" 100Hz + Combo Logitech MK235 sem fio", search: "Monitor AOC 24B30HM2", price: 899, note: "Monitor Full HD com 100Hz e combo teclado/mouse sem fio — confortável para estudo e trabalho." },
  g1080: { id: "g1080", name: "Kit Gamer 1080p: Monitor AOC Gaming 24G30E 24\" 180Hz + HyperX Alloy Origins Core + Logitech G203", search: "Monitor AOC 24G30E", price: 1599, note: "Monitor de 180Hz para aproveitar o FPS alto, teclado mecânico e mouse leve." },
  dual: { id: "dual", name: "Kit Dual Monitor: 2x Dell SE2425H 24\" IPS + Combo Logitech MK540", search: "Monitor Dell SE2425H", price: 1899, note: "Dois monitores IPS para código, documentação e reuniões lado a lado." },
  g1440: { id: "g1440", name: "Kit Gamer 1440p: Monitor LG UltraGear 27GS75Q 27\" QHD 180Hz + Redragon Kumara Pro + Logitech G305", search: "LG UltraGear 27GS75Q", price: 2399, note: "Monitor QHD IPS de 180Hz: o casamento ideal para uma GPU de 1440p." },
  creator: { id: "creator", name: "Kit Criador 4K: Monitor LG 27UP850 27\" 4K IPS + Logitech MX Keys S + MX Master 3S", search: "LG 27UP850", price: 3899, note: "Painel 4K IPS com ampla cobertura de cores, ideal para arquitetura e render." },
  g4k: { id: "g4k", name: "Kit Gamer 4K: Monitor LG UltraGear 27GR93U 27\" 4K 144Hz + HyperX Alloy Origins + Logitech G Pro X Superlight", search: "LG UltraGear 27GR93U", price: 4699, note: "Monitor 4K de 144Hz para extrair tudo de uma GPU topo de linha." },
};

const STORES = [
  { id: "kabum", label: "KaBuM!", url: (q: string) => `https://www.kabum.com.br/busca/${encodeURIComponent(q.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))}` },
  { id: "pichau", label: "Pichau", url: (q: string) => `https://www.pichau.com.br/search?q=${encodeURIComponent(q)}` },
  { id: "terabyte", label: "Terabyte", url: (q: string) => `https://www.terabyteshop.com.br/busca?str=${encodeURIComponent(q)}` },
];

const googleShoppingUrl = (q: string) => `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(q)}`;

/* ============================================================================
 * 3. PRESETS DE DEMONSTRAÇÃO
 * Cenários realistas que preenchem o formulário e geram a build na hora,
 * mesmo offline — ideais para a apresentação.
 * ==========================================================================*/

interface Preset {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  input: BuildInput;
}

const PRESETS: Preset[] = [
  {
    id: "gamer-1080p",
    title: "Gamer Entrada",
    subtitle: "1080p · R$ 4.500",
    icon: Gamepad2,
    input: { budget: 4500, objective: "gaming", resolution: "1080p", brand: "any", includePeripherals: false, silent: false, prompt: "Quero jogar Valorant e Fortnite com FPS alto e alguns AAA no médio/alto." },
  },
  {
    id: "gamer-1440p",
    title: "Gamer 1440p Ultra",
    subtitle: "1440p · R$ 9.000",
    icon: Monitor,
    input: { budget: 9000, objective: "gaming", resolution: "1440p", brand: "amd", includePeripherals: false, silent: false, prompt: "Quero rodar Baldur's Gate 3 no ultra e usar dois monitores sem travar." },
  },
  {
    id: "arquiteto",
    title: "Arquitetura & Render",
    subtitle: "Revit/Lumion · R$ 13.000",
    icon: DraftingCompass,
    input: { budget: 13000, objective: "arquitetura", resolution: "1440p", brand: "any", includePeripherals: false, silent: true, prompt: "Uso Revit e Lumion todos os dias e renderizo animações no Blender (Cycles)." },
  },
  {
    id: "estudos",
    title: "Home Office / Estudos",
    subtitle: "Com monitor · R$ 3.500",
    icon: GraduationCap,
    input: { budget: 3500, objective: "office", resolution: "1080p", brand: "any", includePeripherals: true, silent: false, prompt: "PC para faculdade, aulas online, Office e muitas abas no navegador." },
  },
];

/* ============================================================================
 * 4. MOTOR LOCAL DE RECOMENDAÇÃO
 * Busca exaustiva em todas as combinações compatíveis do catálogo e escolhe a
 * de maior pontuação para o objetivo dentro do orçamento. Garante socket,
 * memória, formato, fonte e cooler compatíveis por construção.
 * ==========================================================================*/

const METRIC_KEYS: MetricKey[] = ["game", "render", "cpuMulti", "cpuSingle", "ram", "ssd", "mobo", "psu", "cooling"];

/** Quanto a resolução "esconde" uma CPU mais fraca (GPU-bound em resoluções altas). */
const CPU_RES_FACTOR: Record<Resolution, number> = { "1080p": 1, "1440p": 1.25, "4k": 1.6 };
const REQUIRED_VRAM: Record<Resolution, number> = { "1080p": 8, "1440p": 12, "4k": 16 };
const FPS_RES_FACTOR: Record<Resolution, number> = { "1080p": 1, "1440p": 0.72, "4k": 0.42 };
const RESOLUTION_LABEL: Record<Resolution, string> = { "1080p": "1080p", "1440p": "1440p", "4k": "4K" };

const OBJECTIVE_LABEL: Record<Objective, string> = {
  gaming: "Gaming",
  arquitetura: "Arquitetura & Render 3D",
  dev: "Desenvolvimento & Programação",
  office: "Home Office / Estudos",
};

const CATEGORY_LABEL: Record<PartCategory, string> = {
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

const LOADING_STEPS = [
  "Interpretando objetivo, orçamento e seu pedido",
  "Cruzando sockets, chipsets e tipo de memória",
  "Calculando consumo e dimensionando a fonte",
  "Analisando gargalos entre CPU e GPU",
  "Otimizando preços dentro do orçamento",
];

const brlFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brl = (value: number) => brlFormatter.format(value);
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function clampBudget(value: number) {
  const safe = Number.isFinite(value) ? value : BUDGET_MIN;
  return Math.min(BUDGET_MAX, Math.max(BUDGET_MIN, Math.round(safe)));
}

function normalizeInput(input: BuildInput): BuildInput {
  return { ...input, budget: clampBudget(input.budget), prompt: input.prompt.trim().slice(0, 500) };
}

function sameInput(a: BuildInput, b: BuildInput) {
  return JSON.stringify(normalizeInput(a)) === JSON.stringify(normalizeInput(b));
}

function capacityLabel(gb: number) {
  return gb >= 1000 ? `${gb / 1000}TB` : `${gb}GB`;
}

function upscalerFor(gpu: GpuOption) {
  if (gpu.brand === "nvidia") return "DLSS 4";
  if (gpu.brand === "amd") return "FSR 4";
  if (gpu.brand === "intel") return "XeSS";
  return "FSR";
}

/** Consumo estimado do sistema inteiro (CPU + GPU + placa, RAM, SSD e fans). */
function systemDraw(cpu: CpuOption, gpu: GpuOption) {
  return cpu.power + gpu.power + 100;
}

function requiredPsuWatts(cpu: CpuOption, gpu: GpuOption) {
  return Math.max(gpu.minPsu, Math.ceil(systemDraw(cpu, gpu) * 1.3));
}

function integratedGpu(cpu: CpuOption): GpuOption | null {
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

function estimateFps(game: number, resolution: Resolution) {
  return Math.max(5, Math.round(((game * 1.5 + 5) * FPS_RES_FACTOR[resolution]) / 5) * 5);
}

/** "IA" de linguagem natural local: extrai sinais do texto livre do usuário. */
function parsePrompt(prompt: string): PromptSignals {
  const text = prompt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
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

function buildProfile(input: BuildInput, signals: PromptSignals): Profile {
  const weights: MetricTable = { ...BASE_WEIGHTS[input.objective] };
  const caps: MetricTable = { ...BASE_CAPS[input.objective] };
  const silent = input.silent || signals.silent;

  if (input.objective === "gaming") caps.game = GAME_CAP_BY_RESOLUTION[input.resolution];
  if (signals.ultra || signals.games.some((g) => g.kind === "heavy")) {
    weights.game += 0.08;
    caps.game = Math.min(100, caps.game + 8);
  }
  if (signals.games.some((g) => g.kind === "competitive")) weights.cpuSingle += 0.06;
  if (signals.streaming) weights.cpuMulti += 0.08;
  if (signals.render) weights.render += input.objective === "arquitetura" ? 0.08 : 0.06;
  if (signals.editing) {
    weights.cpuMulti += 0.05;
    weights.render += 0.04;
  }
  if (signals.ai) {
    weights.render += 0.08;
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
    lambda: LAMBDA[input.objective],
    silent,
    wantsWifi: signals.wifi,
    resolution: input.objective === "gaming" ? input.resolution : "1440p",
    signals,
  };
}

function analyzeCombo(combo: Combo, profile: Profile): ComboAnalysis {
  const { cpu, gpu, kit } = combo;
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
    ssd: combo.ssd.score,
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

function comboPrice(combo: Combo) {
  return combo.cpu.price + combo.mobo.price + combo.ram.price + combo.gpu.price + combo.psu.price + combo.kit.price + combo.ssd.price;
}

/**
 * Percorre todas as combinações compatíveis.
 * - mode "best": maior (pontuação − custo ponderado) dentro do limite.
 * - mode "cheapest": combinação compatível mais barata (fallback de orçamento).
 */
function searchCombos(input: BuildInput, profile: Profile, limit: number, mode: "best" | "cheapest"): Combo | null {
  let best: Combo | null = null;
  let bestValue = Number.NEGATIVE_INFINITY;
  const cpus = CPUS.filter((cpu) => input.brand === "any" || cpu.brand === input.brand);

  for (const cpu of cpus) {
    const igpu = integratedGpu(cpu);
    const gpus = igpu ? [igpu, ...GPUS] : GPUS;
    const coolers = CASE_KITS.filter((kit) => kit.maxTdp >= cpu.power && (!kit.usesBoxCooler || cpu.boxCooler));

    for (const mobo of MOBOS) {
      if (mobo.socket !== cpu.socket || mobo.maxCpuPower < cpu.power) continue;
      const kits = coolers.filter((kit) => kit.formFactors.includes(mobo.formFactor));

      for (const ram of RAMS) {
        if (ram.memory !== mobo.memory) continue;
        const platformPrice = cpu.price + mobo.price + ram.price;
        if (platformPrice > limit) continue;

        for (const gpu of gpus) {
          const minWatts = requiredPsuWatts(cpu, gpu);

          for (const psu of PSUS) {
            if (psu.watts < minWatts) continue;

            for (const kit of kits) {
              for (const ssd of SSDS) {
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
  const chains: Record<Objective, string[]> = {
    gaming: input.resolution === "4k" ? ["g4k", "g1440", "g1080", "basic"] : input.resolution === "1440p" ? ["g1440", "g1080", "basic"] : ["g1080", "basic"],
    arquitetura: ["creator", "dual", "basic"],
    dev: ["dual", "basic"],
    office: signals.dualMonitor ? ["dual", "basic"] : ["basic"],
  };
  const options = chains[input.objective].map((id) => PERIPHERAL_KITS[id]);
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
  const res = RESOLUTION_LABEL[profile.resolution];
  const bottleneckPct = Math.round(analysis.bottleneck * 100);
  const draw = systemDraw(cpu, gpu);
  const margin = Math.round(((psu.watts - draw) / draw) * 100);
  const fps = estimateFps(analysis.metrics.game, profile.resolution);
  const integrated = gpu.brand === "integrated";

  const cpuReason: Record<Objective, string> = {
    gaming: integrated
      ? `${cpu.note} Sem GPU dedicada por enquanto, a prioridade foi uma base sólida para receber uma placa de vídeo depois.`
      : `${cpu.note} Em ${res}, ${bottleneckPct <= 8 ? `acompanha a ${gpu.search} sem gargalo relevante` : `aproveita ~${100 - bottleneckPct}% do potencial da ${gpu.search} — compromisso para caber no orçamento`}.`,
    arquitetura: `${cpu.note} ${cpu.multi >= 85 ? "Muitos núcleos aceleram renders em CPU (V-Ray, Corona, Cycles)" : "Bom equilíbrio entre núcleos para render e clock alto"}, e o desempenho por núcleo mantém o Revit e o SketchUp fluidos.`,
    dev: `${cpu.note} ${cpu.multi >= 80 ? "Compila projetos grandes e roda containers e VMs em paralelo com folga." : "Compila e roda os containers do dia a dia com tempo de build baixo."}`,
    office: `${cpu.note} Mais que suficiente para navegador com dezenas de abas, Office, Teams/Meet e aulas online.`,
  };
  const streamingNote = profile.signals.streaming && cpu.multi >= 60 ? " Os núcleos extras ajudam no encode do stream (OBS)." : "";

  let gpuReason: string;
  if (integrated) {
    gpuReason =
      input.objective === "gaming"
        ? `O orçamento não comporta uma GPU dedicada sem sacrificar o resto. O ${cpu.igpu?.name} roda e-sports leves em 720p/1080p no baixo; uma RTX 5060 ou RX 9060 XT é o primeiro upgrade recomendado.`
        : `Sem placa dedicada: o ${cpu.igpu?.name} atende ${input.objective === "dev" ? "IDEs, navegador e múltiplos monitores" : "Office, vídeos em 4K e videochamadas"} e economiza no orçamento e na conta de luz. Dá para instalar uma GPU dedicada depois.`;
  } else if (input.objective === "gaming") {
    gpuReason = `${gpu.note} Estimativa de ~${fps} FPS em jogos AAA no ${res} (Ultra, sem upscaling) — mais com ${upscalerFor(gpu)} — e ${gpu.vram}GB de VRAM ${gpu.vram >= REQUIRED_VRAM[profile.resolution] ? "adequados" : "no limite"} para essa resolução.`;
  } else if (input.objective === "arquitetura") {
    gpuReason = `${gpu.note} ${gpu.brand === "nvidia" ? "CUDA/OptiX acelera o Cycles (Blender), Lumion, D5 Render e Twinmotion" : "Viewport fluida; para render OptiX/CUDA a NVIDIA seria preferível, mas esta venceu no custo-benefício"}; ${gpu.vram}GB de VRAM comportam cenas pesadas.`;
  } else {
    gpuReason = `${gpu.note} Garante múltiplos monitores e aceleração de interface${profile.signals.ai && gpu.brand === "nvidia" ? ", além de CUDA para rodar modelos de IA locais (Ollama, PyTorch)" : ""}.`;
  }

  const ramReason: Record<Objective, string> = {
    gaming: ram.capacity >= 32 ? "32GB evitam travadas (stutter) em jogos modernos com Discord e navegador abertos." : "16GB atendem a maioria dos jogos atuais; 32GB é o upgrade natural.",
    arquitetura:
      ram.capacity >= 64
        ? "64GB comportam modelos BIM grandes e cenas de render complexas sem usar o disco como memória."
        : ram.capacity >= 32
          ? "32GB é o mínimo confortável para Revit + Lumion; 64GB é o próximo passo."
          : "16GB limitam projetos BIM grandes — priorize o upgrade para 32GB.",
    dev:
      ram.capacity >= 64
        ? "64GB rodam Docker, várias VMs, emuladores e IDEs simultaneamente."
        : ram.capacity >= 32
          ? "32GB dão folga para Docker, IDE, navegador e emulador ao mesmo tempo."
          : "16GB funcionam para web e back-end leve; 32GB são recomendados para containers.",
    office: "Dual channel deixa o sistema fluido por anos para estudo e trabalho.",
  };

  const ssdContext: Record<Objective, string> = {
    gaming: "jogos atuais ocupam de 100 a 150GB cada.",
    arquitetura: "bibliotecas de texturas e projetos ficam no disco rápido.",
    dev: "repositórios, imagens Docker e SDKs carregam rápido.",
    office: "sobra espaço para documentos e arquivos de estudo.",
  };

  const parts: RecommendedPart[] = [
    {
      category: "cpu",
      name: cpu.name,
      price: cpu.price,
      reason: cpuReason[input.objective] + streamingNote,
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
      reason: `${ram.note} ${ramReason[input.objective]}`,
      specs: [`${ram.capacity}GB`, ram.memory, "Dual channel"],
      searchTerms: [ram.search],
    },
    {
      category: "ssd",
      name: ssd.name,
      price: ssd.price,
      reason: `${ssd.note} Com ${capacityLabel(ssd.capacity)}, ${ssdContext[input.objective]}`,
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

function buildInsights(combo: Combo, input: BuildInput, profile: Profile, analysis: ComboAnalysis, total: number, overBudget: boolean): Insight[] {
  const { cpu, gpu, ram } = combo;
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

  if (input.objective === "gaming") {
    if (integrated) {
      insights.push({ tone: "warning", text: "Para jogar com placa de vídeo dedicada, o orçamento mínimo sugerido é de ~R$ 3.500 (sem periféricos)." });
    } else if (analysis.bottleneck > 0.1) {
      insights.push({ tone: "warning", text: `Gargalo estimado de ${Math.round(analysis.bottleneck * 100)}% da CPU sobre a GPU em ${res}. Um processador mais forte é o próximo upgrade ideal.` });
    } else {
      insights.push({ tone: "success", text: `CPU e GPU equilibradas em ${res}: gargalo estimado abaixo de 10%.` });
    }
  }

  for (const game of profile.signals.games.slice(0, 2)) {
    if (integrated) continue;
    insights.push(
      game.kind === "heavy"
        ? { tone: "info", text: `${game.name}: ~${fps} FPS estimados em ${res} no Ultra sem upscaling; com ${upscalerFor(gpu)} ativado, espere de 30% a 60% a mais.` }
        : { tone: "info", text: `${game.name} é competitivo e leve: espere bem mais de ${Math.min(400, fps * 2)} FPS — nesse caso a CPU é o fator principal.` },
    );
  }

  const platformNote: Record<Socket, string> = {
    AM5: "Plataforma AM5: a AMD mantém suporte a novas gerações, permitindo trocar só o processador no futuro.",
    AM4: "Plataforma AM4: madura e barata, porém sem novas gerações de processador — upgrade futuro limitado.",
    LGA1700: "Plataforma LGA1700: custo-benefício alto, mas é fim de linha para upgrades de CPU Intel.",
    LGA1851: "Plataforma LGA1851 (Core Ultra 200S): geração atual da Intel, com DDR5 e PCIe 5.0.",
  };
  insights.push({ tone: "info", text: platformNote[cpu.socket] });

  const leftover = input.budget - total;
  if (!overBudget && leftover >= Math.max(800, input.budget * 0.15)) {
    const suggestion: Record<Objective, string> = {
      gaming: "um monitor de alta taxa de atualização",
      arquitetura: "um monitor com boa fidelidade de cores",
      dev: "um segundo monitor ou um nobreak",
      office: "periféricos ergonômicos ou um nobreak",
    };
    insights.push({
      tone: "success",
      text: `A IA economizou ${brl(leftover)}: acima disso o ganho para ${OBJECTIVE_LABEL[input.objective]} seria pequeno. Considere usar a sobra em ${suggestion[input.objective]}.`,
    });
  }

  if (input.objective === "arquitetura" && gpu.brand === "nvidia") {
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

/** Executa o motor local completo e monta o resultado no formato da API. */
function computeLocalBuild(rawInput: BuildInput): BuildResult {
  const input = normalizeInput(rawInput);
  const signals = parsePrompt(input.prompt);
  const profile = buildProfile(input, signals);
  const peripherals = input.includePeripherals ? pickPeripheralKit(input, signals) : null;
  const pcBudget = input.budget - (peripherals?.price ?? 0);

  const combo = searchCombos(input, profile, pcBudget, "best") ?? searchCombos(input, profile, Number.POSITIVE_INFINITY, "cheapest");
  if (!combo) throw new Error("Catálogo vazio: nenhuma combinação encontrada.");

  const analysis = analyzeCombo(combo, profile);
  const pcTotal = comboPrice(combo);
  const total = pcTotal + (peripherals?.price ?? 0);
  const overBudget = total > input.budget;
  const { cpu, gpu, mobo, ram, psu, kit } = combo;
  const draw = systemDraw(cpu, gpu);
  const integrated = gpu.brand === "integrated";

  const compatibility: CompatibilityCheck[] = [
    { label: "Socket", detail: `${cpu.socket} no processador e na placa-mãe`, ok: cpu.socket === mobo.socket },
    { label: "VRM", detail: `Placa-mãe sustenta ~${mobo.maxCpuPower}W · CPU usa ~${cpu.power}W`, ok: mobo.maxCpuPower >= cpu.power },
    { label: "Memória", detail: `Placa-mãe ${mobo.memory} com kit ${ram.capacity}GB ${ram.memory}`, ok: mobo.memory === ram.memory },
    { label: "Fonte", detail: `~${draw}W estimados · fonte de ${psu.watts}W`, ok: psu.watts >= requiredPsuWatts(cpu, gpu) },
    { label: "Refrigeração", detail: kit.usesBoxCooler ? `Cooler box para CPU de ~${cpu.power}W` : `CPU ~${cpu.power}W · cooler até ${kit.maxTdp}W`, ok: kit.maxTdp >= cpu.power && (!kit.usesBoxCooler || cpu.boxCooler) },
    { label: "Gabinete", detail: `Formato ${mobo.formFactor} suportado`, ok: kit.formFactors.includes(mobo.formFactor) },
    { label: "Vídeo", detail: integrated ? `Saída de vídeo pelo ${cpu.igpu?.name}` : `GPU PCIe x16 · requer ${gpu.minPsu}W`, ok: integrated ? cpu.igpu !== null : true },
  ];

  const interpretation = [
    `${OBJECTIVE_LABEL[input.objective]}${input.objective === "gaming" ? ` ${RESOLUTION_LABEL[input.resolution]}` : ""}`,
    `Teto de ${brl(input.budget)}`,
    input.brand === "any" ? "Marca indiferente" : `Preferência ${input.brand === "amd" ? "AMD" : "Intel"}`,
    ...(profile.silent ? ["Foco em silêncio"] : []),
    ...(peripherals ? ["Com monitor e periféricos"] : []),
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
    fpsEstimate: input.objective === "gaming" && !integrated ? estimateFps(analysis.metrics.game, input.resolution) : null,
    bottleneck: analysis.bottleneck,
    compatibility,
    insights: buildInsights(combo, input, profile, analysis, total, overBudget),
    interpretation,
    overBudget,
    source: "local",
    input,
  };
}

function buildSummaryText(result: BuildResult) {
  const { input } = result;
  const line = "-".repeat(60);
  const lines = [
    "SMARTBUILD AI — RESUMO DO ORÇAMENTO",
    `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
    line,
    `Objetivo: ${OBJECTIVE_LABEL[input.objective]}${input.objective === "gaming" ? ` (${RESOLUTION_LABEL[input.resolution]})` : ""}`,
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
    `Desempenho estimado para o objetivo: ${result.score}/100${result.fpsEstimate ? ` · ~${result.fpsEstimate} FPS em AAA (Ultra)` : ""}`,
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

/* ============================================================================
 * 5. INTEGRAÇÃO COM A API DE IA — /api/recomendacao
 * ----------------------------------------------------------------------------
 * COMO CONECTAR UM LLM DE VERDADE:
 *
 *   1. Crie o arquivo `src/app/api/recomendacao/route.ts` exportando
 *      `export async function POST(request: Request)`.
 *   2. Leia o corpo com `await request.json()` → ele chega no formato
 *      `BuildInput` (budget, objective, resolution, brand, includePeripherals,
 *      silent, prompt).
 *   3. Chame o LLM no servidor (as chaves ficam em `.env.local`, nunca no
 *      front). O projeto já tem o pacote `ai` com `@ai-sdk/google` e
 *      `@ai-sdk/openai` instalados — use a geração de objeto estruturado do
 *      AI SDK com um schema igual a `BuildResult` para receber JSON válido.
 *      Dica: envie também o catálogo (ou a build do motor local) no prompt
 *      para a IA escolher apenas peças reais e com preço conhecido.
 *   4. Retorne `Response.json(resultado)` no formato `BuildResult`
 *      (parts, total, budget, tier, platform, score, performance,
 *      fpsEstimate, bottleneck, compatibility, insights, interpretation,
 *      overBudget, input).
 *   5. Mude `USE_REMOTE_API` abaixo para `true`.
 *
 * Se a API falhar (offline, sem chave, timeout), o sistema volta
 * automaticamente para o motor local — a apresentação nunca quebra.
 * ==========================================================================*/

const USE_REMOTE_API = false;
const API_ENDPOINT = "/api/recomendacao";
const API_TIMEOUT_MS = 20000;

async function requestRecommendation(input: BuildInput): Promise<BuildResult> {
  if (USE_REMOTE_API) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    try {
      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as BuildResult;
      // Validação mínima: se o LLM devolver algo incompleto, usa o motor local.
      if (!Array.isArray(data.parts) || data.parts.length === 0) throw new Error("Resposta sem peças");
      return { ...data, input, source: "api" };
    } catch (error) {
      console.warn("[SmartBuild AI] API indisponível, usando o motor local:", error);
    } finally {
      clearTimeout(timeout);
    }
  }

  // Motor local (offline): mesmo formato de resposta da API.
  return computeLocalBuild(input);
}

/* ============================================================================
 * 6. COMPONENTES DE INTERFACE
 * ==========================================================================*/

const CATEGORY_UI: Record<PartCategory, { icon: LucideIcon; text: string; box: string; bar: string }> = {
  cpu: { icon: Cpu, text: "text-violet-300", box: "bg-violet-500/10 ring-violet-500/30", bar: "bg-violet-500" },
  gpu: { icon: Gpu, text: "text-blue-300", box: "bg-blue-500/10 ring-blue-500/30", bar: "bg-blue-500" },
  mobo: { icon: CircuitBoard, text: "text-cyan-300", box: "bg-cyan-500/10 ring-cyan-500/30", bar: "bg-cyan-500" },
  ram: { icon: MemoryStick, text: "text-fuchsia-300", box: "bg-fuchsia-500/10 ring-fuchsia-500/30", bar: "bg-fuchsia-500" },
  ssd: { icon: HardDrive, text: "text-emerald-300", box: "bg-emerald-500/10 ring-emerald-500/30", bar: "bg-emerald-500" },
  psu: { icon: Zap, text: "text-amber-300", box: "bg-amber-500/10 ring-amber-500/30", bar: "bg-amber-500" },
  case: { icon: Fan, text: "text-zinc-300", box: "bg-zinc-500/10 ring-zinc-500/30", bar: "bg-zinc-400" },
  extra: { icon: Monitor, text: "text-pink-300", box: "bg-pink-500/10 ring-pink-500/30", bar: "bg-pink-500" },
};

const OBJECTIVES: { id: Objective; title: string; description: string; icon: LucideIcon }[] = [
  { id: "gaming", title: "Gaming", description: "1080p, 1440p ou 4K", icon: Gamepad2 },
  { id: "arquitetura", title: "Arquitetura & Render 3D", description: "Revit, Lumion, Blender", icon: DraftingCompass },
  { id: "dev", title: "Desenvolvimento", description: "IDEs, Docker, VMs", icon: CodeXml },
  { id: "office", title: "Home Office / Estudos", description: "Office, aulas, navegação", icon: GraduationCap },
];

const PROMPT_EXAMPLES = [
  "Quero rodar Baldur's Gate 3 no ultra e usar dois monitores sem travar.",
  "Vou fazer stream na Twitch jogando Warzone.",
  "Rodar Docker, VMs e Android Studio ao mesmo tempo.",
  "Renderizar no Blender e rodar IA local com CUDA.",
];

function Panel({ title, icon: Icon, children, aside }: { title: string; icon: LucideIcon; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 shadow-xl shadow-black/20 backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <Icon className="size-4 text-violet-400" />
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Segmented<T extends string>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  return (
    <div className="grid rounded-xl bg-zinc-950/80 p-1 ring-1 ring-zinc-800" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
            value === option.id ? "bg-linear-to-r from-violet-600 to-blue-600 text-white shadow shadow-violet-500/30" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ToggleRow({ icon: Icon, label, description, checked, onChange }: { icon: LucideIcon; label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
        checked ? "border-violet-500/50 bg-violet-500/10" : "border-zinc-800 bg-zinc-950/50 hover:border-zinc-700"
      }`}
    >
      <Icon className={`size-4 shrink-0 ${checked ? "text-violet-300" : "text-zinc-500"}`} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-zinc-100">{label}</span>
        <span className="block text-xs text-zinc-500">{description}</span>
      </span>
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-violet-500" : "bg-zinc-700"}`}>
        <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${checked ? "left-4.5" : "left-0.5"}`} />
      </span>
    </button>
  );
}

function ProgressBar({ value, tone = "brand" }: { value: number; tone?: "brand" | "danger" | "success" }) {
  const color = tone === "danger" ? "bg-linear-to-r from-rose-500 to-orange-500" : tone === "success" ? "bg-linear-to-r from-emerald-500 to-teal-400" : "bg-linear-to-r from-violet-500 to-blue-500";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
      <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

function PartCard({ part }: { part: RecommendedPart }) {
  const ui = CATEGORY_UI[part.category];
  const Icon = ui.icon;
  const [primary, secondary] = part.searchTerms;

  return (
    <article className="group flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-violet-500/40 hover:bg-zinc-900">
      <div className="flex items-start gap-3">
        <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ${ui.box}`}>
          <Icon className={`size-5 ${ui.text}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{CATEGORY_LABEL[part.category]}</span>
            <span className="shrink-0 text-sm font-bold text-zinc-50">{part.price > 0 ? brl(part.price) : "Incluso"}</span>
          </div>
          <h3 className="mt-1 text-sm font-semibold leading-snug text-zinc-100">{part.name}</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {part.specs.map((spec) => (
              <span key={spec} className="rounded-md bg-zinc-800/80 px-1.5 py-0.5 text-[11px] font-medium text-zinc-400">
                {spec}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-3 flex-1 rounded-xl bg-zinc-950/60 p-3 text-xs leading-relaxed text-zinc-400 ring-1 ring-zinc-800/80">
        <span className="mb-1 flex items-center gap-1 font-semibold text-violet-300">
          <Sparkles className="size-3.5" />
          Por que a IA escolheu
        </span>
        {part.reason}
      </p>

      {primary ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <a
            href={googleShoppingUrl(primary)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500/15 px-3 py-1.5 text-xs font-semibold text-violet-200 ring-1 ring-violet-500/30 transition hover:bg-violet-500/25"
          >
            <Search className="size-3.5" />
            Pesquisar menor preço
          </a>
          {STORES.map((store) => (
            <a
              key={store.id}
              href={store.url(primary)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 px-2 py-1.5 text-[11px] font-medium text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
            >
              {store.label}
              <ExternalLink className="size-3" />
            </a>
          ))}
          {secondary && (
            <a
              href={googleShoppingUrl(secondary)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 px-2 py-1.5 text-[11px] font-medium text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
            >
              <Fan className="size-3" />
              Cooler
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      ) : (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-zinc-500">
          <Check className="size-3.5 text-emerald-400" />
          Já incluso no processador — nada a comprar.
        </p>
      )}
    </article>
  );
}

function CompatibilityCard({ checks }: { checks: CompatibilityCheck[] }) {
  const allOk = checks.every((check) => check.ok);
  return (
    <div className={`rounded-2xl border p-5 ${allOk ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={`flex size-9 items-center justify-center rounded-xl ${allOk ? "bg-emerald-500/15" : "bg-rose-500/15"}`}>
            {allOk ? <ShieldCheck className="size-5 text-emerald-400" /> : <TriangleAlert className="size-5 text-rose-400" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Verificador de Compatibilidade</h3>
            <p className="text-xs text-zinc-500">Socket, VRM, memória, energia e refrigeração</p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${allOk ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30" : "bg-rose-500/15 text-rose-300 ring-rose-500/30"}`}>
          {allOk ? "100% compatível" : "Revisar"}
        </span>
      </div>
      <ul className="space-y-2.5">
        {checks.map((check) => (
          <li key={check.label} className="flex items-start gap-2.5">
            {check.ok ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-400" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0 text-rose-400" />}
            <div className="min-w-0 text-xs">
              <span className="font-semibold text-zinc-200">{check.label}</span>
              <span className="text-zinc-400"> · {check.detail}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BudgetCard({ result }: { result: BuildResult }) {
  const usedPct = (result.total / result.budget) * 100;
  const remaining = result.budget - result.total;
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-xl bg-violet-500/15">
          <Wallet className="size-5 text-violet-300" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">Orçamento Utilizado vs. Disponível</h3>
          <p className="text-xs text-zinc-500">Teto definido: {brl(result.budget)}</p>
        </div>
      </div>

      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-2xl font-bold tracking-tight text-zinc-50">{brl(result.total)}</p>
          <p className="text-xs text-zinc-500">utilizados</p>
        </div>
        <p className={`text-right text-xs font-semibold ${remaining >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
          {remaining >= 0 ? `${brl(remaining)} livres` : `${brl(-remaining)} acima`}
          <span className="block font-normal text-zinc-500">{usedPct.toFixed(1).replace(".", ",")}% do teto</span>
        </p>
      </div>
      <div className="mt-3">
        <ProgressBar value={usedPct} tone={result.overBudget ? "danger" : "brand"} />
      </div>

      <p className="mt-5 mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Distribuição por peça</p>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
        {result.parts
          .filter((part) => part.price > 0)
          .map((part) => (
            <div key={part.category} className={`h-full ${CATEGORY_UI[part.category].bar}`} style={{ width: `${(part.price / result.total) * 100}%` }} title={`${CATEGORY_LABEL[part.category]}: ${brl(part.price)}`} />
          ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
        {result.parts
          .filter((part) => part.price > 0)
          .map((part) => (
            <div key={part.category} className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <span className={`size-2 shrink-0 rounded-full ${CATEGORY_UI[part.category].bar}`} />
              <span className="truncate">{CATEGORY_LABEL[part.category].split(" (")[0]}</span>
              <span className="ml-auto font-medium text-zinc-300">{Math.round((part.price / result.total) * 100)}%</span>
            </div>
          ))}
      </div>
    </div>
  );
}

function scoreLabel(score: number) {
  if (score >= 85) return "Excelente";
  if (score >= 70) return "Muito bom";
  if (score >= 55) return "Bom";
  if (score >= 40) return "Básico";
  return "Limitado";
}

function PerformanceCard({ result }: { result: BuildResult }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const bottleneckPct = Math.round(result.bottleneck * 100);
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 md:col-span-2">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500/15">
          <Gauge className="size-5 text-blue-300" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">Estimativa de Desempenho</h3>
          <p className="text-xs text-zinc-500">Pontuação relativa ao seu objetivo: {OBJECTIVE_LABEL[result.input.objective]}</p>
        </div>
      </div>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="relative mx-auto size-32 shrink-0 sm:mx-0">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90">
            <defs>
              <linearGradient id="score-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="9" className="stroke-zinc-800" />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              strokeWidth="9"
              strokeLinecap="round"
              stroke="url(#score-gradient)"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - result.score / 100)}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-zinc-50">{result.score}</span>
            <span className="text-[11px] font-medium text-zinc-400">{scoreLabel(result.score)}</span>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          {result.performance.map((metric) => (
            <div key={metric.label}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-zinc-400">{metric.label}</span>
                <span className="font-semibold text-zinc-200">{metric.value}/100</span>
              </div>
              <ProgressBar value={metric.value} />
            </div>
          ))}
          <div className="flex flex-wrap gap-2 pt-1">
            {result.fpsEstimate !== null && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-200 ring-1 ring-blue-500/30">
                <Activity className="size-3.5" />~{result.fpsEstimate} FPS em AAA · {RESOLUTION_LABEL[result.input.resolution]} Ultra
              </span>
            )}
            {result.input.objective === "gaming" && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ${
                  bottleneckPct <= 10 ? "bg-emerald-500/10 text-emerald-200 ring-emerald-500/30" : "bg-amber-500/10 text-amber-200 ring-amber-500/30"
                }`}
              >
                <Target className="size-3.5" />
                {bottleneckPct <= 10 ? "Gargalo CPU/GPU baixo" : `Gargalo de CPU ~${bottleneckPct}%`}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightsCard({ insights }: { insights: Insight[] }) {
  const toneUi: Record<InsightTone, { icon: LucideIcon; className: string }> = {
    success: { icon: CircleCheck, className: "text-emerald-400" },
    info: { icon: Info, className: "text-blue-400" },
    warning: { icon: TriangleAlert, className: "text-amber-400" },
  };
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-100">
        <BrainCircuit className="size-4 text-violet-400" />
        Observações da IA
      </h3>
      <ul className="space-y-2.5">
        {insights.map((insight) => {
          const { icon: Icon, className } = toneUi[insight.tone];
          return (
            <li key={insight.text} className="flex items-start gap-2.5 text-sm leading-relaxed text-zinc-300">
              <Icon className={`mt-0.5 size-4 shrink-0 ${className}`} />
              {insight.text}
            </li>
          );
        })}
      </ul>
      <p className="mt-4 border-t border-zinc-800 pt-3 text-[11px] text-zinc-500">
        Preços estimados de referência do mercado brasileiro. Use os links de busca para conferir o menor preço do dia.
      </p>
    </div>
  );
}

function EmptyState({ onPreset }: { onPreset: (preset: Preset) => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-12 text-center">
      <div className="relative">
        <div className="absolute inset-0 rounded-3xl bg-violet-500/30 blur-2xl" />
        <div className="relative flex size-20 items-center justify-center rounded-3xl bg-linear-to-br from-violet-600 to-blue-600 shadow-2xl shadow-violet-500/30">
          <Bot className="size-10 text-white" />
        </div>
      </div>
      <h2 className="mt-6 text-xl font-bold text-zinc-50">Sua build ideal aparece aqui</h2>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        Defina orçamento e objetivo ao lado e a IA monta a configuração com peças 100% compatíveis, sem gargalos e com links para o menor preço.
      </p>

      <div className="mt-8 w-full max-w-2xl">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Cenários prontos para testar</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {PRESETS.map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onPreset(preset)}
                className="group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 text-left transition hover:border-violet-500/50 hover:bg-violet-500/5"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800 transition group-hover:bg-violet-500/20">
                  <Icon className="size-5 text-zinc-300 group-hover:text-violet-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-100">{preset.title}</p>
                  <p className="text-xs text-zinc-500">{preset.subtitle}</p>
                </div>
                <WandSparkles className="ml-auto size-4 shrink-0 text-zinc-600 group-hover:text-violet-400" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LoadingState({ step }: { step: number }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-violet-500/20 bg-zinc-900/50 px-6 py-14">
      <div className="relative flex size-20 items-center justify-center">
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-zinc-800 border-t-violet-500 border-r-blue-500" />
        <BrainCircuit className="size-8 animate-pulse text-violet-300" />
      </div>
      <h2 className="mt-6 text-lg font-bold text-zinc-50">A IA está montando sua build…</h2>
      <p className="mt-1 text-sm text-zinc-500">Analisando compatibilidade e preços</p>
      <ul className="mt-8 w-full max-w-sm space-y-3">
        {LOADING_STEPS.map((label, index) => (
          <li key={label} className={`flex items-center gap-3 text-sm transition ${index <= step ? "text-zinc-200" : "text-zinc-600"}`}>
            {index < step ? (
              <CircleCheck className="size-4 shrink-0 text-emerald-400" />
            ) : index === step ? (
              <LoaderCircle className="size-4 shrink-0 animate-spin text-violet-400" />
            ) : (
              <span className="size-4 shrink-0 rounded-full border border-zinc-700" />
            )}
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ============================================================================
 * 7. PÁGINA
 * ==========================================================================*/

export default function Home() {
  const [budget, setBudget] = useState(8000);
  const [objective, setObjective] = useState<Objective>("gaming");
  const [resolution, setResolution] = useState<Resolution>("1440p");
  const [brand, setBrand] = useState<BrandPreference>("any");
  const [includePeripherals, setIncludePeripherals] = useState(false);
  const [silent, setSilent] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<BuildResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const currentInput = useMemo<BuildInput>(
    () => ({ budget, objective, resolution, brand, includePeripherals, silent, prompt }),
    [budget, objective, resolution, brand, includePeripherals, silent, prompt],
  );
  const isStale = result !== null && !loading && !sameInput(result.input, currentInput);

  const showToast = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const generate = async (override?: BuildInput) => {
    if (loading) return;
    const payload = normalizeInput(override ?? currentInput);
    setBudget(payload.budget);
    setLoading(true);
    setLoadingStep(0);
    if (window.innerWidth < 1024) resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    const animation = (async () => {
      for (let i = 0; i < LOADING_STEPS.length; i++) {
        setLoadingStep(i);
        await sleep(480);
      }
    })();

    try {
      const [build] = await Promise.all([requestRecommendation(payload), animation]);
      setResult(build);
    } catch (error) {
      console.error(error);
      showToast("Não foi possível gerar a build. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (preset: Preset) => {
    const input = preset.input;
    setBudget(input.budget);
    setObjective(input.objective);
    setResolution(input.resolution);
    setBrand(input.brand);
    setIncludePeripherals(input.includePeripherals);
    setSilent(input.silent);
    setPrompt(input.prompt);
    void generate(input);
  };

  const handleExport = () => {
    if (!result) return;
    const blob = new Blob([buildSummaryText(result)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `smartbuild-orcamento-${result.input.objective}-${result.total}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Resumo do orçamento exportado (.txt)");
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(buildSummaryText(result));
      showToast("Resumo copiado para a área de transferência");
    } catch {
      showToast("Não foi possível copiar — use Exportar.");
    }
  };

  const budgetPct = ((clampBudget(budget) - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * 100;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-zinc-950 font-sans text-zinc-100 antialiased">
      {/* Brilhos de fundo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-blue-600/15 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-fuchsia-600/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-blue-500 shadow-lg shadow-violet-500/30">
              <Cpu className="size-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight tracking-tight">
                SmartBuild <span className="bg-linear-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">AI</span>
              </h1>
              <p className="hidden text-xs text-zinc-500 sm:block">Montagem inteligente de PCs sem incompatibilidades</p>
            </div>
            <span className="hidden items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-500/30 sm:inline-flex">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
              </span>
              IA Ativa
            </span>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={!result}
            title={result ? "Baixar resumo do orçamento" : "Gere uma build para exportar"}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-semibold text-zinc-100 transition hover:border-violet-500/60 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="size-4" />
            <span className="hidden sm:inline">Exportar Orçamento / Resumo</span>
            <span className="sm:hidden">Exportar</span>
          </button>
        </div>
      </header>

      <main className="relative mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-12 lg:py-8">
        {/* ===================== Coluna da esquerda: configuração ===================== */}
        <aside className="min-w-0 space-y-4 lg:col-span-4">
          <Panel title="Orçamento Máximo" icon={Wallet}>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-semibold text-zinc-500">R$</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={BUDGET_MIN}
                  max={BUDGET_MAX}
                  step={100}
                  value={budget}
                  onChange={(event) => setBudget(Number(event.target.value))}
                  onBlur={() => setBudget(clampBudget(budget))}
                  aria-label="Orçamento máximo em reais"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 pr-3 pl-10 text-lg font-bold text-zinc-50 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
                />
              </div>
            </div>
            <input
              type="range"
              min={BUDGET_MIN}
              max={BUDGET_MAX}
              step={250}
              value={clampBudget(budget)}
              onChange={(event) => setBudget(Number(event.target.value))}
              aria-label="Ajustar orçamento"
              className="mt-4 w-full cursor-pointer accent-violet-500"
            />
            <div className="mt-1 flex justify-between text-[11px] text-zinc-500">
              <span>{brl(BUDGET_MIN)}</span>
              <span className="font-semibold text-violet-300">{Math.round(budgetPct)}% da faixa</span>
              <span>{brl(BUDGET_MAX)}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[3000, 5000, 8000, 12000, 20000].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setBudget(value)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    clampBudget(budget) === value ? "bg-violet-500/20 text-violet-200 ring-1 ring-violet-500/40" : "bg-zinc-800/70 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {value / 1000}k
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Objetivo Principal" icon={Target}>
            <div className="grid grid-cols-2 gap-2.5">
              {OBJECTIVES.map((item) => {
                const Icon = item.icon;
                const active = objective === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setObjective(item.id)}
                    aria-pressed={active}
                    className={`relative flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition ${
                      active ? "border-violet-500/60 bg-linear-to-br from-violet-500/15 to-blue-500/10 shadow-lg shadow-violet-500/10" : "border-zinc-800 bg-zinc-950/50 hover:border-zinc-700"
                    }`}
                  >
                    {active && <CircleCheck className="absolute top-2.5 right-2.5 size-4 text-violet-300" />}
                    <div className={`flex size-9 items-center justify-center rounded-lg ${active ? "bg-violet-500/25" : "bg-zinc-800"}`}>
                      <Icon className={`size-5 ${active ? "text-violet-200" : "text-zinc-400"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-tight text-zinc-100">{item.title}</p>
                      <p className="mt-0.5 text-[11px] text-zinc-500">{item.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            {objective === "gaming" && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-zinc-400">Resolução alvo</p>
                <Segmented<Resolution>
                  value={resolution}
                  onChange={setResolution}
                  options={[
                    { id: "1080p", label: "1080p" },
                    { id: "1440p", label: "1440p" },
                    { id: "4k", label: "4K" },
                  ]}
                />
              </div>
            )}
          </Panel>

          <Panel title="Preferências Opcionais" icon={SlidersHorizontal}>
            <p className="mb-2 text-xs font-medium text-zinc-400">Marca do processador</p>
            <Segmented<BrandPreference>
              value={brand}
              onChange={setBrand}
              options={[
                { id: "any", label: "Indiferente" },
                { id: "amd", label: "Prefiro AMD" },
                { id: "intel", label: "Prefiro Intel" },
              ]}
            />
            <div className="mt-3 space-y-2">
              <ToggleRow icon={Monitor} label="Incluir Monitor e Periféricos" description="Reserva parte do orçamento para monitor, teclado e mouse" checked={includePeripherals} onChange={setIncludePeripherals} />
              <ToggleRow icon={Volume2} label="Foco em Silêncio/Refrigeração" description="Prioriza coolers silenciosos e boa ventilação" checked={silent} onChange={setSilent} />
            </div>
          </Panel>

          <Panel title="Pedido para a IA" icon={MessageSquareText} aside={<span className="text-[11px] text-zinc-500">{prompt.length}/500</span>}>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value.slice(0, 500))}
              rows={4}
              placeholder="Ex.: Quero rodar Baldur's Gate 3 no ultra e usar dois monitores sem travar."
              className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PROMPT_EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setPrompt(example)}
                  className="max-w-full truncate rounded-lg bg-zinc-800/70 px-2 py-1 text-[11px] text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
                >
                  {example}
                </button>
              ))}
            </div>
          </Panel>

          <button
            type="button"
            onClick={() => void generate()}
            disabled={loading}
            className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-linear-to-r from-violet-600 via-indigo-600 to-blue-600 px-6 py-4 text-base font-bold text-white shadow-2xl shadow-violet-600/30 transition hover:shadow-violet-500/50 disabled:cursor-wait disabled:opacity-80"
          >
            <span className="absolute inset-0 bg-linear-to-r from-white/0 via-white/15 to-white/0 opacity-0 transition group-hover:opacity-100" />
            {loading ? (
              <>
                <LoaderCircle className="size-5 animate-spin" />
                <span className="truncate">{LOADING_STEPS[loadingStep]}…</span>
              </>
            ) : (
              <>
                <Sparkles className="size-5" />
                Gerar Build Ideal com IA
              </>
            )}
          </button>
        </aside>

        {/* ===================== Coluna da direita: resultado ===================== */}
        <section ref={resultsRef} className="min-w-0 scroll-mt-20 space-y-4 lg:col-span-8">
          {loading ? (
            <LoadingState step={loadingStep} />
          ) : !result ? (
            <EmptyState onPreset={applyPreset} />
          ) : (
            <>
              {isStale && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  <TriangleAlert className="size-4 shrink-0" />
                  <span className="flex-1">Você alterou os parâmetros. Gere novamente para atualizar a recomendação.</span>
                  <button type="button" onClick={() => void generate()} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-semibold hover:bg-amber-500/30">
                    <RotateCcw className="size-3.5" />
                    Atualizar
                  </button>
                </div>
              )}

              {/* Resumo da build */}
              <div className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-linear-to-br from-violet-600/15 via-zinc-900/80 to-blue-600/10 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-violet-200">Build {result.tier}</span>
                      <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-300">{result.platform}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-400">
                        <Bot className="size-3" />
                        {result.source === "api" ? "LLM via /api/recomendacao" : "Motor local (offline)"}
                      </span>
                    </div>
                    <h2 className="mt-3 text-2xl font-bold tracking-tight text-zinc-50">{brl(result.total)}</h2>
                    <p className="text-sm text-zinc-400">
                      {result.parts.length} itens · {OBJECTIVE_LABEL[result.input.objective]}
                      {result.input.objective === "gaming" ? ` em ${RESOLUTION_LABEL[result.input.resolution]}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => void handleCopy()}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:border-violet-500/60"
                    >
                      <Copy className="size-3.5" />
                      Copiar resumo
                    </button>
                    <button
                      type="button"
                      onClick={() => void generate()}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:border-violet-500/60"
                    >
                      <RotateCcw className="size-3.5" />
                      Regenerar
                    </button>
                  </div>
                </div>
                <div className="mt-4 border-t border-zinc-800/80 pt-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Como a IA interpretou seu pedido</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.interpretation.map((chip) => (
                      <span key={chip} className="rounded-md bg-zinc-950/60 px-2 py-1 text-[11px] font-medium text-zinc-300 ring-1 ring-zinc-800">
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Indicadores de saúde */}
              <div className="grid gap-4 md:grid-cols-2">
                <CompatibilityCard checks={result.compatibility} />
                <BudgetCard result={result} />
                <PerformanceCard result={result} />
              </div>

              {/* Peças */}
              <div>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-100">
                  <Cpu className="size-4 text-violet-400" />
                  Peças recomendadas
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {result.parts.map((part) => (
                    <PartCard key={part.category} part={part} />
                  ))}
                </div>
              </div>

              <InsightsCard insights={result.insights} />
            </>
          )}
        </section>
      </main>

      <footer className="relative border-t border-zinc-800/80 py-6 text-center text-xs text-zinc-600">
        SmartBuild AI · Projeto Integrativa · Recomendações geradas por IA com preços estimados de referência
      </footer>

      {/* Toast */}
      {toast && (
        <div className="fixed right-4 bottom-4 left-4 z-50 flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900/95 px-4 py-3 text-sm text-zinc-100 shadow-2xl backdrop-blur sm:left-auto">
          <CircleCheck className="size-4 shrink-0 text-emerald-400" />
          <span className="flex-1">{toast}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Fechar aviso" className="text-zinc-500 hover:text-zinc-200">
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
