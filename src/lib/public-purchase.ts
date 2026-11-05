import { CATALOG_UPDATED_AT } from "./catalog";
import { catalogDateLabel, sectorLabel } from "./engine";
import type { FitReport } from "./fit";
import type { BuildResult, InsightTone, PartCategory, PublicPurchase, RecommendedPart } from "./types";

/**
 * Conferência de apoio para compras públicas em Santa Catarina.
 * Aponta o caminho da compra e o que falta no processo: não é parecer jurídico.
 *
 * O limite muda todo ano (art. 182 da Lei 14.133): ao sair o novo decreto
 * federal, atualizar `year` e `dispensaLimit`.
 */
export const PUBLIC_RULES = {
  year: 2026,
  /** Art. 75, II, atualizado pelo Decreto federal 12.807/2025. */
  dispensaLimit: 65492.11,
  /** A partir desta parte do limite, a tela avisa que está perto. */
  nearLimitShare: 0.8,
  /** Preços de sites valem por até 6 meses (IN Conjunta SEA/CGE 3/2026, art. 6º, III). */
  priceMaxAgeMonths: 6,
  maxQuantity: 500,
};

export const DEFAULT_PUBLIC_PURCHASE: PublicPurchase = { enabled: false, quantity: 1, spentThisYear: 0 };

export const PUBLIC_DISCLAIMER = "Conferência de apoio, não é parecer jurídico. A decisão final é do setor de compras e da assessoria jurídica do órgão. As regras de SC valem para a administração estadual direta, autárquica e fundacional; municípios podem ter regulamento próprio.";

export type PublicStatus = "dispensa" | "atencao" | "licitacao";

export interface PublicCheck {
  tone: InsightTone;
  label: string;
  detail: string;
}

export interface PublicSpecItem {
  label: string;
  /** Descrição técnica sem marca nem modelo. */
  spec: string;
  unitPrice: number;
  estimated: boolean;
}

export interface PublicDocument {
  label: string;
  /** O SmartBuild entrega um rascunho deste documento. */
  drafted: boolean;
}

export interface PublicEvaluation {
  status: PublicStatus;
  headline: string;
  quantity: number;
  spentThisYear: number;
  unitTotal: number;
  purchaseTotal: number;
  yearTotal: number;
  limit: number;
  /** Quantos PCs ainda cabem abaixo do limite neste ano. */
  maxQuantity: number;
  checks: PublicCheck[];
  items: PublicSpecItem[];
  documents: PublicDocument[];
}

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const brlCents = (value: number) => money.format(value);

const toCents = (value: number) => Math.round(value * 100);

export function sanitizePurchase(purchase: PublicPurchase): PublicPurchase {
  const quantity = Math.round(Number(purchase.quantity)) || 1;
  return {
    enabled: Boolean(purchase.enabled),
    quantity: Math.min(Math.max(quantity, 1), PUBLIC_RULES.maxQuantity),
    spentThisYear: Math.max(Number(purchase.spentThisYear) || 0, 0),
  };
}

const ITEM_LABEL: Record<PartCategory, string> = {
  cpu: "Processador",
  gpu: "Vídeo",
  mobo: "Placa-mãe",
  ram: "Memória",
  ssd: "Armazenamento",
  psu: "Fonte",
  case: "Gabinete",
  extra: "Monitor",
};

/** Socket e nome de chipset ficam de fora: indicam o fabricante do processador. */
function neutralSpec(part: RecommendedPart): string {
  const [first, second, third] = part.specs;
  switch (part.category) {
    case "cpu": {
      const cores = part.name.match(/(\d+)C\/(\d+)T/);
      const size = cores ? `${cores[1]} núcleos e ${cores[2]} threads` : "desempenho compatível com o uso";
      return `Processador de ${size}${third?.startsWith("iGPU") ? ", com vídeo integrado" : ""}`;
    }
    case "gpu":
      return part.price > 0 ? `Placa de vídeo dedicada com ${first.replace(" VRAM", "")} de memória` : "Vídeo integrado ao processador";
    case "mobo":
      return `Placa-mãe compatível com o processador, memória ${second}, formato ${third}${part.specs[3] === "Wi-Fi" ? ", com Wi-Fi" : ""}`;
    case "ram":
      return `Memória de ${first} ${second} em dual channel`;
    case "ssd":
      return `Armazenamento de ${first} (${second})`;
    case "psu":
      return `Fonte de ${first}, certificação ${second}`;
    case "case":
      return `Gabinete ${second} com refrigeração adequada ao processador`;
    case "extra":
      return `Monitor de ${first}, ${second}, painel ${third}, ${part.specs[3]}`;
  }
}

function headlineFor(status: PublicStatus) {
  if (status === "licitacao") return "Exige licitação";
  if (status === "atencao") return "Perto do limite de dispensa";
  return "Dentro do limite de dispensa";
}

