import type { LucideIcon } from "lucide-react";
import { FileSearch, MessagesSquare, Puzzle, WandSparkles } from "lucide-react";

/** Ordem do menu: define se a transição de página desliza para frente ou para trás. */
const NAV_ORDER = ["/", "/assistente", "/conversar", "/montar", "/analisar"];

export function navTransition(from: string, to: string): string[] {
  const a = NAV_ORDER.indexOf(from);
  const b = NAV_ORDER.indexOf(to);
  if (a === -1 || b === -1 || a === b) return [];
  return [b > a ? "nav-forward" : "nav-back"];
}

/** As quatro ferramentas da plataforma (usadas no menu e na página inicial). */
export const TOOLS: { href: string; short: string; title: string; description: string; idealFor: string; icon: LucideIcon }[] = [
  {
    href: "/assistente",
    short: "Assistente",
    title: "Assistente guiado",
    description: "Informe orçamento e para que vai usar o PC. A IA monta a configuração completa, compatível e sem gargalos.",
    idealFor: "Ideal se você não entende de peças e quer uma resposta pronta.",
    icon: WandSparkles,
  },
  {
    href: "/conversar",
    short: "Conversar",
    title: "Descreva para a IA",
    description: "Escreva do seu jeito o que você faz e quanto quer gastar. A IA entende e sugere a build — e você pode pedir ajustes.",
    idealFor: "Ideal se prefere explicar com suas palavras.",
    icon: MessagesSquare,
  },
  {
    href: "/montar",
    short: "Montar",
    title: "Monte você mesmo",
    description: "Escolha peça por peça e veja em tempo real se elas são compatíveis e se servem para o seu uso.",
    idealFor: "Ideal se você já viu peças que gostou e quer validar.",
    icon: Puzzle,
  },
  {
    href: "/analisar",
    short: "Analisar PDF",
    title: "Analisar orçamento em PDF",
    description: "Envie o PDF de um orçamento ou ficha técnica. A IA lê as peças e diz se a configuração vale a pena.",
    idealFor: "Ideal se recebeu um orçamento de loja ou de um PC usado.",
    icon: FileSearch,
  },
];
