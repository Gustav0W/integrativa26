import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-canvas text-fg">
        <SiteHeader />
        <main className="relative flex-1">{children}</main>
        <footer className="border-t border-line py-6 text-center text-xs text-subtle">
          SmartBuild AI · Projeto Integrativa · Recomendações geradas por IA com preços estimados de referência
        </footer>
      </body>
    </html>
  );
}
