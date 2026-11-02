import { computeLocalBuild, sanitizeInput } from "@/lib/engine";
import { converse, explainBuild, geminiAvailable, modelLabel } from "@/lib/server/gemini";
import { rateLimit } from "@/lib/server/rate-limit";

/** Tempo máximo da função na hospedagem (Vercel etc.): o Gemini leva alguns segundos. */
export const maxDuration = 60;

/**
 * POST /api/conversar — corpo: { message, previous: BuildInput | null, history, currentBuild }.
 * O Gemini decide o que a pessoa quer:
 *  - pergunta/dúvida → responde em texto (kind: "answer"), com links de preço;
 *  - montar/ajustar um PC → o motor monta e o Gemini explica (kind: "build").
 * Sem Gemini, responde 503 e o navegador usa o modo offline (palavras-chave).
 */
export async function POST(request: Request) {
  if (!geminiAvailable()) return Response.json({ error: "Gemini não configurado." }, { status: 503 });
  const limited = rateLimit(request);
  if (limited) return limited;

  const body = (await request.json().catch(() => null)) as { message?: unknown; previous?: unknown; history?: unknown; currentBuild?: unknown } | null;
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 1000) : "";
  if (!message) return Response.json({ error: "Mensagem vazia." }, { status: 400 });
  const previous = body?.previous ? sanitizeInput(body.previous) : null;
  const history = Array.isArray(body?.history)
    ? body.history.filter((m): m is { role: "user" | "ai"; text: string } => typeof m?.text === "string" && (m.role === "user" || m.role === "ai"))
    : [];
  const currentBuild = Array.isArray(body?.currentBuild) ? body.currentBuild.filter((line): line is string => typeof line === "string").slice(0, 10) : [];

  try {
    const turn = await converse(message, previous, history, currentBuild);
    if (turn.kind === "answer") {
      return Response.json({ kind: "answer", reply: turn.reply, links: turn.links, aiModel: modelLabel(turn.model) });
    }

    const base = computeLocalBuild(turn.input, {}, turn.signals);
    const explained = await explainBuild(base).catch(() => null);
    return Response.json({
      kind: "build",
      reply: explained?.reply ?? null,
      notes: turn.assumptions,
      result: explained?.result ?? { ...base, source: "api", aiModel: modelLabel(turn.model) },
    });
  } catch (error) {
    console.warn("[conversar] Gemini indisponível:", error instanceof Error ? error.message : error);
    return Response.json({ error: "Gemini indisponível no momento." }, { status: 503 });
  }
}
