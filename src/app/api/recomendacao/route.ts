import { computeLocalBuild, sanitizeInput } from "@/lib/engine";
import { explainBuild, geminiAvailable, interpretSignals } from "@/lib/server/gemini";
import { rateLimit } from "@/lib/server/rate-limit";

/** Tempo máximo da função na hospedagem (Vercel etc.): o Gemini leva alguns segundos. */
export const maxDuration = 60;

/**
 * POST /api/recomendacao — corpo: BuildInput (formulário do Assistente).
 * 1. Gemini interpreta o texto livre opcional ("Algo mais?").
 * 2. O motor local escolhe as peças (compatibilidade garantida).
 * 3. Gemini escreve os motivos e as observações.
 * Se o Gemini falhar, devolve o resultado do motor local (source: "local").
 */
export async function POST(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const input = sanitizeInput(await request.json().catch(() => null));

  const signals = geminiAvailable() && input.prompt ? await interpretSignals(input.prompt).catch(() => undefined) : undefined;
  const base = computeLocalBuild(input, {}, signals);

  if (!geminiAvailable()) return Response.json(base);
  try {
    const { result } = await explainBuild(base);
    return Response.json(result);
  } catch (error) {
    console.warn("[recomendacao] Gemini indisponível, usando o motor local:", error instanceof Error ? error.message : error);
    return Response.json(base);
  }
}
