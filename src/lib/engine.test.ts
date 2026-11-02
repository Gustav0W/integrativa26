import { describe, expect, it } from "vitest";
import { computeLocalBuild, sanitizeInput } from "./engine";
import type { BuildInput, Objective } from "./types";

const base: BuildInput = { budget: 6000, objectives: ["gaming"], resolution: "1080p", brand: "any", includePeripherals: false, silent: false, prompt: "" };

const cases: { name: string; input: BuildInput }[] = [
  { name: "jogos", input: base },
  { name: "escritório", input: { ...base, budget: 3000, objectives: ["office"] } },
  { name: "arquitetura", input: { ...base, budget: 9000, objectives: ["arquitetura"] } },
  { name: "dev + jogos em 1440p", input: { ...base, budget: 8000, objectives: ["dev", "gaming"], resolution: "1440p" } },
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

  it("inclui monitor e periféricos quando pedido sem estourar o orçamento", () => {
    const withKit = computeLocalBuild({ ...base, budget: 9000, includePeripherals: true });
    const without = computeLocalBuild({ ...base, budget: 9000 });
    expect(withKit.parts.length).toBeGreaterThan(without.parts.length);
    expect(withKit.total).toBeLessThanOrEqual(9000);
  });
});

describe("sanitizeInput", () => {
  it("limita o orçamento e aplica padrões para lixo", () => {
    const input = sanitizeInput({ budget: -5, objectives: ["xyz"], resolution: "8k", brand: "foo" });
    expect(input.budget).toBeGreaterThan(0);
    expect(input.objectives).toEqual<Objective[]>(["office"]);
    expect(input.resolution).toBe("1440p");
    expect(input.brand).toBe("any");
  });
});
