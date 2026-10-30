import { BUDGET_MAX, BUDGET_MIN } from "./catalog";
import { computeLocalBuild, evaluateBuild, type BuildEvaluation } from "./engine";
import { parseSpecs, type DetectedSpecs } from "./nlp";
import type { BuildResult, Objective, Resolution } from "./types";

/** Resultado da análise de um orçamento/ficha técnica (PDF ou texto). */
export interface DocumentAnalysis {
  source: string;
  text: string;
  specs: DetectedSpecs;
  evaluation: BuildEvaluation;
  objectives: Objective[];
  resolution: Resolution;
  alternative: BuildResult | null;
  /** Parecer em linguagem natural escrito pelo Gemini (quando disponível). */
  summary?: string;
  aiModel?: string;
}

/**
 * Avalia as peças de um documento. `specText` é a ficha padronizada pelo Gemini;
 * sem ela, as peças são procuradas direto no texto (modo offline).
 */
export function analyzeDocumentText(text: string, source: string, objectives: Objective[], resolution: Resolution, specText?: string): DocumentAnalysis {
  const specs = parseSpecs(specText || text);
  const evaluation = evaluateBuild(specs.build, objectives, resolution, text);
  const alternative = specs.totalPrice
    ? computeLocalBuild({ budget: Math.max(BUDGET_MIN, Math.min(BUDGET_MAX, specs.totalPrice)), objectives, resolution, brand: "any", includePeripherals: false, silent: false, prompt: "" })
    : null;
  return { source, text, specs, evaluation, objectives, resolution, alternative };
}
