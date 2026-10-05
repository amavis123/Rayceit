import type { Metadata } from "next";
import Link from "next/link";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { RaceProvider } from "@/lib/race";
import { RaceBadge } from "@/components/RaceBadge";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RACE IT",
  description: "Drive-through, for any local business.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${archivo.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col bg-startline-white text-track-ink">
          <RaceProvider>
            <header className="flex items-center justify-between px-5 py-4">
              <Link href="/" className="font-display text-lg font-bold tracking-tight">
                RACE IT
              </Link>
              <div className="flex items-center gap-3">
                <Link href="/merchants" className="text-sm font-semibold">
                  Browse
                </Link>
                <RaceBadge />
                <Show when="signed-out">
                  <div className="flex items-center gap-2">
                    <SignInButton>
                      <button className="rounded-full px-4 py-2 text-sm font-semibold text-track-ink">
                        Sign in
                      </button>
                    </SignInButton>
                    <SignUpButton>
                      <button className="rounded-full bg-track-green px-4 py-2 text-sm font-semibold text-track-ink">
                        Sign up
                      </button>
                    </SignUpButton>
                  </div>
                </Show>
                <Show when="signed-in">
                  <UserButton />
                </Show>
              </div>
            </header>
            <main className="flex-1">{children}</main>
          </RaceProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
