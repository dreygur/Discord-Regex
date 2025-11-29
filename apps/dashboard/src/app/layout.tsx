import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/providers/AuthProvider";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/shared/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"]
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
});

export const metadata: Metadata = {
  title: "Discord Bot Dashboard",
  description: "Discord Bot Dashboard"
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <header className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-center py-4 shadow-lg">
            <h1 className="text-2xl md:text-3xl font-bold text-black tracking-wide">
              cpStacks (Copy Stacks) Trading Discord Bot
            </h1>
          </header>
          <Navbar />
          {children}
        </AuthProvider>
        <Toaster
          toastOptions={{
            success: {
              style: {
                background: "#282b30",
                border: "1px solid #424549",
                color: "#7289da"
              }
            },
            error: {
              style: {
                background: "#282b30",
                border: "1px solid #e7000b",
                color: "#e7000b"
              }
            }
          }}
        />
      </body>
    </html>
  );
}
