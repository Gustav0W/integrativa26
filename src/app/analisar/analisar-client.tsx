"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardType, FileSearch, FileText, FileUp, ScanSearch, Sparkles, Target, TriangleAlert, Upload, X } from "lucide-react";
import { EvaluationPanel } from "@/components/evaluation-panel";
import { LoadingState } from "@/components/build-result";
import { ObjectivePicker, PageIntro, Panel, Segmented, inputClass, primaryButton, secondaryButton } from "@/components/ui";
import { extractPdfText, sleep } from "@/lib/api";
import { BUDGET_MAX, BUDGET_MIN } from "@/lib/catalog";
import { RESOLUTION_LABEL, brl, computeLocalBuild, evaluateBuild, type BuildEvaluation } from "@/lib/engine";
import { parseSpecs, type DetectedSpecs } from "@/lib/nlp";
import { useSessionState, writeSessionState } from "@/lib/session-state";
import type { BuildInput, BuildResult, Objective, Resolution } from "@/lib/types";

type Mode = "pdf" | "text";

interface Analysis {
  source: string;
  text: string;
  specs: DetectedSpecs;
  evaluation: BuildEvaluation;
  objectives: Objective[];
  resolution: Resolution;
  alternative: BuildResult | null;
}

const STEPS = ["Lendo o documento", "Identificando as peças citadas", "Conferindo compatibilidade entre elas", "Avaliando para o seu uso"];

const SAMPLE_QUOTE = `ORÇAMENTO Nº 1042 — Loja Exemplo Informática
Processador AMD Ryzen 5 5600 — R$ 599,00
Placa-mãe ASUS Prime A520M-K — R$ 379,00
Memória 16GB (2x8GB) DDR4 3200MHz — R$ 279,00
Placa de vídeo GeForce RTX 3050 6GB — R$ 1.099,00
SSD 480GB SATA — R$ 189,00
Fonte 400W — R$ 159,00
Gabinete gamer com 3 fans + cooler box
TOTAL: R$ 2.704,00`;

