import { analyzeDocumentText, type DocumentAnalysis } from "./analysis";
import { computeLocalBuild } from "./engine";
import type { BuildInput, BuildResult, Objective, Resolution } from "./types";

/* ============================================================================
 * CHAMADAS DO NAVEGADOR PARA A IA
 * ----------------------------------------------------------------------------
 * As rotas em src/app/api/* rodam no servidor e falam com o Gemini
 * (src/lib/server/gemini.ts). Se a rede ou o Gemini falharem, cada função
 * abaixo cai para o modo offline (motor local + palavras-chave), então a
 * apresentação nunca quebra.
 * ==========================================================================*/

async function postJson<T>(url: string, body: unknown, timeoutMs: number): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as T;
}

/** Assistente: motor escolhe as peças, Gemini explica. */
export async function requestRecommendation(input: BuildInput): Promise<BuildResult> {
  try {
    const data = await postJson<BuildResult>("/api/recomendacao", input, 60000);
    if (!Array.isArray(data.parts) || data.parts.length === 0) throw new Error("Resposta sem peças");
    return data;
  } catch (error) {
    console.warn("[SmartBuild AI] API indisponível, usando o motor local:", error);
    return computeLocalBuild(input);
  }
}

/** Um turno do chat: resposta em texto ou uma build completa. */
export type ChatReply =
  | { kind: "answer"; reply: string; links: { label: string; search: string }[]; aiModel: string }
  | { kind: "build"; reply: string | null; notes: string[]; result: BuildResult };

/** Conversar: Gemini entende a mensagem no contexto da conversa. Lança erro se indisponível. */
export async function requestChat(message: string, previous: BuildInput | null, history: { role: "user" | "ai"; text: string }[], currentBuild: string[]): Promise<ChatReply> {
  return postJson<ChatReply>("/api/conversar", { message, previous, history, currentBuild }, 60000);
}

/** Analisar PDF/texto: Gemini lê o documento, motor avalia, Gemini escreve o parecer. */
export async function requestDocumentAnalysis(source: { file: File } | { text: string }, objectives: Objective[], resolution: Resolution): Promise<DocumentAnalysis> {
  const body = new FormData();
  if ("file" in source) body.append("file", source.file);
  else body.append("text", source.text);
  body.append("objectives", JSON.stringify(objectives));
  body.append("resolution", resolution);

  try {
    const response = await fetch("/api/analisar-pdf", { method: "POST", body, signal: AbortSignal.timeout(90000) });
    const data = (await response.json()) as DocumentAnalysis & { error?: string };
    if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
    return data;
  } catch (error) {
    // Texto colado ainda pode ser analisado offline; PDF precisa do servidor.
    if ("text" in source) return analyzeDocumentText(source.text, "Texto colado", objectives, resolution);
    throw error instanceof Error ? error : new Error("Não foi possível analisar o documento.");
  }
}

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
