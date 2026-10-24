import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Receipts",
  description: "Evidence-based replies to card disputes, with a free preview before you pay.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="no-print border-b border-black/10 dark:border-white/15">
          <nav className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-lg font-semibold">
              Receipts
            </Link>
            <div className="flex gap-5 text-sm">
              <Link href="/start" className="hover:underline">
                Start a reply
              </Link>
              <Link href="/trail" className="hover:underline">
                Trail
              </Link>
            </div>
          </nav>
        </header>
        <div className="flex-1">{children}</div>
        <footer className="no-print border-t border-black/10 px-6 py-6 text-center text-xs opacity-60 dark:border-white/15">
          Receipts writes dispute replies. It is not a law firm and does not file disputes for you.
        </footer>
      </body>
    </html>
  );
}