export function AnalisarClient() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("pdf");
  const [file, setFile] = useState<File | null>(null);
  const [pasted, setPasted] = useState("");
  const [dragging, setDragging] = useState(false);
  const [objectives, setObjectives] = useSessionState<Objective[]>("analisar:objectives", ["arquitetura"]);
  const [resolution, setResolution] = useSessionState<Resolution>("analisar:resolution", "1080p");
  const [analysis, setAnalysis] = useSessionState<Analysis | null>("analisar:result", null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showText, setShowText] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const pickFile = (candidate: File | undefined) => {
    setError(null);
    if (!candidate) return;
    if (candidate.type !== "application/pdf" && !candidate.name.toLowerCase().endsWith(".pdf")) {
      setError("Envie um arquivo PDF.");
      return;
    }
    setFile(candidate);
  };

  const analyze = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    setStep(0);
    try {
      let text = pasted;
      let source = "Texto colado";
      if (mode === "pdf") {
        if (!file) throw new Error("Escolha um PDF primeiro.");
        const [extracted] = await Promise.all([extractPdfText(file), sleep(500)]);
        text = extracted.text;
        source = `${file.name} (${extracted.pages} página${extracted.pages === 1 ? "" : "s"})`;
      }
      if (!text.trim()) throw new Error(mode === "pdf" ? "Não há texto neste PDF (pode ser uma imagem escaneada). Copie e cole o conteúdo na opção “Colar texto”." : "Cole o texto do orçamento primeiro.");

      setStep(1);
      await sleep(450);
      const specs = parseSpecs(text);
      setStep(2);
      await sleep(450);
      const evaluation = evaluateBuild(specs.build, objectives, resolution, text);
      setStep(3);
      await sleep(450);

      const alternativeInput: BuildInput | null = specs.totalPrice
        ? { budget: Math.max(BUDGET_MIN, Math.min(BUDGET_MAX, specs.totalPrice)), objectives, resolution, brand: "any", includePeripherals: false, silent: false, prompt: "" }
        : null;
      setAnalysis({ source, text, specs, evaluation, objectives, resolution, alternative: alternativeInput ? computeLocalBuild(alternativeInput) : null });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível analisar o documento.");
    } finally {
      setLoading(false);
    }
  };

  const openInAssistant = (result: BuildResult) => {
    writeSessionState("assistente:form", result.input);
    writeSessionState("assistente:result", result);
    router.push("/assistente", { transitionTypes: ["nav-back"] });
  };

  const canAnalyze = mode === "pdf" ? file !== null : pasted.trim().length > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageIntro icon={FileSearch} title="Analisar orçamento em PDF" description="Envie o orçamento de uma loja, a ficha técnica de um PC pronto ou de um usado. A IA identifica as peças e diz se valem a pena para o seu uso." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <aside className="min-w-0 space-y-4 lg:col-span-5">
          <Panel title="Para que vai usar o PC?" icon={Target}>
            <ObjectivePicker value={objectives} onChange={setObjectives} resolution={resolution} onResolutionChange={setResolution} compact />
          </Panel>

          <Panel title="Documento" icon={FileText}>
            <Segmented<Mode>
              value={mode}
              onChange={setMode}
              options={[
                { id: "pdf", label: "Enviar PDF" },
                { id: "text", label: "Colar texto" },
              ]}
            />

            {mode === "pdf" ? (
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  pickFile(event.dataTransfer.files[0]);
                }}
                className={`mt-4 flex flex-col items-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${dragging ? "border-brand bg-brand-soft" : "border-line bg-surface-2"}`}
              >
                <input ref={fileInput} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => pickFile(event.target.files?.[0])} />
                {file ? (
                  <div className="flex w-full items-center gap-3 rounded-lg bg-surface p-3 text-left ring-1 ring-line">
                    <FileText className="size-5 shrink-0 text-brand-text" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{file.name}</span>
                      <span className="block text-xs text-subtle">{(file.size / 1024).toFixed(0)} KB</span>
                    </span>
                    <button type="button" onClick={() => setFile(null)} aria-label="Remover arquivo" className="text-subtle hover:text-fg">
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="size-8 text-subtle" />
                    <p className="mt-3 text-sm font-medium">Arraste o PDF aqui</p>
                    <p className="text-xs text-subtle">ou</p>
                    <button type="button" onClick={() => fileInput.current?.click()} className={`${secondaryButton} mt-2`}>
                      <FileUp className="size-3.5" />
                      Escolher arquivo
                    </button>
                    <p className="mt-3 text-[11px] text-subtle">Até 10MB. PDFs escaneados (imagem) não têm texto legível.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="mt-4">
                <textarea value={pasted} onChange={(event) => setPasted(event.target.value)} rows={9} placeholder="Cole aqui a lista de peças do orçamento ou da ficha técnica…" className={`${inputClass} resize-y font-mono text-xs`} />
                <button type="button" onClick={() => setPasted(SAMPLE_QUOTE)} className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-brand-text hover:underline">
                  <ClipboardType className="size-3.5" />
                  Usar um orçamento de exemplo
                </button>
              </div>
            )}

            {error && (
              <p className="mt-3 flex items-start gap-1.5 text-xs text-rose-600 dark:text-rose-400">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                {error}
              </p>
            )}

            <button type="button" onClick={() => void analyze()} disabled={!canAnalyze || loading} className={`${primaryButton} mt-4 w-full`}>
              <ScanSearch className="size-4" />
              {loading ? "Analisando…" : "Analisar com IA"}
            </button>
          </Panel>
        </aside>

        <section className="min-w-0 space-y-4 lg:col-span-7">
          {loading ? (
            <LoadingState step={step} steps={STEPS} />
          ) : analysis ? (
            <>
              <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold">O que a IA encontrou</h2>
                    <p className="text-xs text-subtle">{analysis.source}</p>
                  </div>
                  {analysis.specs.totalPrice !== null && <span className="rounded-full bg-surface-2 px-3 py-1 text-sm font-bold">Total: {brl(analysis.specs.totalPrice)}</span>}
                </div>
                {analysis.specs.found.length > 0 ? (
                  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                    {analysis.specs.found.map((item) => (
                      <li key={item.category} className="rounded-xl bg-surface-2 px-3 py-2">
                        <span className="block text-[11px] font-semibold text-subtle uppercase">{item.category}</span>
                        <span className="text-sm font-medium">{item.label}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-muted">Nenhuma peça reconhecida. Confira se o documento lista processador, placa de vídeo, memória etc.</p>
                )}
                {analysis.specs.unknown.length > 0 && (
                  <p className="mt-3 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                    <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                    Citado, mas fora da base da IA: {analysis.specs.unknown.join(", ")}. A avaliação desses itens fica parcial.
                  </p>
                )}
                <button type="button" onClick={() => setShowText((value) => !value)} className="mt-3 text-xs font-medium text-brand-text hover:underline">
                  {showText ? "Ocultar texto lido" : "Ver texto lido do documento"}
                </button>
                {showText && <pre className="mt-2 max-h-60 overflow-auto rounded-lg bg-surface-2 p-3 text-[11px] whitespace-pre-wrap text-muted">{analysis.text}</pre>}
              </div>

              <EvaluationPanel evaluation={analysis.evaluation} resolutionLabel={RESOLUTION_LABEL[analysis.resolution]} />

              {analysis.alternative && (
                <div className="rounded-2xl border border-brand/30 bg-surface p-5">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="size-4 text-brand-text" />
                    Pelo mesmo valor, a IA montaria:
                  </h3>
                  <p className="mt-1 text-xs text-muted">
                    Build de {brl(analysis.alternative.total)} com nota {analysis.alternative.score}/100 para o seu uso
                    {analysis.evaluation.overall !== null ? ` (a do documento ficou em ${analysis.evaluation.overall}/100)` : ""}.
                  </p>
                  <ul className="mt-3 space-y-1 text-xs">
                    {analysis.alternative.parts.map((part) => (
                      <li key={part.category} className="flex justify-between gap-2">
                        <span className="truncate">{part.name}</span>
                        <span className="shrink-0 text-subtle">{part.price > 0 ? brl(part.price) : "incluso"}</span>
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => analysis.alternative && openInAssistant(analysis.alternative)} className={`${secondaryButton} mt-4`}>
                    Ver detalhes e preços no Assistente
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-14 text-center">
              <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-linear-to-br from-brand-from to-brand-to shadow-lg shadow-brand/25">
                <FileSearch className="size-8 text-on-brand" />
              </span>
              <h2 className="mt-5 text-xl font-bold">O parecer da IA aparece aqui</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                Ela lista as peças encontradas, aponta incompatibilidades (fonte fraca, memória errada…), diz se serve para o seu uso e compara com o que daria para montar pelo mesmo preço.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
