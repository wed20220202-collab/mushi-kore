import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "むしコレ | 見つけた虫が、わたしの図鑑になる",
  description: "スマートフォンで虫を撮影し、AIで判別して自分だけの昆虫図鑑を育てるWebアプリ",
  applicationName: "むしコレ",
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
      <body className="min-h-full">{children}</body>
    </html>
  );
}
