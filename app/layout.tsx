import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "../components/WalletProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wallet Chat",
  description: "Chat with Solana wallets",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
   <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
  <head>
    <link rel="icon" href="/icon.svg" />
    <link rel="apple-touch-icon" href="/icon.svg" />
  </head>
  <body className="min-h-full flex flex-col">
    <Providers>
      {children}
    </Providers>
  </body>
</html>
  );
}
