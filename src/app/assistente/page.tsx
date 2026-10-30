import type { Metadata } from "next";
import { PageTransition } from "@/components/page-transition";
import { AssistenteClient } from "./assistente-client";

export const metadata: Metadata = {
  title: "Assistente guiado",
  description: "Informe orçamento e usos do PC e receba uma configuração completa e compatível.",
};

export default function AssistentePage() {
  return (
    <PageTransition>
      <AssistenteClient />
    </PageTransition>
  );
}
