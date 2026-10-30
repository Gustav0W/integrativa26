import { extractText, getDocumentProxy } from "unpdf";
import { analyzeDocumentText } from "@/lib/analysis";
import { sanitizeInput } from "@/lib/engine";
import { geminiAvailable, modelLabel, readSpecDocument, writeVerdict } from "@/lib/server/gemini";

/** Tempo máximo da função na hospedagem (Vercel etc.): o Gemini leva alguns segundos. */
export const maxDuration = 60;

/**
 * POST /api/analisar-pdf — multipart/form-data:
 *   file (PDF) ou text (texto colado), objectives (JSON), resolution.
 *
 * 1. Extrai o texto do PDF (unpdf) para mostrar ao usuário.
 * 2. Gemini lê o documento (inclusive PDF escaneado) e padroniza as peças.
 * 3. O motor avalia compatibilidade e adequação ao uso (engine.ts).
 * 4. Gemini escreve um parecer em linguagem natural.
 * Sem Gemini, os passos 2 e 4 viram heurística local.
 */

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return Response.json({ error: "Envie os dados como formulário." }, { status: 400 });

  const file = form.get("file");
  const pasted = form.get("text");
  const { objectives, resolution } = sanitizeInput({ objectives: JSON.parse(String(form.get("objectives") ?? "[]")), resolution: form.get("resolution") });

  let text = "";
  let source = "Texto colado";
  let pdfBytes: Uint8Array | null = null;

  if (file instanceof File) {
    if (file.size > MAX_BYTES) return Response.json({ error: "O PDF passa de 10MB." }, { status: 413 });
    pdfBytes = new Uint8Array(await file.arrayBuffer());
    try {
      // pdf.js pode "consumir" o buffer: passa uma cópia.
      const pdf = await getDocumentProxy(pdfBytes.slice());
      const extracted = await extractText(pdf, { mergePages: true });
      text = extracted.text;
      source = `${file.name} (${extracted.totalPages} página${extracted.totalPages === 1 ? "" : "s"})`;
    } catch (error) {
      console.error("[analisar-pdf] unpdf:", error);
      if (!geminiAvailable()) return Response.json({ error: "Não foi possível ler este PDF. Ele pode estar protegido ou corrompido." }, { status: 422 });
      source = file.name;
    }
  } else if (typeof pasted === "string" && pasted.trim()) {
    text = pasted.slice(0, 20000);
  } else {
    return Response.json({ error: "Envie um PDF ou cole o texto do orçamento." }, { status: 400 });
  }

  // Gemini lê o documento; sem ele (ou se falhar), segue só com o texto extraído.
  let specText: string | undefined;
  let model: string | undefined;
  if (geminiAvailable()) {
    try {
      const read = await readSpecDocument(pdfBytes ? { pdf: pdfBytes } : { text });
      specText = read.specText || undefined;
      model = read.model;
    } catch (error) {
      console.warn("[analisar-pdf] Gemini não leu o documento:", error instanceof Error ? error.message : error);
    }
  }

  if (!text.trim() && !specText) {
    return Response.json({ error: "Não há texto legível neste PDF (pode ser uma imagem escaneada). Copie e cole o conteúdo na opção “Colar texto”." }, { status: 422 });
  }

  const analysis = analyzeDocumentText(text || specText || "", source, objectives, resolution, specText);

  if (model) {
    try {
      const verdict = await writeVerdict(
        analysis.evaluation,
        analysis.specs.found.map((f) => `${f.category}: ${f.label}`),
        analysis.specs.totalPrice,
        analysis.alternative,
      );
      analysis.summary = verdict.summary;
      model = verdict.model;
    } catch (error) {
      console.warn("[analisar-pdf] Gemini não escreveu o parecer:", error instanceof Error ? error.message : error);
    }
    analysis.aiModel = modelLabel(model);
  }

  return Response.json(analysis);
}
