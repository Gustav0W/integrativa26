import type { Metadata } from "next";
import { PageTransition } from "@/components/page-transition";
import { AnalisarClient } from "./analisar-client";

export const metadata: Metadata = {
  title: "Analisar orçamento em PDF",
  description: "Envie um PDF de orçamento ou ficha técnica e a IA diz se a configuração vale a pena.",
};

export default function AnalisarPage() {
  return (
    <PageTransition>
      <AnalisarClient />
    </PageTransition>
  );
}
