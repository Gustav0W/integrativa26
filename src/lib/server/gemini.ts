import { google, type GoogleLanguageModelOptions } from "@ai-sdk/google";
import { generateText, Output, type ModelMessage } from "ai";
import { z } from "zod";
import { CASE_KITS, CPUS, GPUS, MOBOS, PSUS, RAMS, SSDS } from "../catalog";
import { CATEGORY_LABEL, OBJECTIVE_LABEL, RESOLUTION_LABEL, brl, normalizeInput, type BuildEvaluation } from "../engine";
import type { BuildInput, BuildResult, PromptSignals } from "../types";

/* ============================================================================
 * Integração com o Gemini (Google) — só roda no servidor (rotas /api/*).
 * A chave fica em .env.local (GOOGLE_GENERATIVE_AI_API_KEY), nunca no navegador.
 *
 * Divisão de trabalho:
 *  - Gemini: entender o texto do usuário, ler PDFs e escrever as explicações.
 *  - Motor local (engine.ts): escolher as peças e garantir a compatibilidade.
 * Assim a IA não inventa peças nem preços, e tudo continua funcionando offline.
 * ==========================================================================*/

/** Ordem de tentativa: se um modelo estiver sobrecarregado, tenta o próximo. */
const MODELS = ["gemini-3.5-flash", "gemini-3.1-flash-lite"] as const;

const MODEL_LABEL: Record<string, string> = {
  "gemini-3.5-flash": "Gemini 3.5 Flash",
  "gemini-3.1-flash-lite": "Gemini 3.1 Flash Lite",
};

const SYSTEM = `Você é o SmartBuild AI, consultor de montagem de PCs para o mercado brasileiro.
Fale em português do Brasil, de forma clara e amigável, para pessoas leigas.
Nunca invente peças, preços, FPS ou números: use somente os dados fornecidos.`;

export function geminiAvailable() {
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}

export function modelLabel(id: string) {
  return MODEL_LABEL[id] ?? id;
}

async function askGemini<T>(schema: z.ZodType<T>, messages: ModelMessage[], timeoutMs = 25000): Promise<{ output: T; model: string }> {
  let lastError: unknown = new Error("Chave do Gemini não configurada.");
  if (!geminiAvailable()) throw lastError;

  for (const id of MODELS) {
    try {
      const result = await generateText({
        model: google(id),
        system: SYSTEM,
        messages,
        output: Output.object({ schema }),
        maxRetries: 1,
        timeout: timeoutMs,
        providerOptions: { google: { thinkingConfig: { thinkingLevel: "low" } } satisfies GoogleLanguageModelOptions },
      });
      return { output: result.output as T, model: id };
    } catch (error) {
      lastError = error;
      console.warn(`[gemini] ${id} falhou:`, error instanceof Error ? error.message : error);
    }
  }
  throw lastError;
}

/* ----------------------------------------------------------------------------
 * 1. Entender o pedido em texto livre
 * --------------------------------------------------------------------------*/

const signalsSchema = z.object({
  games: z.array(z.object({ name: z.string(), kind: z.enum(["heavy", "competitive"]) })).describe("Jogos citados. heavy = AAA pesado; competitive = e-sports/leve."),
  ultra: z.boolean().describe("Quer gráficos no máximo, ultra, ray tracing ou 4K"),
  streaming: z.boolean().describe("Vai fazer live/stream"),
  dualMonitor: z.boolean().describe("Vai usar 2 ou mais monitores"),
  silent: z.boolean().describe("Quer PC silencioso"),
  wifi: z.boolean().describe("Precisa de Wi-Fi na placa-mãe"),
  render: z.boolean().describe("Faz render 3D / BIM (Revit, Lumion, Blender, SketchUp...)"),
  editing: z.boolean().describe("Edita vídeo"),
  ai: z.boolean().describe("Roda IA local, machine learning, CUDA"),
  virtualization: z.boolean().describe("Usa Docker, máquinas virtuais, emuladores, Android Studio"),
});

const requestSchema = z.object({
  budget: z.number().nullable().describe("Orçamento máximo total em reais. null se não houver valor nem no pedido anterior."),
  objectives: z.array(z.enum(["gaming", "arquitetura", "dev", "office"])).describe("Usos do PC. gaming = jogos; arquitetura = arquitetura, engenharia, render 3D, design; dev = programação; office = estudos, escritório, uso básico."),
  resolution: z.enum(["1080p", "1440p", "4k"]).nullable().describe("Resolução para jogos, se citada (2K = 1440p)."),
  brand: z.enum(["any", "amd", "intel"]).describe("Preferência de marca do processador"),
  includePeripherals: z.boolean().describe("Quer incluir monitor, teclado e mouse no orçamento"),
  signals: signalsSchema,
  assumptions: z
    .array(z.string())
    .describe("Apenas o que você precisou SUPOR porque a pessoa não disse (ex.: não citou orçamento). Não repita o que ela disse explicitamente. Normalmente vazio."),
});