function limitCheck(status: PublicStatus, yearTotal: number, maxQuantity: number): PublicCheck {
  const label = "Limite de dispensa (art. 75, II e §1º)";
  const sum = `Somando o que a unidade já gastou no ano com itens do mesmo ramo, chega a ${brlCents(yearTotal)}; o limite de ${PUBLIC_RULES.year} é ${brlCents(PUBLIC_RULES.dispensaLimit)}.`;
  if (status === "licitacao") {
    const room = maxQuantity > 0 ? ` Para ficar abaixo do limite, seriam no máximo ${maxQuantity} PC(s) neste ano.` : "";
    return { tone: "warning", label, detail: `${sum} A compra precisa de licitação, em regra pregão eletrônico.${room} Dividir o pedido só para caber no limite é fracionamento irregular.` };
  }
  if (status === "atencao") return { tone: "warning", label, detail: `${sum} Cabe dispensa, mas confira se há outras compras do mesmo ramo previstas até o fim do ano.` };
  return { tone: "success", label, detail: `${sum} A compra pode seguir por dispensa de licitação.` };
}

function sizingCheck(fit: FitReport | undefined): PublicCheck | null {
  if (!fit) return null;
  const label = "Dimensionamento do equipamento";
  const issues = fit.items.filter((item) => item.status !== "adequado");
  if (issues.length === 0) return { tone: "success", label, detail: "Todas as peças estão dentro da referência para o uso, sem excesso nem falta. As faixas são critério do SmartBuild, não da lei." };
  const list = issues.map((item) => `${item.label} em ${item.status}`).join(", ");
  return { tone: "warning", label, detail: `${list}. Reveja antes de comprar, para não pagar a mais nem faltar desempenho. As faixas são critério do SmartBuild, não da lei.` };
}

function pricesExpired(now: Date) {
  const expiry = new Date(`${CATALOG_UPDATED_AT}T00:00:00`);
  expiry.setMonth(expiry.getMonth() + PUBLIC_RULES.priceMaxAgeMonths);
  return now > expiry;
}

function priceCheck(estimatedParts: number, expired: boolean): PublicCheck {
  const label = "Pesquisa de preços (art. 23 e IN SEA/CGE 3/2026)";
  const rule = "Em SC são 3 ou mais preços, com prioridade para o painel de preços e compras de outros órgãos. Preços de sites precisam de data e hora de acesso e valem por até 6 meses.";
  if (expired) return { tone: "warning", label, detail: `A base de preços é de ${catalogDateLabel()} e passou de 6 meses: refaça a pesquisa. ${rule}` };
  if (estimatedParts > 0) return { tone: "warning", label, detail: `${estimatedParts} item(ns) têm preço estimado e precisam de cotação. Os demais usam a média de 3 lojas em ${catalogDateLabel()}. ${rule}` };
  return { tone: "info", label, detail: `Os valores são a média de 3 lojas em ${catalogDateLabel()} e servem de referência. ${rule}` };
}

