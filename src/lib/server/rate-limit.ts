/**
 * Limite de requisições por IP para proteger a cota gratuita do Gemini.
 * Contador em memória: simples e sem dependências, mas cada instância do
 * servidor (ex.: função serverless da Vercel) conta separado. Para um limite
 * global e rígido, trocar por Upstash Ratelimit mantendo a mesma assinatura.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 20;

const hits = new Map<string, { count: number; resetAt: number }>();

function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "desconhecido";
}

/** Retorna uma resposta 429 se o IP passou do limite; senão, null. */
export function rateLimit(request: Request, now = Date.now()): Response | null {
  if (hits.size > 5000) for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);

  const ip = clientIp(request);
  const entry = hits.get(ip);
  if (!entry || entry.resetAt <= now) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }
  entry.count += 1;
  if (entry.count <= MAX_REQUESTS) return null;

  const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
  return Response.json(
    { error: "Muitas requisições em pouco tempo. Aguarde alguns minutos e tente de novo." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}
