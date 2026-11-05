import { describe, expect, it } from "vitest";
import { computeLocalBuild } from "./engine";
import { PUBLIC_RULES, evaluatePublicPurchase, publicDraftText, sanitizePurchase } from "./public-purchase";
import type { BuildInput, BuildResult, PublicPurchase } from "./types";

const input: BuildInput = { budget: 5000, sector: "escritorio", softwares: ["Excel Avançado"], resolution: "1080p", brand: "any", monitorId: "mon-100hz", silent: false, prompt: "" };
const purchase = (quantity: number, spentThisYear = 0): PublicPurchase => ({ enabled: true, quantity, spentThisYear });
const fixedTotal = (total: number): BuildResult => ({ ...computeLocalBuild(input), total });

describe("evaluatePublicPurchase", () => {
  it("mantém a dispensa quando a compra fica longe do limite", () => {
    expect(evaluatePublicPurchase(fixedTotal(5000), purchase(2)).status).toBe("dispensa");
  });

  it("avisa quando passa de 80% do limite", () => {
    expect(evaluatePublicPurchase(fixedTotal(5000), purchase(11)).status).toBe("atencao");
  });

  it("exige licitação quando a quantidade passa do limite", () => {
    const evaluation = evaluatePublicPurchase(fixedTotal(5000), purchase(14));
    expect(evaluation.status).toBe("licitacao");
    expect(evaluation.maxQuantity).toBe(13);
  });

  it("soma o que já foi gasto no ano", () => {
    expect(evaluatePublicPurchase(fixedTotal(5000), purchase(2, 60000)).status).toBe("licitacao");
  });

  it("trata o valor exato do limite como fora da dispensa", () => {
    const evaluation = evaluatePublicPurchase(fixedTotal(PUBLIC_RULES.dispensaLimit), purchase(1));
    expect(evaluation.status).toBe("licitacao");
    expect(evaluation.maxQuantity).toBe(0);
  });

  it("avisa sobre a preferência de marca", () => {
    const result = computeLocalBuild({ ...input, brand: "intel" });
    const check = evaluatePublicPurchase(result, purchase(1)).checks.find((item) => item.label.startsWith("Indicação de marca"));
    expect(check?.tone).toBe("warning");
  });

  it.each([3000, 5000, 9000, 15000, 20000])("descreve as peças sem marca, modelo ou socket: R$ %i", (budget) => {
    for (const brand of ["amd", "intel"] as const) {
      const result = computeLocalBuild({ ...input, budget, brand, sector: "engenharia", softwares: ["Revit"] });
      const specs = evaluatePublicPurchase(result, purchase(1)).items.map((item) => item.spec).join(" ");
      expect(specs).not.toMatch(/amd|intel|ryzen|core i|core ultra|nvidia|geforce|rtx|radeon|arc |am4|am5|lga|kingston|corsair|samsung|aoc|lg |acer/i);
    }
  });

  it("pede nova pesquisa quando os preços passam de 6 meses", () => {
    const result = computeLocalBuild(input);
    const find = (date: string) => evaluatePublicPurchase(result, purchase(1), new Date(date)).checks.find((item) => item.label.startsWith("Pesquisa de preços"));
    expect(find("2027-06-01T12:00:00")?.detail).toContain("refaça a pesquisa");
    expect(find("2027-01-01T12:00:00")?.detail).not.toContain("refaça a pesquisa");
  });

  it("trata o estudo técnico como opcional só na dispensa", () => {
    const label = (quantity: number) => evaluatePublicPurchase(fixedTotal(5000), purchase(quantity)).documents.find((item) => item.label.startsWith("Estudo técnico"))?.label;
    expect(label(1)).toContain("opcional");
    expect(label(14)).toContain("obrigatório");
  });

  it("gera o rascunho com a quantidade e o aviso", () => {
    const result = computeLocalBuild(input);
    const text = publicDraftText(result, evaluatePublicPurchase(result, purchase(3)));
    expect(text).toContain("Aquisição de 3 computador(es)");
    expect(text).toContain("não é parecer jurídico");
    expect(text).toContain("Uso previsto");
    expect(text).toContain("Dimensionamento do equipamento");
  });
});

describe("sanitizePurchase", () => {
  it("corrige valores inválidos", () => {
    expect(sanitizePurchase({ enabled: true, quantity: 0, spentThisYear: -5 })).toEqual({ enabled: true, quantity: 1, spentThisYear: 0 });
    expect(sanitizePurchase({ enabled: true, quantity: 9999, spentThisYear: 10 }).quantity).toBe(PUBLIC_RULES.maxQuantity);
  });
});
