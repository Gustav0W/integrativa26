"use client";

/**
 * Script inline que roda durante o carregamento do HTML (antes da primeira pintura).
 * No servidor sai como `text/javascript` (o navegador executa); no cliente vira
 * `text/plain`, então o React não reclama de <script> ao hidratar.
 */
export function InlineScript({ html }: { html: string }) {
  return <script type={typeof window === "undefined" ? "text/javascript" : "text/plain"} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} />;
}
