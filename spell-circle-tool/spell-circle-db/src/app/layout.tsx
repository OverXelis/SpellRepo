import type { Metadata } from "next";
import { Cinzel_Decorative, Philosopher, Rock_Salt } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "@/components/ui/toast";

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

const rockSalt = Rock_Salt({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-rocksalt",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Spell Circle Database",
  description: "Craft and catalog your arcane spell circle combinations. Generate, organize, and manage your magical grimoire.",
  keywords: ["spell", "magic", "grimoire", "runes", "spellbook", "database"],
  authors: [{ name: "Arcane Craftsman" }],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
  openGraph: {
    title: "Spell Circle Database",
    description: "Craft and catalog your arcane spell circle combinations",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cinzelDecorative.variable} ${philosopher.variable} ${rockSalt.variable}`}>
      <body className="min-h-screen bg-dark-900 text-slate-100 antialiased">
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
