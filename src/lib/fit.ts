import type { PartCategory, PromptSignals, Sector } from "./types";

/**
 * Adequação ao uso: compara cada peça com uma faixa de referência por setor e
 * diz se está adequada, em excesso ou insuficiente. As faixas são critério do
 * SmartBuild (não vêm de lei nem de fabricante): ajuste-as em NEEDS.
 */
export type FitStatus = "adequado" | "excesso" | "insuficiente";

export interface FitItem {
  category: PartCategory;
  label: string;
  /** O que a peça oferece, sem marca nem modelo. */
  value: string;
  /** Referência para o uso, em texto. */
  reference: string;
  status: FitStatus;
  detail: string;
}

export interface FitReport {
  items: FitItem[];
  excess: number;
  insufficient: number;
  /** Justificativa técnica, sem marca nem modelo, uma frase por linha. */
  justification: string[];
}

export interface FitInput {
  sectors: Sector[];
  softwares: string[];
  signals: PromptSignals;
  useLabel: string;
  /** Nível de jogo que o uso aproveita (0–100) e VRAM pedida pela resolução. */
  gameCap: number;
  requiredVram: number;
  resolutionLabel: string;
  cpuName?: string;
  gpu?: { integrated: boolean; vram: number; gaming: number };
  ramGb?: number;
  storageGb?: number;
  psu?: { watts: number; requiredWatts: number };
}

type GpuNeed = "none" | "optional" | "pro" | "gaming";
interface Need {
  cores: [number, number];
  ram: [number, number];
  storage: [number, number];
  gpu: GpuNeed;
  /** Nota a partir da qual a placa de vídeo sobra (quando difere do padrão). */
  gpuExcess?: number;
}

const OFFICE: Need = { cores: [4, 10], ram: [16, 32], storage: [480, 1000], gpu: "none" };

const NEEDS: Record<Sector, Need> = {
  escritorio: OFFICE,
  contabilidade: OFFICE,
  educacao: OFFICE,
  juridico: { ...OFFICE, storage: [480, 2000] },
  rh: OFFICE,
  saude: OFFICE,
  desenvolvimento: { cores: [6, 16], ram: [16, 64], storage: [500, 2000], gpu: "optional" },
  design: { cores: [6, 16], ram: [16, 64], storage: [1000, 4000], gpu: "optional" },
  marketing: { cores: [6, 16], ram: [16, 64], storage: [1000, 4000], gpu: "optional", gpuExcess: 92 },
  engenharia: { cores: [6, 24], ram: [32, 64], storage: [1000, 4000], gpu: "pro" },
  gaming: { cores: [6, 16], ram: [16, 32], storage: [1000, 2000], gpu: "gaming" },
};

const GPU_RANK: Record<GpuNeed, number> = { none: 0, optional: 1, pro: 2, gaming: 3 };

const MEMORY_HEAVY = ["Docker", "Android Studio", "Premiere Pro", "After Effects"];
const VIDEO_HEAVY = ["Premiere Pro", "After Effects"];
const CORE_HEAVY = ["Streaming", "Docker", "Android Studio", "Premiere Pro"];

/** Abaixo destas notas, uma placa de vídeo dedicada é só o básico para dar imagem. */
const GPU_EXCESS: Record<Exclude<GpuNeed, "gaming">, number> = { none: 44, optional: 72, pro: 92 };
const GPU_PRO_MIN_VRAM = 8;

function needFor({ sectors, softwares, signals }: FitInput): Need {
  const needs = sectors.map((sector) => NEEDS[sector]);
  const range = (key: "cores" | "ram" | "storage"): [number, number] => [Math.max(...needs.map((need) => need[key][0])), Math.max(...needs.map((need) => need[key][1]))];
  const merged: Need = { cores: range("cores"), ram: range("ram"), storage: range("storage"), gpu: needs.reduce<GpuNeed>((best, need) => (GPU_RANK[need.gpu] > GPU_RANK[best] ? need.gpu : best), "none"), gpuExcess: Math.max(...needs.map((need) => need.gpuExcess ?? 0)) || undefined };

  const uses = (list: string[]) => softwares.some((software) => list.includes(software));
  if (uses(MEMORY_HEAVY) || signals.virtualization) merged.ram = [32, Math.max(merged.ram[1], 64)];
  if (uses(CORE_HEAVY) || signals.streaming || signals.virtualization) merged.cores = [Math.max(merged.cores[0], 8), Math.max(merged.cores[1], 16)];
  if ((uses(VIDEO_HEAVY) || signals.render || signals.editing || signals.ai) && GPU_RANK[merged.gpu] < GPU_RANK.pro) merged.gpu = "pro";
  return merged;
}

const size = (gb: number) => (gb >= 1000 ? `${gb / 1000}TB` : `${gb}GB`);

function classify(amount: number, [min, max]: [number, number]): FitStatus {
  if (amount < min) return "insuficiente";
  return amount > max ? "excesso" : "adequado";
}

