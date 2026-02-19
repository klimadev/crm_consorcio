import type { Metadata } from "next";
import "./globals.css";
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: "MC I CRM",
  description: "CRM Completo para MC Investimentos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning={true}>
      <body className="font-sans antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
