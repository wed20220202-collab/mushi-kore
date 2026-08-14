import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const notoSans = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
});

const siteUrl = getSiteUrl();
const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "むしコレ＋ | むし・魚・花・動物をAI判定", template: "%s | むしコレ＋" },
  description: "スマートフォンで昆虫・魚・花・動物を撮影し、AIで種類の候補や特徴を調べてカテゴリ別の図鑑を作れるWebアプリ。",
  applicationName: "むしコレ＋",
  alternates: { canonical: "/" },
  openGraph: { title: "むしコレ＋ | 写真で自然をAI判定", description: "むし・魚・花・動物を、撮る。知る。集める。AIと育てる自然図鑑Webアプリ。", url: "/", siteName: "むしコレ＋", locale: "ja_JP", type: "website" },
  robots: { index: true, follow: true },
  ...(adsenseClient ? { other: { "google-adsense-account": adsenseClient } } : {}),
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "むしコレ＋", statusBarStyle: "black-translucent" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${notoSans.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {children}
      </body>
    </html>
  );
}
