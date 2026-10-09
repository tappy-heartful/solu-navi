import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClientLayout } from "./ClientLayout";

export const metadata: Metadata = {
  title: "Solu Navi | 愛媛大学軽音楽部 Sound Solition Orchestra",
  description: "愛媛大学軽音楽部 Sound Solition Orchestra 活動ポータル",
  icons: {
    icon: "/sso-logo.jpg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
