import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { PreferencesProvider } from "@/components/preferences-provider";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "BUYSOR — Decide what is worth buying",
    template: "%s | BUYSOR",
  },
  description:
    "A personal AI buying advisor for electronics, appliances and power tools. Decide whether to buy, wait or skip with your budget and situation in mind.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('buysor-theme');document.documentElement.dataset.theme=t==='dark'?'dark':'light';document.documentElement.style.colorScheme=t==='dark'?'dark':'light';var l=localStorage.getItem('buysor-language');document.documentElement.lang=l==='ko'?'ko':'en'}catch(e){}` }} /></head>
      <body className="antialiased">
        <PreferencesProvider>
          <AnalyticsTracker />
          {children}
          <Toaster position="bottom-center" richColors />
        </PreferencesProvider>
      </body>
    </html>
  );
}
