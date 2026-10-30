import type { Metadata } from "next";
import { MontarClient } from "./montar-client";

export const metadata: Metadata = {
  title: "Monte você mesmo",
  description: "Escolha peça por peça e veja em tempo real a compatibilidade e a adequação ao seu uso.",
};

export default function MontarPage() {
  return <MontarClient />;
}
