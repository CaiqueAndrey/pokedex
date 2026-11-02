import type { Metadata, Viewport } from "next";
import { Pixelify_Sans, Press_Start_2P } from "next/font/google";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { messages } from "@/config/messages";
import "./globals.css";

const pixelify = Pixelify_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-pixelify",
  display: "swap",
});

const pressStart = Press_Start_2P({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-press-start",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: messages.appName, template: `%s · ${messages.appName}` },
  description: messages.appDescription,
  applicationName: messages.appName,
  icons: { icon: "/favicon.ico", apple: "/img/pokebola.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f12" },
  ],
};

// Applies a saved theme before first paint to avoid a flash of the wrong theme.
const themeScript = `try{var t=JSON.parse(localStorage.getItem("pokedex:theme:v1"));if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${pixelify.variable} ${pressStart.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-dvh flex-col antialiased">
        <a
          href="#conteudo"
          className="bg-primary-600 text-on-primary sr-only z-50 rounded-xl px-4 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          {messages.nav.skip}
        </a>
        <SiteHeader />
        <main id="conteudo" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