/** Catálogo resumido (nomes e preços de referência) para a IA citar modelos reais. */
function catalogSummary() {
  const groups: [string, { name: string; price: number }[]][] = [
    ["Processadores", CPUS],
    ["Placas de vídeo", GPUS],
    ["Placas-mãe", MOBOS],
    ["Memórias RAM", RAMS],
    ["SSDs", SSDS],
    ["Fontes", PSUS],
    ["Gabinete + cooler", CASE_KITS],
  ];
  return groups.map(([title, items]) => `${title}: ${items.map((item) => `${item.name} (${brl(item.price)})`).join("; ")}`).join("\n");
}

const conversationSchema = z.object({
  intent: z.enum(["build", "answer"]).describe("build = a pessoa quer que você monte, sugira ou ajuste uma configuração COMPLETA de PC. answer = qualquer outra coisa (dúvida, pergunta sobre uma peça, preço, onde comprar, comparação, explicação da build atual, conversa)."),
  answer: z.string().describe("Quando intent = answer: a resposta, em texto simples, direta e natural (até ~120 palavras, pode usar linhas começando com '- '). Vazio quando intent = build."),
  links: z
    .array(z.object({ label: z.string().describe("Nome curto do produto"), search: z.string().describe("Termo de busca curto, ex.: 'Kingston NV3 1TB'") }))
    .describe("Até 4 produtos para a pessoa pesquisar o preço, quando a pergunta envolver comprar ou comparar peças. Vazio caso contrário."),
  request: requestSchema.nullable().describe("Parâmetros do PC quando intent = build; null quando intent = answer."),
});

export type ConversationTurn =
  | { kind: "answer"; reply: string; links: { label: string; search: string }[]; model: string }
  | { kind: "build"; input: BuildInput; signals: PromptSignals; assumptions: string[]; model: string };

/**
 * Um turno do chat: o Gemini decide se a pessoa quer uma build completa
 * (vai para o motor) ou só uma resposta (dúvida, preço, onde comprar...).
 */
export async function converse(
  message: string,
  previous: BuildInput | null,
  history: { role: "user" | "ai"; text: string }[] = [],
  currentBuild: string[] = [],
): Promise<ConversationTurn> {
  const context = previous
    ? `Pedido de PC atual (JSON). Se a mensagem pedir ajuste, ATUALIZE — mantenha o que não mudou:
${JSON.stringify({ budget: previous.budget, objectives: previous.objectives, resolution: previous.resolution, brand: previous.brand, includePeripherals: previous.includePeripherals, silent: previous.silent })}
Regras de ajuste: "mais barato/economizar" → reduza o orçamento ~20%; "mais potente" → aumente ~25%; usos novos citados com "também" são somados; "só/apenas" troca os usos.`
    : `Ainda não há build. Se a pessoa pedir uma e não citar orçamento, devolva budget = null; se não der para saber o uso, use ["office"] e registre a suposição.`;

  const conversation = history
    .slice(-8)
    .map((m) => `${m.role === "user" ? "Usuário" : "SmartBuild"}: ${m.text}`)
    .join("\n");

  const { output, model } = await askGemini(conversationSchema, [
    {
      role: "user",
      content: `Você está no chat do SmartBuild AI. Responda à ÚLTIMA mensagem como numa conversa normal.
Só monte um PC completo (intent = build) se a pessoa pedir isso ou pedir para ajustar a build atual.
Perguntas sobre uma peça, preço, onde comprar ou "qual o melhor X" são intent = answer: responda só o que foi perguntado.

Sobre preços: você NÃO tem preços ao vivo. Os valores do catálogo abaixo são estimativas de referência e podem estar desatualizados — deixe isso claro ao citar valores e indique pesquisar nos links (Google Shopping, KaBuM!, Pichau, Terabyte).

Catálogo de referência:
${catalogSummary()}

${context}
${currentBuild.length ? `\nBuild atual mostrada ao usuário:\n${currentBuild.join("\n")}\n` : ""}${conversation ? `\nConversa até agora:\n${conversation}\n` : ""}
Última mensagem do usuário: """${message}"""`,
    },
  ]);

  if (output.intent === "answer" || !output.request) {
    return {
      kind: "answer",
      reply: output.answer.trim() || "Pode me contar um pouco mais do que você precisa?",
      links: output.links.filter((link) => link.search.trim()).slice(0, 4),
      model,
    };
  }

  const request = output.request;
  const assumptions = [...request.assumptions];
  let budget = request.budget ?? previous?.budget ?? null;
  if (budget === null) {
    budget = 6000;
    assumptions.push("Você não citou um valor, então considerei R$ 6.000 — diga, por exemplo, “até 5 mil” para ajustar.");
  }
  const input = normalizeInput({
    budget,
    objectives: request.objectives.length > 0 ? request.objectives : (previous?.objectives ?? ["office"]),
    resolution: request.resolution ?? previous?.resolution ?? (budget >= 7000 ? "1440p" : "1080p"),
    brand: request.brand,
    includePeripherals: request.includePeripherals,
    silent: request.signals.silent || Boolean(previous?.silent),
    prompt: `${previous?.prompt ?? ""} ${message}`.trim().slice(-500),
  });
  return { kind: "build", input, signals: request.signals, assumptions, model };
}

