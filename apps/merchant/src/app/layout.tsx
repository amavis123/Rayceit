import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RACE IT for Merchants",
  description: "Order queue and live customer ETA, built for the counter.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col bg-surface-white text-track-ink">
          <header className="flex items-center justify-between border-b border-checkpoint-grey/20 px-5 py-4">
            <span className="text-lg font-bold tracking-tight">
              RACE IT · Merchant
            </span>
            <Show when="signed-out">
              <div className="flex items-center gap-2">
                <SignInButton>
                  <button className="rounded-sm px-4 py-2 text-sm font-semibold text-track-ink">
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton>
                  <button className="rounded-sm bg-track-green px-4 py-2 text-sm font-semibold text-track-ink">
                    Sign up
                  </button>
                </SignUpButton>
              </div>
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </header>
          <main className="flex-1">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
