import { ViewTransition } from "react";
import type { ReactNode } from "react";

/**
 * Anima a entrada/saída da página ao navegar (View Transitions API via React).
 * - "nav-forward"/"nav-back": desliza na direção do menu (links com transitionTypes).
 * - sem tipo (botão voltar do navegador): apenas um fade suave.
 * As animações ficam em globals.css.
 */
const DIRECTIONAL = { "nav-forward": "nav-forward", "nav-back": "nav-back", default: "page-fade" };

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={DIRECTIONAL} exit={DIRECTIONAL} default="none">
      {children}
    </ViewTransition>
  );
}
