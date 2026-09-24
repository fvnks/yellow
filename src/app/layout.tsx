import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppFooter } from "@/components/app-footer";
import { AppHeader } from "@/components/app-header";
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
  title: {
    default: "Yellow · Facturación electrónica SII",
    template: "%s · Yellow",
  },
  description:
    "Emisión y recepción de documentos tributarios electrónicos (DTE) ante el SII: facturas, notas de crédito y débito, libro de compras y ventas.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-surface font-sans text-ink">
        {/* Anti-flash: aplica el modo oscuro guardado antes del primer
            pintado (claro es el default; oscuro se persiste en localStorage). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{if(localStorage.getItem("yellow-tema")==="oscuro"){document.documentElement.classList.add("dark")}}catch(e){}})();',
          }}
        />
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-navy focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg"
        >
          Saltar al contenido principal
        </a>
        <AppHeader />
        <main id="contenido" className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
          {children}
        </main>
        <AppFooter />
      </body>
    </html>
  );
}
