import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { RedirectionMobile } from "@/components/redirection-mobile";
import { SessionProvider } from "@/lib/espace";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "FacturePlus", template: "%s · FacturePlus" },
  description: "Gestion de stock, factures et achats pour les commerçants.",
};

export const viewport: Viewport = {
  // Téléphone : contenu jusqu'aux bords (barre d'onglets au-dessus de la barre d'accueil de l'iPhone)
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0b110c" },
  ],
};

// Thème avant le premier affichage : clair par défaut, sombre si choisi, celui de l'appareil si « automatique ».
const scriptTheme = `(function(){var t="clair";try{t=localStorage.getItem("factureplus.theme")||"clair"}catch(e){}if(t!=="auto")document.documentElement.setAttribute("data-theme",t==="sombre"?"sombre":"clair")})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTheme }} />
      </head>
      <body className="flex min-h-full flex-col">
        <RedirectionMobile />
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
