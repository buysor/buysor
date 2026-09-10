import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { PreferencesProvider } from "@/components/preferences-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "BUYSOR — 구매 고민을 끝내는 AI",
    template: "%s | BUYSOR",
  },
  description:
    "사진, 링크, 제품명과 나의 조건을 바탕으로 지금 살지 기다릴지 결정합니다.",
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
    <html lang="ko">
      <body className="antialiased">
        <PreferencesProvider>
          {children}
          <Toaster position="bottom-center" richColors />
        </PreferencesProvider>
      </body>
    </html>
  );
}
