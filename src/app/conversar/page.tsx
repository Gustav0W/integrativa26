import type { Metadata } from "next";
import { ConversarClient } from "./conversar-client";

export const metadata: Metadata = {
  title: "Descreva para a IA",
  description: "Explique com suas palavras o que você faz e quanto quer gastar; a IA sugere o PC.",
};

export default function ConversarPage() {
  return <ConversarClient />;
}
