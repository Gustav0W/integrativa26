import { describe, expect, it } from "vitest";
import { computeLocalBuild, normalizeInput, sanitizeInput } from "./engine";
import { MONITORS } from "./catalog";
import type { BuildInput } from "./types";

const base: BuildInput = { budget: 6000, sector: "gaming", softwares: ["Jogos AAA"], resolution: "1080p", brand: "any", monitorId: null, silent: false, prompt: "" };

const cases: { name: string; input: BuildInput }[] = [
  { name: "jogos", input: base },
  { name: "escritório", input: { ...base, budget: 3000, sector: "escritorio", softwares: ["Excel Avançado"] } },
  { name: "engenharia", input: { ...base, budget: 9000, sector: "engenharia", softwares: ["Revit"] } },
  { name: "desenvolvimento", input: { ...base, budget: 8000, sector: "desenvolvimento", softwares: ["Docker", "Android Studio"], resolution: "1440p" } },
  { name: "recursos humanos", input: { ...base, budget: 6000, sector: "rh", softwares: ["Senior HCM"] } },
  { name: "marketing", input: { ...base, budget: 8000, sector: "marketing", softwares: ["Figma", "Premiere Pro"] } },
  { name: "educação", input: { ...base, budget: 5000, sector: "educacao", softwares: ["Moodle", "Microsoft 365"] } },
  { name: "saúde", input: { ...base, budget: 6000, sector: "saude", softwares: ["Tasy"] } },
  { name: "jurídico", input: { ...base, budget: 6000, sector: "juridico", softwares: ["PJe", "Astrea"] } },
  { name: "preferência AMD", input: { ...base, brand: "amd" } },
  { name: "preferência Intel", input: { ...base, brand: "intel" } },
];

describe("computeLocalBuild", () => {
  it.each(cases)("monta build compatível e dentro do orçamento: $name", ({ input }) => {
    const result = computeLocalBuild(input);
    expect(result.compatibility.length).toBeGreaterThan(0);
    expect(result.compatibility.every((check) => check.ok)).toBe(true);
    expect(result.overBudget).toBe(false);
    expect(result.total).toBeLessThanOrEqual(input.budget);
  });

  it("respeita a preferência de marca", () => {
    const result = computeLocalBuild({ ...base, brand: "amd" });
    expect(result.parts.some((part) => /ryzen/i.test(part.name))).toBe(true);
  });

  it("inclui somente o monitor selecionado com suas especificações", () => {
    const withMonitor = computeLocalBuild({ ...base, budget: 9000, monitorId: "mon-qhd" });
    const without = computeLocalBuild({ ...base, budget: 9000 });
    const monitor = withMonitor.parts.find((part) => part.category === "extra");
    expect(monitor?.name).toContain("QHD");
    expect(monitor?.price).toBe(MONITORS.find((item) => item.id === "mon-qhd")?.price);
    expect(monitor?.specs).toContain("2560x1440");
    expect(monitor?.specs).toContain("180Hz");
    expect(withMonitor.parts.every((part) => !/teclado|mouse/i.test(part.name))).toBe(true);
    expect(withMonitor.total).toBeLessThanOrEqual(9000);
    expect(without.parts.some((part) => part.category === "extra")).toBe(false);
  });

  it("usa o software escolhido para apresentar o perfil na recomendação", () => {
    const result = computeLocalBuild({ ...base, sector: "engenharia", softwares: ["Revit", "AutoCAD"] });
    expect(result.interpretation).toEqual(expect.arrayContaining(["Revit", "AutoCAD"]));
  });
});

describe("sanitizeInput", () => {
  it("limita o orçamento e aplica padrões para lixo", () => {
    const input = sanitizeInput({ budget: -5, sector: "unknown", softwares: ["xyz"], monitorId: "unknown", resolution: "8k", brand: "foo" });
    expect(input.budget).toBeGreaterThan(0);
    expect(input.sector).toBe("escritorio");
    expect(input.softwares).toEqual([]);
    expect(input.monitorId).toBeNull();
    expect(input.resolution).toBe("1440p");
    expect(input.brand).toBe("any");
  });

  it("normaliza builds antigas salvas antes da migração para setores", () => {
    const legacy = { budget: 6000, objectives: ["gaming"], resolution: "1080p", brand: "any", includePeripherals: false, silent: false, prompt: "" } as unknown as BuildInput;
    expect(normalizeInput(legacy)).toMatchObject({ sector: "gaming", softwares: [], monitorId: null, resolution: "1080p" });
  });
});
