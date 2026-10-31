"use client";

import { useRef, useState } from "react";
import { ChevronDown, ChevronUp, RotateCcw, SendHorizontal } from "lucide-react";
import { BuildResultView } from "@/components/build-result";
import { PriceLinks } from "@/components/part-card";
import { CATEGORY_UI, PageIntro, PrivacyNote, primaryButton, secondaryButton } from "@/components/ui";
import { requestChat, sleep } from "@/lib/api";
import { brl, clampBudget, computeLocalBuild, objectivesLabel, scoreLabel } from "@/lib/engine";
import { parseRequest } from "@/lib/nlp";
import type { BuildInput, BuildResult, Objective } from "@/lib/types";
import { useSessionState } from "@/lib/session-state";

type BuildMessage = { id: number; role: "ai"; kind: "build"; text: string; notes: string[]; result: BuildResult };
type AnswerMessage = { id: number; role: "ai"; kind: "answer"; text: string; links: { label: string; search: string }[]; aiModel: string };
type ChatMessage = { id: number; role: "user"; text: string } | BuildMessage | AnswerMessage;

const isBuild = (m: ChatMessage): m is BuildMessage => m.role === "ai" && "result" in m;

const DEFAULT_BUDGET = 6000;

const STARTERS = [
  "Faço arquitetura (Revit e Lumion) e também jogo no fim de semana. Tenho uns 10 mil.",
  "Quero um PC para jogar Cyberpunk em 1440p, até R$ 7.000.",
  "Sou programador, uso Docker e Android Studio. Orçamento de 5 mil.",
  "PC simples para faculdade e Office, com monitor, até 3 mil.",
  "Qual a diferença entre SSD NVMe e SATA? Vale a pena pagar mais?",
];

const FOLLOW_UPS = ["Pode ser mais barato?", "Quero algo mais potente", "Quero jogar em 4K", "Também vou programar", "Incluir monitor e periféricos"];

/** Converte a mensagem em parâmetros, considerando o que já foi conversado. */
function resolveInput(text: string, previous: BuildInput | null): { input: BuildInput; notes: string[] } {
  const parsed = parseRequest(text);
  const notes: string[] = [];

  if (!previous) {
    const objectives: Objective[] = parsed.objectives.length > 0 ? parsed.objectives : ["office"];
    if (parsed.budget === null) notes.push(`Você não citou um valor, então considerei ${brl(DEFAULT_BUDGET)}. Diga, por exemplo, "até 5 mil" para ajustar.`);
    if (parsed.objectives.length === 0) notes.push("Não identifiquei o uso, então considerei estudos/escritório. Conte se você joga, programa ou trabalha com 3D.");
    const budget = parsed.budget ?? DEFAULT_BUDGET;
    return {
      input: {
        budget,
        objectives,
        resolution: parsed.resolution ?? (budget >= 7000 ? "1440p" : "1080p"),
        brand: parsed.brand ?? "any",
        includePeripherals: parsed.peripherals ?? false,
        silent: parsed.silent,
        prompt: text,
      },
      notes,
    };
  }

  let budget = previous.budget;
  if (parsed.budget !== null) budget = parsed.budget;
  else if (parsed.adjust === "cheaper") {
    budget = Math.round((previous.budget * 0.8) / 100) * 100;
    notes.push(`Reduzi o orçamento em 20%, para ${brl(clampBudget(budget))}.`);
  } else if (parsed.adjust === "stronger") {
    budget = Math.round((previous.budget * 1.25) / 100) * 100;
    notes.push(`Aumentei o orçamento em 25%, para ${brl(clampBudget(budget))}, para buscar mais desempenho.`);
  }

  let objectives = previous.objectives;
  if (parsed.objectives.length > 0) {
    objectives = parsed.exclusive ? parsed.objectives : [...new Set([...previous.objectives, ...parsed.objectives])];
  }
  if (parsed.resolution && !objectives.includes("gaming")) objectives = [...objectives, "gaming"];

  return {
    input: {
      budget,
      objectives,
      resolution: parsed.resolution ?? previous.resolution,
      brand: parsed.brand ?? previous.brand,
      includePeripherals: parsed.peripherals ?? previous.includePeripherals,
      silent: previous.silent || parsed.silent,
      prompt: `${previous.prompt} ${text}`.slice(-500),
    },
    notes,
  };
}

