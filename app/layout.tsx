import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_KR, Marcellus } from "next/font/google";
import localFont from "next/font/local";

import "./globals.css";

const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

const marcellus = Marcellus({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-marcellus",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

const plexSansKr = IBM_Plex_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-kr",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
  fallback: ["Consolas", "monospace"],
});

const fontVariables = [pretendard, marcellus, plexSansKr, plexMono].map((font) => font.variable).join(" ");

export const metadata: Metadata = {
  title: "Hairhaeyo",
  description: "헤어해요 미용실 고객·예약·매출 관리 시스템",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={fontVariables}>{children}</body>
    </html>
  );
}
