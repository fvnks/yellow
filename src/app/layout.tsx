import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import { AppFooter } from "@/components/app-footer";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetBrains = JetBrains_Mono({
  variable: "--font-mono",
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
      className={`${outfit.variable} ${jetBrains.variable} h-full scroll-smooth antialiased`}
    >
      <body className="flex min-h-full flex-col bg-bg font-sans text-ink">
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{if(localStorage.getItem("yellow-tema")==="oscuro"){document.documentElement.classList.add("dark")}}catch(e){}})();',
          }}
        />
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-bg focus:shadow-lg"
        >
          Saltar al contenido principal
        </a>
        <main
          id="contenido"
          className="mx-auto w-full max-w-6xl flex-1 px-6 py-8"
        >
          {children}
        </main>
        <AppFooter />
      </body>
    </html>
  );
}
