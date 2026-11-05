import { describe, expect, it } from "vitest";
import { budgetFromRange, budgetLabel, budgetRangeError, computeLocalBuild, evaluateBuild, normalizeInput, sanitizeInput } from "./engine";
import { CPUS, GPUS, MONITORS, RAMS } from "./catalog";
import { describeNeed } from "./fit";
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

describe("faixa de valor", () => {
  it("só máximo: mantém o teto", () => {
    const input = { ...base, ...budgetFromRange({ min: null, max: 6000 }) };
    expect(computeLocalBuild(input).total).toBeLessThanOrEqual(6000);
    expect(budgetLabel(input)).toContain("até");
  });

  it("só mínimo: não fica abaixo do valor informado", () => {
    const input = { ...base, sector: "escritorio" as const, softwares: [], ...budgetFromRange({ min: 9000, max: null }) };
    const result = computeLocalBuild(input);
    expect(result.total).toBeGreaterThanOrEqual(9000);
    expect(budgetLabel(input)).toContain("a partir de");
    expect(result.insights.some((insight) => insight.text.includes("economizou"))).toBe(false);
  });

  it("mínimo e máximo: fica dentro da faixa, contando o monitor", () => {
    const input = { ...base, monitorId: "mon-qhd", ...budgetFromRange({ min: 7000, max: 9000 }) };
    const { total } = computeLocalBuild(input);
    expect(total).toBeGreaterThanOrEqual(7000);
    expect(total).toBeLessThanOrEqual(9000);
  });

  it("avisa quando nenhuma combinação cabe na faixa", () => {
    const result = computeLocalBuild({ ...base, ...budgetFromRange({ min: 5000, max: 5000 }) });
    expect(result.total).toBeLessThan(5000);
    expect(result.insights[0].text).toContain("Nenhuma combinação compatível");
  });

  it("valida o preenchimento", () => {
    expect(budgetRangeError({ min: null, max: null })).toContain("Preencha");
    expect(budgetRangeError({ min: 9000, max: 5000 })).toContain("maior que o máximo");
    expect(budgetRangeError({ min: 5000, max: null })).toBeNull();
    expect(budgetRangeError({ min: null, max: 5000 })).toBeNull();
  });

  it("a API ignora mínimo maior que o máximo", () => {
    expect(sanitizeInput({ ...base, budget: 5000, budgetMin: 9000 }).budgetMin).toBeNull();
  });
});

describe("adequação ao uso", () => {
  it("mostra necessidades diferentes por setor", () => {
    const office = describeNeed("escritorio", []);
    const engineering = describeNeed("engenharia", ["Revit"]);
    expect(office.references).not.toEqual(engineering.references);
    expect(engineering.references).toContain("placa dedicada necessária");
    expect(describeNeed("saude", []).references).not.toEqual(describeNeed("rh", []).references);
  });

  const status = (result: ReturnType<typeof computeLocalBuild>, category: string) => result.fit?.items.find((item) => item.category === category)?.status;

  it("aponta memória insuficiente para engenharia com orçamento baixo", () => {
    const result = computeLocalBuild({ ...base, budget: 3500, sector: "engenharia", softwares: ["Revit"] });
    expect(result.fit?.insufficient).toBeGreaterThan(0);
  });

  it("aponta excesso quando o mínimo força peças caras no escritório", () => {
    const result = computeLocalBuild({ ...base, sector: "escritorio", softwares: [], ...budgetFromRange({ min: 15000, max: null }) });
    expect(result.fit?.excess).toBeGreaterThan(0);
  });

  it("não aponta problema em uma build equilibrada de escritório", () => {
    const result = computeLocalBuild({ ...base, budget: 4000, sector: "escritorio", softwares: ["Excel Avançado"] });
    expect(result.fit?.excess).toBe(0);
    expect(result.fit?.insufficient).toBe(0);
  });

  it("Docker pede 32GB de memória", () => {
    const result = computeLocalBuild({ ...base, budget: 3500, sector: "desenvolvimento", softwares: ["Docker"] });
    expect(status(result, "ram")).toBe("insuficiente");
  });

  it("avalia só as peças escolhidas na build do usuário", () => {
    const cpu = CPUS.find((item) => item.id === "r5-5600");
    const gpu = GPUS.find((item) => item.id === "rtx5080");
    const ram = RAMS.find((item) => item.id === "ddr4-8");
    const fit = evaluateBuild({ cpu, gpu, ram }, "escritorio", "1080p").fit;
    expect(fit?.items.map((item) => [item.category, item.status])).toEqual([["cpu", "adequado"], ["gpu", "excesso"], ["ram", "insuficiente"]]);
  });

  it("gera justificativa técnica sem marca nem modelo", () => {
    for (const brand of ["amd", "intel"] as const) {
      const text = computeLocalBuild({ ...base, budget: 12000, brand }).fit?.justification.join(" ") ?? "";
      expect(text).toContain("Uso previsto");
      expect(text).not.toMatch(/amd|intel|ryzen|core i|nvidia|geforce|rtx|radeon/i);
    }
  });
});
