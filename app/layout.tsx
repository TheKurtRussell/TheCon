import type { Metadata } from "next";
import { Bangers, Inter } from "next/font/google";
import "./globals.css";

const display = Bangers({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "The CON: Where dating is a little unconventional",
  description:
    "A dating app for gamers, cosplayers and superfans. Match on your fandoms and break the ice with a game.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
