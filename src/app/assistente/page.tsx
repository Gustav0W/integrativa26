import type { Metadata } from "next";
import { AssistenteClient } from "./assistente-client";

export const metadata: Metadata = {
  title: "Assistente guiado",
  description: "Informe orçamento e usos do PC e receba uma configuração completa e compatível.",
};

export default function AssistentePage() {
  return <AssistenteClient />;
}
