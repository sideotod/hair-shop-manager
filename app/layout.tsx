import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Hairhaeyo Salon Management",
  description: "헤어해요 미용실 고객·예약·매출 관리 시스템",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
