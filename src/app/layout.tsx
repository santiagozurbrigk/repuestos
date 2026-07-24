import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { ToastProvider } from "@/components/ui/toast";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Repuestos - Sistema de Stock",
  description: "Sistema de gestión de stock para casa de repuestos automotriz",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${geist.className} bg-gray-50`}>
        <ToastProvider>
          <Navbar />
          <main className="ml-56 min-h-screen">
            <div className="p-8">{children}</div>
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
