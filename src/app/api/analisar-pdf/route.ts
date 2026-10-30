import { extractText, getDocumentProxy } from "unpdf";

/**
 * Recebe um PDF (multipart/form-data, campo "file") e devolve o texto extraído.
 * A análise das peças acontece no front (src/lib/nlp.ts → parseSpecs).
 *
 * Para trocar pela análise de um LLM multimodal: envie os bytes do PDF ao
 * modelo (ex.: Gemini via `@ai-sdk/google`, que aceita arquivos PDF) pedindo
 * a lista de peças em JSON e retorne-a junto com o texto.
 */

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Envie um arquivo PDF no campo 'file'." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "O PDF passa de 10MB." }, { status: 413 });
  }

  try {
    const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
    const { totalPages, text } = await extractText(pdf, { mergePages: true });
    return Response.json({ text, pages: totalPages });
  } catch (error) {
    console.error("[analisar-pdf]", error);
    return Response.json({ error: "Não foi possível ler este PDF. Ele pode estar protegido ou corrompido." }, { status: 422 });
  }
}
