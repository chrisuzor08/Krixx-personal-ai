import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Sora } from "next/font/google";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/toast";
import "./globals.css";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-jb", display: "swap" });

export const metadata: Metadata = {
  title: { default: "KRiXX AI — Build. Train. Connect. Automate. Deploy.", template: "%s · KRiXX AI" },
  description: "Create intelligent AI agents, connect your knowledge, automate workflows, and deploy everywhere — without writing a single line of code.",
};

export const viewport: Viewport = { themeColor: "#08090D", width: "device-width", initialScale: 1 };

const themeScript = `try{var t=localStorage.getItem('krixx-theme');if(t!=='light')document.documentElement.classList.add('dark')}catch(e){document.documentElement.classList.add('dark')}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
