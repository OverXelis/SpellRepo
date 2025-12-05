import type { Metadata } from "next";
import { Cinzel_Decorative, Philosopher } from "next/font/google";
import "./globals.css";

const cinzelDecorative = Cinzel_Decorative({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-cinzel",
  display: "swap",
});

const philosopher = Philosopher({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-philosopher",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Spell Circle Database",
  description: "Generate and manage spell circle combinations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cinzelDecorative.variable} ${philosopher.variable}`}>
      <body className="min-h-screen bg-dark-900 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
