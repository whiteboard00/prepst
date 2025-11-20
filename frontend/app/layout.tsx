import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { QueryProvider } from "@/contexts/QueryProvider";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import { BadgeRemover } from "@/components/BadgeRemover";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Prep St",
  description: "AI-powered personalized SAT practice",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function removeBadge() {
                  const badge = document.querySelector("#emergent-badge");
                  if (badge) {
                    badge.remove();
                  }
                }
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', removeBadge);
                } else {
                  removeBadge();
                }
                // Also check periodically in case it's added dynamically
                setInterval(removeBadge, 100);
              })();
            `,
          }}
        />
        <BadgeRemover />
        <QueryProvider>
          <ThemeProvider>
            <AuthProvider>
              {children}
              <Toaster position="top-right" richColors />
              <Analytics />
            </AuthProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
