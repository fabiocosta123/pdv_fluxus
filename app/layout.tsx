import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
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
      {/* O h-screen e overflow-hidden impedem que a página role para fora da visão */}
      <body className={`${inter.className} bg-gray-100 h-screen overflow-hidden`}>
        <Toaster richColors position="top-right" /> {/* 2. Adicione aqui */}
        {children}
      </body>
    </html>
  );
}