/** Só os sinais finos de um texto opcional (campo "Algo mais?" do assistente). */
export async function interpretSignals(text: string): Promise<PromptSignals> {
  const { output } = await askGemini(signalsSchema, [{ role: "user", content: `Extraia as necessidades técnicas deste pedido de PC: """${text}"""` }], 15000);
  return output;
}

/* ----------------------------------------------------------------------------
 * 2. Explicar a build escolhida pelo motor
 * --------------------------------------------------------------------------*/

const explanationSchema = z.object({
  reply: z.string().describe("Resposta curta (2 a 4 frases) apresentando a build ao usuário, citando o que ele pediu."),
  parts: z.array(z.object({ category: z.enum(["cpu", "gpu", "mobo", "ram", "ssd", "psu", "case", "extra"]), reason: z.string().describe("2 ou 3 frases explicando por que esta peça atende o uso da pessoa") })),
  insights: z.array(z.object({ tone: z.enum(["success", "info", "warning"]), text: z.string() })).describe("De 3 a 6 observações úteis e personalizadas"),
});

export async function explainBuild(result: BuildResult): Promise<{ result: BuildResult; reply: string }> {
  const { input } = result;
  const facts = {
    pedido: {
      usos: input.objectives.map((o) => OBJECTIVE_LABEL[o]),
      resolucao: input.objectives.includes("gaming") ? RESOLUTION_LABEL[input.resolution] : null,
      orcamento: brl(input.budget),
      textoDoUsuario: input.prompt || null,
    },
    build: {
      total: brl(result.total),
      classe: result.tier,
      plataforma: result.platform,
      nota: `${result.score}/100`,
      fpsAAA: result.fpsEstimate,
      gargaloCpuGpu: `${Math.round(result.bottleneck * 100)}%`,
      compatibilidade: result.compatibility.map((c) => `${c.ok ? "OK" : "FALHA"} ${c.label}: ${c.detail}`),
    },
    pecas: result.parts.map((part) => ({ categoria: part.category, nome: part.name, preco: brl(part.price), specs: part.specs, fatosTecnicos: part.reason })),
    observacoesCalculadas: result.insights.map((i) => i.text),
  };

  const { output, model } = await askGemini(explanationSchema, [
    {
      role: "user",
      content: `O motor de recomendação já escolheu esta build (não mude nenhuma peça):
${JSON.stringify(facts, null, 1)}

Escreva, para cada peça, o porquê da escolha ligado ao que a pessoa pediu, e observações úteis.
Use apenas os números dos dados acima.`,
    },
  ]);

  const reasons = new Map(output.parts.map((p) => [p.category, p.reason.trim()]));
  const insights = output.insights.filter((i) => i.text.trim()).slice(0, 6);
  // O aviso de orçamento estourado é crítico: garante que ele apareça.
  if (result.overBudget && result.insights[0]) insights.unshift(result.insights[0]);

  return {
    reply: output.reply.trim(),
    result: {
      ...result,
      parts: result.parts.map((part) => ({ ...part, reason: reasons.get(part.category) || part.reason })),
      insights: insights.length > 0 ? insights : result.insights,
      source: "api",
      aiModel: modelLabel(model),
    },
  };
}

/* ----------------------------------------------------------------------------
 * 3. Ler um orçamento/ficha técnica (PDF ou texto)
 * --------------------------------------------------------------------------*/