export function ConversarClient() {
  const [messages, setMessages] = useSessionState<ChatMessage[]>("conversar:messages", []);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(messages.length);

  const lastBuild = [...messages].reverse().find(isBuild);

  const scrollToBottom = () => requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || thinking) return;
    const baseId = nextId.current;
    nextId.current += 2;
    setMessages((prev) => [...prev, { id: baseId, role: "user", text }]);
    setDraft("");
    setThinking(true);
    scrollToBottom();

    const previous = lastBuild?.result.input ?? null;
    const history = messages.map((m) => ({ role: m.role, text: m.text }));
    const currentBuild = lastBuild ? [...lastBuild.result.parts.map((part) => `${part.category.toUpperCase()}: ${part.name} (${brl(part.price)})`), `Total: ${brl(lastBuild.result.total)}`] : [];
    const summarize = (result: BuildResult) => {
      const gaming = result.input.objectives.includes("gaming");
      return `Entendi: ${objectivesLabel(result.input.objectives, gaming ? result.input.resolution : undefined)} com até ${brl(result.input.budget)}. Montei uma build ${result.tier.toLowerCase()} de ${brl(result.total)}, com nota ${result.score}/100 (${scoreLabel(result.score).toLowerCase()}) para o seu uso.`;
    };

    const id = baseId + 1;
    try {
      let message: BuildMessage | AnswerMessage;
      try {
        // IA de verdade: o Gemini decide se responde em texto ou monta uma build.
        const turn = await requestChat(text, previous, history, currentBuild);
        message =
          turn.kind === "answer"
            ? { id, role: "ai", kind: "answer", text: turn.reply, links: turn.links, aiModel: turn.aiModel }
            : { id, role: "ai", kind: "build", text: turn.reply ?? summarize(turn.result), notes: turn.notes, result: turn.result };
      } catch {
        // Modo offline: sem a IA de linguagem, só dá para montar builds por palavras-chave.
        const parsed = parseRequest(text);
        if (!previous && parsed.budget === null && parsed.objectives.length === 0) {
          await sleep(400);
          message = {
            id,
            role: "ai",
            kind: "answer",
            text: "Estou em modo offline (a IA de linguagem não respondeu), então não consigo responder perguntas livres agora. Mas consigo montar um PC: me diga para que vai usar e quanto quer gastar, por exemplo “jogos e faculdade, até 5 mil”.",
            links: [],
            aiModel: "Motor local",
          };
        } else {
          const resolved = resolveInput(text, previous);
          const notes = [...resolved.notes, "Modo offline: a IA de linguagem não respondeu, então interpretei por palavras-chave."];
          if (resolved.input.budget !== clampBudget(resolved.input.budget)) notes.push(`O valor foi ajustado para a faixa atendida (${brl(clampBudget(resolved.input.budget))}).`);
          const [result] = await Promise.all([Promise.resolve(computeLocalBuild(resolved.input)), sleep(600)]);
          message = { id, role: "ai", kind: "build", text: summarize(result), notes, result };
        }
      }
      setMessages((prev) => [...prev, message]);
      setExpanded(null);
    } finally {
      setThinking(false);
      scrollToBottom();
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <PageIntro code="02" title="Descreva para a IA" description="Converse como com um amigo que entende de PC: peça uma configuração completa, ajustes nela ou tire dúvidas sobre peças e preços.">
        {messages.length > 0 && (
          <button type="button" onClick={() => setMessages([])} className={secondaryButton}>
            <RotateCcw className="size-3.5" />
            Nova conversa
          </button>
        )}
      </PageIntro>
      <PrivacyNote />

      <div className="space-y-6">
        {messages.length === 0 && (
          <div className="border border-line bg-surface">
            <p className="label-mono border-b border-line px-4 py-2 text-brand-text">SmartBuild AI</p>
            <div className="p-5">
              <p className="font-semibold">Oi! Quer montar um PC ou tirar alguma dúvida?</p>
              <p className="mt-1 text-sm text-muted">Para uma build, conte para que vai usar e quanto quer gastar. Também pode perguntar sobre peças, preços e compatibilidade. Por exemplo:</p>
              <ul className="mt-4 border-t border-line">
                {STARTERS.map((starter) => (
                  <li key={starter}>
                    <button
                      type="button"
                      onClick={() => void send(starter)}
                      className="group flex w-full items-baseline gap-3 border-b border-line px-1 py-3 text-left text-sm text-muted transition hover:bg-surface-2 hover:text-fg"
                    >
                      <span className="font-mono text-xs text-brand-text">&gt;</span>
                      <span className="flex-1">{starter}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="ml-auto max-w-[85%] border-r-2 border-brand pr-4 text-right">
              <p className="label-mono text-subtle">Você</p>
              <p className="mt-1 text-[15px]">{message.text}</p>
            </div>
          ) : (
            <div key={message.id} className="space-y-3">
              <div className="border border-line bg-surface">
                <p className="label-mono flex items-center gap-2 border-b border-line px-4 py-2 text-brand-text">
                  <span className="size-1.5 bg-copper" />
                  SmartBuild AI
                  <span className="ml-auto text-subtle">{isBuild(message) ? (message.result.source === "api" ? (message.result.aiModel ?? "Gemini") : "Motor local") : message.aiModel}</span>
                </p>
                {!isBuild(message) ? (
                  <div className="p-4">
                    <p className="text-sm leading-relaxed whitespace-pre-line">{message.text}</p>
                    {message.links.length > 0 && (
                      <ul className="mt-4 divide-y divide-line border-y border-line">
                        {message.links.map((link) => (
                          <li key={link.search} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-sm font-medium">{link.label}</span>
                            <PriceLinks terms={[link.search]} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <div className="p-4">
                    <p className="text-sm">{message.text}</p>
                    {message.notes.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {message.notes.map((note) => (
                          <li key={note} className="flex items-baseline gap-2 text-xs text-muted">
                            <span className="label-mono shrink-0 text-copper">[nota]</span>
                            {note}
                          </li>
                        ))}
                      </ul>
                    )}

                    <ul className="mt-4 divide-y divide-line border-y border-line">
                      {message.result.parts.map((part) => (
                        <li key={part.category} className="flex items-baseline gap-3 py-2 text-xs">
                          <span className="label-mono w-10 shrink-0 text-subtle">{CATEGORY_UI[part.category].code}</span>
                          <span className="min-w-0 flex-1 truncate">{part.name}</span>
                          <span className="shrink-0 font-mono">{part.price > 0 ? brl(part.price) : "incluso"}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <span className={`label-mono ${message.result.compatibility.every((c) => c.ok) ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                        {message.result.compatibility.every((c) => c.ok) ? "[OK] Peças 100% compatíveis" : "[!] Há itens para revisar"}
                      </span>
                      <button type="button" onClick={() => setExpanded(expanded === message.id ? null : message.id)} className={secondaryButton}>
                        {expanded === message.id ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                        {expanded === message.id ? "Fechar detalhes" : "Detalhes, motivos e preços"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {isBuild(message) && expanded === message.id && <BuildResultView result={message.result} />}
            </div>
          ),
        )}

        {thinking && (
          <p className="flex items-center gap-2 font-mono text-xs text-muted">
            <span className="text-brand-text">&gt;</span>
            pensando
            <span className="inline-block h-3.5 w-2 animate-pulse bg-brand" />
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Campo de mensagem */}
      <div className="sticky bottom-0 mt-8 bg-canvas pt-3 pb-4">
        {lastBuild && !thinking && (
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
            {FOLLOW_UPS.map((text) => (
              <button key={text} type="button" onClick={() => void send(text)} className="shrink-0 border border-line bg-surface px-3 py-1.5 text-xs text-muted transition hover:border-ink/50 hover:text-fg">
                {text}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send(draft);
          }}
          className="flex items-stretch border border-ink/80 bg-surface focus-within:border-brand"
        >
          <span className="pt-3 pl-3 font-mono text-sm text-brand-text">&gt;</span>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, 500))}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send(draft);
              }
            }}
            rows={2}
            placeholder={lastBuild ? "Peça um ajuste ou pergunte algo sobre as peças…" : "Ex.: Faço arquitetura e jogo nas horas vagas, tenho até 9 mil."}
            className="w-full resize-none bg-transparent px-2 py-2.5 text-sm outline-none placeholder:text-subtle"
          />
          <button type="submit" disabled={!draft.trim() || thinking} className={`${primaryButton} shrink-0 px-4`} aria-label="Enviar mensagem">
            Enviar
            <SendHorizontal className="size-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
