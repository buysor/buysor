import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { PreferencesProvider } from "@/components/preferences-provider";
import { CurrencyPricingProvider } from "@/components/currency-pricing";
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
    <html lang="en" data-theme="light" style={{ colorScheme: "light" }} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: `try{var t=sessionStorage.getItem('buysor-visit-theme-v1');document.documentElement.dataset.theme=t==='dark'?'dark':'light';document.documentElement.style.colorScheme=t==='dark'?'dark':'light';var l=sessionStorage.getItem('buysor-visit-language-v1');document.documentElement.lang=l==='ko'?'ko':'en'}catch(e){}` }} /></head>
      <body className="antialiased">
        <PreferencesProvider>
          <CurrencyPricingProvider>
          <AnalyticsTracker />
          {children}
          <Toaster position="bottom-center" richColors />
          </CurrencyPricingProvider>
        </PreferencesProvider>
      </body>
    </html>
  );
}
