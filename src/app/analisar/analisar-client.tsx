"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Upload, X } from "lucide-react";
import { EvaluationPanel } from "@/components/evaluation-panel";
import { LoadingState } from "@/components/build-result";
import { CATEGORY_UI, ObjectivePicker, PageIntro, Panel, Segmented, inputClass, primaryButton, secondaryButton } from "@/components/ui";
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
      <PageIntro code="04" title="Analisar orçamento em PDF" description="Envie o orçamento de uma loja, a ficha técnica de um PC pronto ou de um usado. A IA identifica as peças e diz se valem a pena para o seu uso." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <aside className="min-w-0 space-y-4 lg:col-span-5">
          <Panel index="01" title="Para que vai usar o PC?">
            <ObjectivePicker value={objectives} onChange={setObjectives} resolution={resolution} onResolutionChange={setResolution} compact />
          </Panel>

          <Panel index="02" title="Documento">
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
                className={`mt-4 flex flex-col items-center border border-dashed px-4 py-8 text-center transition ${dragging ? "border-brand bg-brand-soft" : "border-ink/40"}`}
              >
                <input ref={fileInput} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => pickFile(event.target.files?.[0])} />
                {file ? (
                  <div className="flex w-full items-center gap-3 border border-line bg-surface p-3 text-left">
                    <span className="label-mono shrink-0 bg-ink px-1.5 py-0.5 text-canvas">PDF</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{file.name}</span>
                      <span className="block font-mono text-[11px] text-subtle">{(file.size / 1024).toFixed(0)} KB</span>
                    </span>
                    <button type="button" onClick={() => setFile(null)} aria-label="Remover arquivo" className="text-subtle hover:text-fg">
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="size-6 text-subtle" strokeWidth={1.5} />
                    <p className="mt-3 text-sm font-medium">Arraste o PDF aqui</p>
                    <button type="button" onClick={() => fileInput.current?.click()} className={`${secondaryButton} mt-3`}>
                      Escolher arquivo
                    </button>
                    <p className="mt-3 font-mono text-[10px] text-subtle">Até 10MB · PDFs escaneados (imagem) não têm texto legível</p>
                  </>
                )}
              </div>
            ) : (
              <div className="mt-4">
                <textarea value={pasted} onChange={(event) => setPasted(event.target.value)} rows={9} placeholder="Cole aqui a lista de peças do orçamento ou da ficha técnica…" className={`${inputClass} resize-y font-mono text-xs`} />
                <button type="button" onClick={() => setPasted(SAMPLE_QUOTE)} className="label-mono mt-2 text-brand-text underline-offset-2 hover:underline">
                  Usar um orçamento de exemplo
                </button>
              </div>
            )}

            {error && (
              <p className="mt-3 flex items-baseline gap-2 text-xs text-rose-600 dark:text-rose-400">
                <span className="label-mono shrink-0">[Erro]</span>
                {error}
              </p>
            )}

            <button type="button" onClick={() => void analyze()} disabled={!canAnalyze || loading} className={`${primaryButton} mt-4 w-full`}>
              {loading ? "Analisando…" : "Analisar com IA"}
              <ArrowRight className="size-4" />
            </button>
          </Panel>
        </aside>

        <section className="min-w-0 space-y-4 lg:col-span-7">
          {loading ? (
            <LoadingState step={step} steps={STEPS} />
          ) : analysis ? (
            <>
              <section className="border border-ink/80 bg-surface">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-3">
                  <div>
                    <h2 className="text-sm font-semibold">O que a IA encontrou</h2>
                    <p className="font-mono text-[11px] text-subtle">{analysis.source}</p>
                  </div>
                  {analysis.specs.totalPrice !== null && <span className="font-mono text-lg font-semibold">{brl(analysis.specs.totalPrice)}</span>}
                </div>
                <div className="p-4">
                  {analysis.specs.found.length > 0 ? (
                    <dl className="divide-y divide-line border-y border-line">
                      {analysis.specs.found.map((item) => (
                        <div key={item.category} className="flex items-baseline gap-3 py-2 text-sm">
                          <dt className="label-mono w-28 shrink-0 text-subtle">{item.category}</dt>
                          <dd className="font-medium">{item.label}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="text-sm text-muted">Nenhuma peça reconhecida. Confira se o documento lista processador, placa de vídeo, memória etc.</p>
                  )}
                  {analysis.specs.unknown.length > 0 && (
                    <p className="mt-3 flex items-baseline gap-2 text-xs text-muted">
                      <span className="label-mono shrink-0 text-copper">[Atenção]</span>
                      Citado, mas fora da base da IA: {analysis.specs.unknown.join(", ")}. A avaliação desses itens fica parcial.
                    </p>
                  )}
                  <button type="button" onClick={() => setShowText((value) => !value)} className="label-mono mt-3 text-brand-text underline-offset-2 hover:underline">
                    {showText ? "Ocultar texto lido" : "Ver texto lido do documento"}
                  </button>
                  {showText && <pre className="mt-2 max-h-60 overflow-auto border border-line bg-surface-2 p-3 text-[11px] whitespace-pre-wrap text-muted">{analysis.text}</pre>}
                </div>
              </section>

              <EvaluationPanel evaluation={analysis.evaluation} resolutionLabel={RESOLUTION_LABEL[analysis.resolution]} />

              {analysis.alternative && (
                <section className="border border-line bg-surface p-4">
                  <p className="label-mono text-brand-text">Pelo mesmo valor, a IA montaria</p>
                  <p className="mt-1.5 text-sm text-muted">
                    Build de {brl(analysis.alternative.total)} com nota {analysis.alternative.score}/100 para o seu uso
                    {analysis.evaluation.overall !== null ? ` (a do documento ficou em ${analysis.evaluation.overall}/100)` : ""}.
                  </p>
                  <ul className="mt-3 divide-y divide-line border-y border-line text-xs">
                    {analysis.alternative.parts.map((part) => (
                      <li key={part.category} className="flex items-baseline gap-3 py-1.5">
                        <span className="label-mono w-10 shrink-0 text-subtle">{CATEGORY_UI[part.category].code}</span>
                        <span className="min-w-0 flex-1 truncate">{part.name}</span>
                        <span className="shrink-0 font-mono text-subtle">{part.price > 0 ? brl(part.price) : "incluso"}</span>
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => analysis.alternative && openInAssistant(analysis.alternative)} className={`${secondaryButton} mt-4`}>
                    Ver detalhes e preços no Assistente
                    <ArrowRight className="size-3.5" />
                  </button>
                </section>
              )}
            </>
          ) : (
            <div className="border border-dashed border-ink/40 px-6 py-12">
              <p className="label-mono text-subtle">Saída — aguardando documento</p>
              <h2 className="heading mt-3 text-2xl">O parecer da IA aparece aqui.</h2>
              <p className="mt-2 max-w-md text-sm text-muted">
                Ela lista as peças encontradas, aponta incompatibilidades (fonte fraca, memória errada…), diz se serve para o seu uso e compara com o que daria para montar pelo mesmo preço.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
