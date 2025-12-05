import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="min-h-screen bg-dark-900 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
