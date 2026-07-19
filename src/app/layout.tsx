import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";

// Par de tipografia deliberado (skill frontend-design): Fraunces carrega a
// personalidade nos momentos de ritual (títulos, "Ritual da Semana"), Geist
// Sans fica neutro no uso diário (não pode competir por atenção — é onde a
// regra de baixo atrito vale mais), Geist Mono dá precisão aos números
// (duração, fração de progresso, streak de hábito).
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
});

export const metadata: Metadata = {
  title: "Aura Alfa",
  description: "Planejamento em cascata: ano, mês, semana e dia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
