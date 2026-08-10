import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "CVG Treinamento",
  description: "Treinamento veterinário interno do CVG",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <a className="skip-link" href="#main-content">
          Pular para o conteúdo principal
        </a>
        {children}
      </body>
    </html>
  );
}
