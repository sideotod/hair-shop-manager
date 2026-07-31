import type { Metadata } from "next";
import localFont from "next/font/local";

import "./globals.css";

const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Hairhaeyo Salon Management",
  description: "헤어해요 미용실 고객·예약·매출 관리 시스템",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={pretendard.variable}>{children}</body>
    </html>
  );
}
