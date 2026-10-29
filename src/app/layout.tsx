/* eslint-disable react/react-in-jsx-scope */
// eslint-disable-next-line import/no-unassigned-import
import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata } from "next";
import { Providers } from "./providers";

// eslint-disable-next-line new-cap
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// eslint-disable-next-line new-cap
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// eslint-disable-next-line import/no-named-export
export const metadata: Metadata = {
  title: "MC CRM Consórcio",
  description: "CRM multi-tenant para vendas de consórcios",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
