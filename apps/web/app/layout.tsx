import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SessionProvider } from "@/lib/espace";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "StockTracker", template: "%s · StockTracker" },
  description: "Gestion de stock, factures et achats pour les commerçants.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0b110c" },
  ],
};

// Thème avant le premier affichage : clair par défaut, sombre si choisi, celui de l'appareil si « automatique ».
const scriptTheme = `(function(){var t="clair";try{t=localStorage.getItem("stocktracker.theme")||"clair"}catch(e){}if(t!=="auto")document.documentElement.setAttribute("data-theme",t==="sombre"?"sombre":"clair")})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTheme }} />
      </head>
      <body className="flex min-h-full flex-col">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
