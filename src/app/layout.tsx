import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
});

const siteUrl = process.env.APP_BASE_URL ?? "https://mushi-kore.vercel.app";
const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "むしコレ | 写真で虫をAI判定", template: "%s | むしコレ" },
  description: "スマートフォンで虫を撮影し、AIで種類の候補や特徴を調べられる無料Webアプリ。ログインすると自分だけの昆虫図鑑も作れます。",
  applicationName: "むしコレ",
  alternates: { canonical: "/" },
  openGraph: { title: "むしコレ | 写真で虫をAI判定", description: "撮る。知る。集める。無料で試せる昆虫AI判定Webアプリ。", url: "/", siteName: "むしコレ", locale: "ja_JP", type: "website" },
  robots: { index: true, follow: true },
  ...(adsenseClient ? { other: { "google-adsense-account": adsenseClient } } : {}),
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "むしコレ", statusBarStyle: "black-translucent" },
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
