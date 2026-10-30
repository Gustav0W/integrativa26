import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { InlineScript } from "@/components/inline-script";
import { SiteHeader } from "@/components/site-header";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import "./globals.css";

/** Títulos: Archivo com eixo de largura (usada expandida). */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "SmartBuild AI — Monte o PC ideal com IA",
    template: "%s · SmartBuild AI",
  },
  description: "Recomendações de builds de PC compatíveis, sem gargalos e dentro do orçamento.",
};

/** Aplica o tema salvo antes da primeira pintura (evita piscar claro → escuro). */
const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      data-theme="light"
      suppressHydrationWarning
      className={`${archivo.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <head>
        <InlineScript html={themeScript} />
      </head>
      <body className="flex min-h-full flex-col text-fg">
        <SiteHeader />
        <main className="relative flex-1">{children}</main>
        <footer className="border-t border-line bg-canvas">
          <div className="label-mono mx-auto flex max-w-7xl flex-col gap-1 px-4 py-5 text-subtle sm:flex-row sm:justify-between sm:px-6">
            <span>SmartBuild/AI — Projeto Integrativa</span>
            <span>Preços estimados de referência · Rev. 2026</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