const documentSchema = z.object({
  cpu: z.string().nullable().describe("Modelo do processador, ex.: 'AMD Ryzen 5 5600'"),
  gpu: z.string().nullable().describe("Modelo da placa de vídeo, ex.: 'RTX 3060 12GB'. Use 'integrado' se não houver placa dedicada."),
  motherboard: z.string().nullable().describe("Modelo ou chipset da placa-mãe, ex.: 'ASUS Prime B550M'"),
  ramGb: z.number().nullable().describe("Total de memória RAM em GB"),
  ramType: z.enum(["DDR4", "DDR5"]).nullable(),
  storage: z.array(z.object({ capacityGb: z.number(), type: z.enum(["nvme", "sata", "hdd"]) })).describe("Discos (SSD NVMe/M.2, SSD SATA ou HD mecânico)"),
  psuWatts: z.number().nullable(),
  psuRating: z.enum(["white", "bronze", "silver", "gold", "platinum", "titanium"]).nullable(),
  cooler: z.enum(["water", "air", "box"]).nullable(),
  totalPrice: z.number().nullable().describe("Preço total em reais"),
});

const priceFormat = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Lê o documento com o Gemini e devolve uma "ficha" padronizada em texto,
 * no formato que o leitor de especificações (nlp.ts → parseSpecs) entende.
 */
export async function readSpecDocument(source: { pdf: Uint8Array } | { text: string }): Promise<{ specText: string; model: string }> {
  const content: Extract<ModelMessage, { role: "user" }>["content"] =
    "pdf" in source
      ? [
          { type: "text", text: "Extraia as peças de computador deste documento (orçamento de loja, ficha técnica ou anúncio)." },
          { type: "file", mediaType: "application/pdf", data: source.pdf },
        ]
      : [{ type: "text", text: `Extraia as peças de computador deste texto:\n"""${source.text.slice(0, 8000)}"""` }];

  const { output, model } = await askGemini(documentSchema, [{ role: "user", content }], 40000);

  const storage = [...output.storage].sort((a, b) => (a.type === "hdd" ? 1 : 0) - (b.type === "hdd" ? 1 : 0))[0];
  const lines = [
    output.cpu && `Processador: ${output.cpu}`,
    output.gpu && (/integrad/i.test(output.gpu) ? "Placa de vídeo: video integrado" : `Placa de vídeo: ${output.gpu}`),
    output.motherboard && `Placa-mãe: ${output.motherboard}`,
    output.ramGb && `Memória: ${output.ramGb}GB ${output.ramType ?? ""}`,
    storage && `${storage.type === "hdd" ? "HD" : storage.type === "nvme" ? "SSD NVMe" : "SSD SATA"} ${storage.capacityGb}GB`,
    output.psuWatts && `Fonte: ${output.psuWatts}W${output.psuRating ? ` 80 Plus ${output.psuRating}` : ""}`,
    output.cooler && (output.cooler === "water" ? "Water cooler" : output.cooler === "box" ? "Cooler box" : "Cooler a ar"),
    output.totalPrice && `TOTAL: R$ ${priceFormat.format(output.totalPrice)}`,
  ].filter(Boolean);

  return { specText: lines.join("\n"), model };
}

/* ----------------------------------------------------------------------------
 * 4. Parecer em linguagem natural sobre uma build avaliada
 * --------------------------------------------------------------------------*/

const verdictSchema = z.object({
  summary: z.string().describe("Parecer de 3 a 5 frases: vale a pena para o uso da pessoa? Quais os pontos fortes e o que mudar primeiro?"),
});

export async function writeVerdict(evaluation: BuildEvaluation, found: string[], totalPrice: number | null, alternative: BuildResult | null): Promise<{ summary: string; model: string }> {
  const facts = {
    pecasEncontradas: found,
    precoTotal: totalPrice !== null ? brl(totalPrice) : null,
    veredito: evaluation.verdict,
    notaGeral: evaluation.overall,
    notaPorUso: evaluation.fits.map((f) => `${OBJECTIVE_LABEL[f.objective]}: ${f.score}/100`),
    fpsAAA: evaluation.fpsEstimate,
    compatibilidade: evaluation.checks.map((c) => `${c.ok ? "OK" : "FALHA"} ${c.label}: ${c.detail}`),
    naoInformadosNoDocumento: evaluation.missing.map((m) => CATEGORY_LABEL[m]),
    dicas: evaluation.tips.map((t) => t.text),
    alternativaPeloMesmoValor: alternative ? { nota: `${alternative.score}/100`, total: brl(alternative.total) } : null,
  };
  const { output, model } = await askGemini(verdictSchema, [
    {
      role: "user",
      content: `Avaliação técnica de uma configuração de PC enviada pelo usuário:\n${JSON.stringify(facts, null, 1)}\n\nEscreva o parecer. Peças "não informadas no documento" provavelmente existem, só não foram citadas: não diga que faltam, no máximo sugira confirmar com o vendedor.`,
    },
  ]);
  return { summary: output.summary.trim(), model };
}
