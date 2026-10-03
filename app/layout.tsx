import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { AccessGate } from "./components/AccessGate";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fluxus PDV - Frente de Caixa",
  description: "Sistema de ponto de venda moderno",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      {/* O h-screen e overflow-hidden impedem que a página role para fora da visão */}
      <body className={`${inter.className} bg-gray-100 min-h-screen overflow-y-auto`}>
        <Toaster richColors position="top-right" />
        <AccessGate>{children}</AccessGate>
      </body>
    </html>
  );
}