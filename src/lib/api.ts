import { computeLocalBuild } from "./engine";
import type { BuildInput, BuildResult } from "./types";

/* ============================================================================
 * INTEGRAÇÃO COM A API DE IA — /api/recomendacao
 * ----------------------------------------------------------------------------
 * COMO CONECTAR UM LLM DE VERDADE:
 *
 *   1. Crie o arquivo `src/app/api/recomendacao/route.ts` exportando
 *      `export async function POST(request: Request)`.
 *   2. Leia o corpo com `await request.json()` → ele chega no formato
 *      `BuildInput` (budget, objectives[], resolution, brand,
 *      includePeripherals, silent, prompt).
 *   3. Chame o LLM no servidor (as chaves ficam em `.env.local`, nunca no
 *      front). O projeto já tem o pacote `ai` com `@ai-sdk/google` e
 *      `@ai-sdk/openai` instalados — use a geração de objeto estruturado do
 *      AI SDK com um schema igual a `BuildResult` para receber JSON válido.
 *      Dica: envie também o catálogo (ou a build do motor local) no prompt
 *      para a IA escolher apenas peças reais e com preço conhecido.
 *   4. Retorne `Response.json(resultado)` no formato `BuildResult`.
 *   5. Mude `USE_REMOTE_API` abaixo para `true`.
 *
 * Se a API falhar (offline, sem chave, timeout), o sistema volta
 * automaticamente para o motor local — a apresentação nunca quebra.
 * ==========================================================================*/

const USE_REMOTE_API = false;
const API_ENDPOINT = "/api/recomendacao";
const API_TIMEOUT_MS = 20000;

export async function requestRecommendation(input: BuildInput): Promise<BuildResult> {
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
 * LEITURA DE PDF — /api/analisar-pdf
 * O servidor extrai o texto do PDF (biblioteca `unpdf`) e o front analisa as
 * especificações. Para usar um LLM multimodal no lugar da heurística local,
 * veja o comentário em `src/app/api/analisar-pdf/route.ts`.
 * ==========================================================================*/

export async function extractPdfText(file: File): Promise<{ text: string; pages: number }> {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch("/api/analisar-pdf", { method: "POST", body });
  const data = (await response.json()) as { text?: string; pages?: number; error?: string };
  if (!response.ok || typeof data.text !== "string") throw new Error(data.error ?? "Não foi possível ler o PDF.");
  return { text: data.text, pages: data.pages ?? 0 };
}

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
