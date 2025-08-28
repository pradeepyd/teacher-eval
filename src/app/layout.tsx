import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Footer from "@/components/Footer";
import { Toaster } from "@/components/ui/sonner";
import { PageErrorBoundary } from "@/components/ErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MCQ Teacher Evaluation System",
  description: "A comprehensive teacher evaluation system with role-based access",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
                      >
                  <Providers session={undefined}>
                    <PageErrorBoundary pageName="Application Root">
                      <main className="flex-1 pb-10">
                        {children}
                      </main>
                      <Footer />
                    </PageErrorBoundary>
                    <Toaster />
                  </Providers>
                </body>
    </html>
  );
}
