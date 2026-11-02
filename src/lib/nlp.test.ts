import { describe, expect, it } from "vitest";
import { parseRequest } from "./nlp";

describe("parseRequest", () => {
  it("entende '5 mil' como R$ 5.000", () => {
    expect(parseRequest("tenho 5 mil para gastar").budget).toBe(5000);
  });

  it("entende valores em reais", () => {
    expect(parseRequest("orçamento de R$ 7.500,00").budget).toBe(7500);
  });

  it("não confunde 4K (resolução) com dinheiro", () => {
    const parsed = parseRequest("quero jogar em 4k");
    expect(parsed.budget).toBeNull();
    expect(parsed.resolution).toBe("4k");
  });

  it("detecta usos e resolução", () => {
    const parsed = parseRequest("quero jogar valorant e usar revit, 1440p");
    expect(parsed.objectives).toEqual(expect.arrayContaining(["gaming", "arquitetura"]));
    expect(parsed.resolution).toBe("1440p");
  });

  it("detecta preferência de marca e ajustes", () => {
    expect(parseRequest("quero um ryzen").brand).toBe("amd");
    expect(parseRequest("quero algo mais barato").adjust).toBe("cheaper");
    expect(parseRequest("quero algo mais potente").adjust).toBe("stronger");
  });
});
