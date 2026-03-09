import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "toreply.me — IA Conversacional para qualquer sistema",
  description: "Conecte sua IA ao WhatsApp e Web em minutos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${geist.variable} font-sans antialiased`}>
        <AuthProvider>
          <TenantProvider>
            {children}
            <Toaster richColors position="top-right" />
          </TenantProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