function explain(status: FitStatus, reference: string, useLabel: string) {
  if (status === "excesso") return `Acima da referência (${reference}) para ${useLabel}. Dá para reduzir e economizar sem perder desempenho nesse uso.`;
  if (status === "insuficiente") return `Abaixo da referência (${reference}) para ${useLabel}. Pode ficar lento nesse uso; vale aumentar.`;
  return `Dentro da referência (${reference}) para ${useLabel}.`;
}

function gpuItem(input: FitInput, need: Need): FitItem | null {
  const { gpu, useLabel, gameCap, requiredVram, resolutionLabel } = input;
  if (!gpu) return null;
  const value = gpu.integrated ? "Vídeo integrado" : `Dedicada, ${gpu.vram}GB`;
  const base = { category: "gpu" as const, label: "Vídeo", value };

  if (need.gpu === "gaming") {
    const reference = `dedicada para ${resolutionLabel}, com ${requiredVram}GB ou mais`;
    const weak = gpu.integrated || gpu.vram < requiredVram || gpu.gaming < gameCap * 0.5;
    const status: FitStatus = weak ? "insuficiente" : gpu.gaming > gameCap + 8 ? "excesso" : "adequado";
    return { ...base, reference, status, detail: explain(status, reference, useLabel) };
  }
  if (need.gpu === "pro") {
    const reference = `dedicada com ${GPU_PRO_MIN_VRAM}GB ou mais`;
    const status: FitStatus = gpu.integrated || gpu.vram < GPU_PRO_MIN_VRAM ? "insuficiente" : gpu.gaming >= GPU_EXCESS.pro ? "excesso" : "adequado";
    return { ...base, reference, status, detail: explain(status, reference, useLabel) };
  }
  const reference = need.gpu === "none" ? "vídeo integrado ou placa básica" : "placa intermediária, se usada";
  const status: FitStatus = !gpu.integrated && gpu.gaming >= (need.gpuExcess ?? GPU_EXCESS[need.gpu]) ? "excesso" : "adequado";
  return { ...base, reference, status, detail: explain(status, reference, useLabel) };
}

const WHY: Partial<Record<PartCategory, string>> = {
  cpu: "para manter os programas do dia a dia rápidos",
  ram: "para trabalhar com vários programas abertos sem lentidão",
  ssd: "para guardar o sistema, os programas e os arquivos do setor",
  psu: "para atender ao consumo do computador com folga",
};

function justificationLine(item: FitItem) {
  const why = item.category === "gpu" ? (item.value === "Vídeo integrado" ? "suficiente porque o uso não exige placa dedicada" : "para atender às exigências gráficas do uso") : WHY[item.category];
  const note = item.status === "excesso" ? " (acima da referência: rever)" : item.status === "insuficiente" ? " (abaixo da referência: rever)" : "";
  return `${item.label} (${item.value}): ${why}${note}.`;
}

export function analyzeFit(input: FitInput): FitReport {
  const need = needFor(input);
  const { useLabel, softwares } = input;
  const items: FitItem[] = [];

  const cores = input.cpuName?.match(/(\d+)C\//);
  if (cores) {
    const reference = `${need.cores[0]} a ${need.cores[1]} núcleos`;
    const status = classify(Number(cores[1]), need.cores);
    items.push({ category: "cpu", label: "Processador", value: `${cores[1]} núcleos`, reference, status, detail: explain(status, reference, useLabel) });
  }
  const gpu = gpuItem(input, need);
  if (gpu) items.push(gpu);
  if (input.ramGb !== undefined) {
    const reference = `${need.ram[0]}GB a ${need.ram[1]}GB`;
    const status = classify(input.ramGb, need.ram);
    items.push({ category: "ram", label: "Memória", value: `${input.ramGb}GB`, reference, status, detail: explain(status, reference, useLabel) });
  }
  if (input.storageGb !== undefined) {
    const reference = `${size(need.storage[0])} a ${size(need.storage[1])}`;
    const status = classify(input.storageGb, need.storage);
    items.push({ category: "ssd", label: "Armazenamento", value: size(input.storageGb), reference, status, detail: explain(status, reference, useLabel) });
  }
  if (input.psu) {
    const { watts, requiredWatts } = input.psu;
    const reference = `${requiredWatts}W ou mais`;
    const status: FitStatus = watts < requiredWatts ? "insuficiente" : watts >= 850 && watts >= requiredWatts * 2.5 ? "excesso" : "adequado";
    items.push({ category: "psu", label: "Fonte", value: `${watts}W`, reference, status, detail: explain(status, reference, useLabel) });
  }

  return {
    items,
    excess: items.filter((item) => item.status === "excesso").length,
    insufficient: items.filter((item) => item.status === "insuficiente").length,
    justification: [`Uso previsto: ${useLabel}${softwares.length ? `, com ${softwares.join(", ")}` : ""}.`, ...items.map(justificationLine)],
  };
}