/** Confere a compra usando a build gerada e os dados informados pelo órgão. */
export function evaluatePublicPurchase(result: BuildResult, rawPurchase: PublicPurchase, now = new Date()): PublicEvaluation {
  const { quantity, spentThisYear } = sanitizePurchase(rawPurchase);
  const unitCents = toCents(result.total);
  const spentCents = toCents(spentThisYear);
  const limitCents = toCents(PUBLIC_RULES.dispensaLimit);
  const yearCents = spentCents + unitCents * quantity;

  // A lei fala em valores "inferiores" ao limite: exatamente o limite já não cabe.
  const status: PublicStatus = yearCents >= limitCents ? "licitacao" : yearCents >= limitCents * PUBLIC_RULES.nearLimitShare ? "atencao" : "dispensa";
  const maxQuantity = unitCents > 0 ? Math.max(Math.ceil((limitCents - spentCents) / unitCents) - 1, 0) : 0;
  const yearTotal = yearCents / 100;

  const estimatedParts = result.parts.filter((part) => part.estimated).length;
  const direct = status !== "licitacao";

  const checks: PublicCheck[] = [
    limitCheck(status, yearTotal, maxQuantity),
    result.input.brand === "any"
      ? { tone: "success", label: "Indicação de marca (art. 41)", detail: "A especificação descreve o que o PC precisa ter, sem citar marca ou modelo." }
      : { tone: "warning", label: "Indicação de marca (art. 41)", detail: `A build foi gerada com preferência por ${result.input.brand === "amd" ? "AMD" : "Intel"}. Indicar marca é exceção e precisa de justificativa formal. Se não houver motivo técnico, escolha "Indiferente".` },
    priceCheck(estimatedParts, pricesExpired(now)),
    ...[sizingCheck(result.fit)].filter((check) => check !== null),
    direct
      ? { tone: "info", label: "Regra de Santa Catarina", detail: "Na administração estadual, a dispensa usa o Sistema de Dispensa Eletrônica; não usar é exceção, com justificativa (Decreto 30/2023, art. 12). O estudo técnico preliminar é opcional neste caso, com justificativa, e seus elementos mínimos vão para o termo de referência (Decreto 47/2023, arts. 8º e 9º)." }
      : { tone: "info", label: "Regra de Santa Catarina", detail: "Na administração estadual, a fase preparatória segue o Decreto 47/2023, e a licitação precisa de estudo técnico preliminar (art. 7º)." },
  ];

  const items = result.parts.map((part) => ({ label: ITEM_LABEL[part.category], spec: neutralSpec(part), unitPrice: part.price, estimated: Boolean(part.estimated) }));

  const documents: PublicDocument[] = [
    { label: "Documento de formalização da demanda", drafted: false },
    { label: direct ? "Estudo técnico preliminar (opcional, com justificativa)" : "Estudo técnico preliminar (obrigatório)", drafted: false },
    { label: "Termo de referência", drafted: true },
    { label: "Justificativa técnica", drafted: Boolean(result.fit) },
    { label: "Estimativa de despesa", drafted: true },
    { label: "Previsão de recursos orçamentários", drafted: false },
    { label: "Parecer jurídico e técnico, se for o caso", drafted: false },
    ...(direct
      ? [
          { label: "Habilitação do fornecedor", drafted: false },
          { label: "Razão da escolha do fornecedor e justificativa de preço", drafted: false },
          { label: "Autorização da autoridade competente", drafted: false },
        ]
      : [{ label: "Edital e minuta do contrato", drafted: false }]),
  ];

  return { status, headline: headlineFor(status), quantity, spentThisYear: spentCents / 100, unitTotal: unitCents / 100, purchaseTotal: (unitCents * quantity) / 100, yearTotal, limit: PUBLIC_RULES.dispensaLimit, maxQuantity, checks, items, documents };
}

/** Rascunho de termo de referência para o órgão revisar e completar. */
export function publicDraftText(result: BuildResult, evaluation: PublicEvaluation) {
  const { input } = result;
  const line = "-".repeat(60);
  const path = evaluation.status === "licitacao" ? "Licitação, em regra pregão eletrônico" : "Dispensa de licitação (Lei 14.133/2021, art. 75, II)";
  return [
    "RASCUNHO DE TERMO DE REFERÊNCIA — REVISAR ANTES DE USAR",
    `Gerado pelo SmartBuild AI em ${new Date().toLocaleDateString("pt-BR")}`,
    line,
    "1. OBJETO",
    `Aquisição de ${evaluation.quantity} computador(es) para uso em ${sectorLabel(input.sector)}.`,
    "",
    "2. JUSTIFICATIVA TÉCNICA",
    ...(result.fit?.justification ?? (input.softwares.length ? [`Softwares que serão usados: ${input.softwares.join(", ")}.`] : [])),
    "[Completar: por que a unidade precisa destes computadores agora.]",
    "",
    "3. ESPECIFICAÇÃO MÍNIMA POR COMPUTADOR (sem indicação de marca)",
    ...evaluation.items.map((item, index) => `${index + 1}. ${item.spec}`),
    "",
    "4. ESTIMATIVA DE DESPESA",
    ...evaluation.items.filter((item) => item.unitPrice > 0).map((item) => `${item.label}: ${brlCents(item.unitPrice)}${item.estimated ? " (estimado, precisa de cotação)" : ""}`),
    `Valor por computador: ${brlCents(evaluation.unitTotal)}`,
    `Valor total (${evaluation.quantity} un.): ${brlCents(evaluation.purchaseTotal)}`,
    `Referência: média de KaBuM!, Pichau e Terabyte, à vista, em ${catalogDateLabel()}. Substituir pela pesquisa formal do órgão.`,
    "",
    "5. FORMA DE CONTRATAÇÃO SUGERIDA",
    path,
    `Gasto anterior informado no ano: ${brlCents(evaluation.spentThisYear)}`,
    `Soma no ano: ${brlCents(evaluation.yearTotal)} · Limite de ${PUBLIC_RULES.year}: ${brlCents(evaluation.limit)}`,
    "",
    "6. PONTOS A CONFERIR",
    ...evaluation.checks.map((check) => `[${check.tone === "warning" ? "ATENÇÃO" : check.tone === "success" ? "OK" : "INFO"}] ${check.label}: ${check.detail}`),
    "",
    "7. GARANTIA, ENTREGA E FORMA DE PAGAMENTO",
    "[Preencher conforme as regras do órgão.]",
    line,
    PUBLIC_DISCLAIMER,
  ].join("\n");
}
