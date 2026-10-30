export type Objective = "gaming" | "arquitetura" | "dev" | "office";
export type Resolution = "1080p" | "1440p" | "4k";
export type BrandPreference = "any" | "amd" | "intel";
export type Socket = "AM4" | "AM5" | "LGA1200" | "LGA1700" | "LGA1851";
export type MemoryType = "DDR4" | "DDR5";
export type FormFactor = "mATX" | "ATX";
export type PartCategory = "cpu" | "gpu" | "mobo" | "ram" | "ssd" | "psu" | "case" | "extra";
export type MetricKey = "game" | "render" | "cpuMulti" | "cpuSingle" | "ram" | "ssd" | "mobo" | "psu" | "cooling";
export type MetricTable = Record<MetricKey, number>;
export type InsightTone = "success" | "info" | "warning";

/** Dados que o usuário envia para a IA (local ou remota). */
export interface BuildInput {
  budget: number;
  /** Um ou mais usos do PC (ex.: arquitetura + gaming). */
  objectives: Objective[];
  resolution: Resolution;
  brand: BrandPreference;
  includePeripherals: boolean;
  silent: boolean;
  prompt: string;
}

export interface RecommendedPart {
  category: PartCategory;
  name: string;
  price: number;
  reason: string;
  specs: string[];
  /** Termos usados nos links de busca de preço (vazio = nada a comprar). */
  searchTerms: string[];
}

export interface CompatibilityCheck {
  label: string;
  detail: string;
  ok: boolean;
}

export interface PerformanceMetric {
  label: string;
  value: number;
}

export interface Insight {
  tone: InsightTone;
  text: string;
}

/** Resposta completa de uma recomendação. É também o contrato JSON da API. */
export interface BuildResult {
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

export interface CatalogItem {
  id: string;
  name: string;
  search: string;
  price: number;
  note: string;
}

export interface CpuOption extends CatalogItem {
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

export interface MoboOption extends CatalogItem {
  socket: Socket;
  memory: MemoryType;
  formFactor: FormFactor;
  wifi: boolean;
  /** Potência de CPU que o VRM sustenta com folga (W). */
  maxCpuPower: number;
  score: number;
}

export interface RamOption extends CatalogItem {
  memory: MemoryType;
  capacity: number;
  score: number;
}

export interface SsdOption extends CatalogItem {
  capacity: number;
  score: number;
  kind: "nvme" | "sata" | "hdd";
}

export interface GpuOption extends CatalogItem {
  brand: "nvidia" | "amd" | "intel" | "integrated";
  vram: number;
  power: number;
  /** Fonte mínima recomendada pelo fabricante (W). */
  minPsu: number;
  gaming: number;
  render: number;
}

export interface PsuOption extends CatalogItem {
  watts: number;
  rating: string;
  score: number;
}

export interface CaseKitOption extends CatalogItem {
  coolerSearch: string | null;
  maxTdp: number;
  formFactors: FormFactor[];
  usesBoxCooler: boolean;
  cooling: number;
  silence: number;
}

export type PeripheralKit = CatalogItem;

export interface Combo {
  cpu: CpuOption;
  mobo: MoboOption;
  ram: RamOption;
  gpu: GpuOption;
  psu: PsuOption;
  kit: CaseKitOption;
  ssd: SsdOption;
}

/** Build montada pelo usuário (ou lida de um PDF): qualquer peça pode faltar. */
export interface PartialBuild {
  cpu?: CpuOption;
  mobo?: MoboOption;
  ram?: RamOption;
  /** "integrated" = usar o vídeo integrado do processador. */
  gpu?: GpuOption | "integrated";
  ssd?: SsdOption;
  psu?: PsuOption;
  kit?: CaseKitOption;
}

export interface PromptSignals {
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
