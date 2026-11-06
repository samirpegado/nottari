import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Nottari",
    template: "%s · Nottari",
  },
  description: "Plataforma de gestão musical para o professor solo ou a escola com um professor.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={cn("font-sans", sans.variable)}>
      <body className="min-h-svh antialiased">{children}</body>
    </html>
  );
}
