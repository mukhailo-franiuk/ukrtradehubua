
import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = "https://ukrtradehub.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "UkrTradeHub — Український маркетплейс",
    template: "%s | UkrTradeHub",
  },

  description:
    "UkrTradeHub — сучасний український маркетплейс. Купуйте та продавайте електроніку, одяг, товари для дому, авто, красу, спорт, дитячі товари та багато іншого.",

  applicationName: "UkrTradeHub",

  generator: "Next.js",

  keywords: [
    "UkrTradeHub",
    "український маркетплейс",
    "маркетплейс України",
    "купити в Україні",
    "продати в Україні",
    "інтернет-магазин",
    "товари України",
    "купити товари",
    "онлайн покупки",
    "електроніка",
    "одяг",
    "взуття",
    "товари для дому",
    "авто",
    "краса",
    "дитячі товари",
    "спорт",
    "хобі",
  ],

  authors: [
    {
      name: "UkrTradeHub",
      url: SITE_URL,
    },
  ],

  creator: "UkrTradeHub",

  publisher: "UkrTradeHub",

  category: "shopping",

  alternates: {
    canonical: SITE_URL,
  },

  robots: {
    index: true,
    follow: true,

    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  icons: {
    icon: [
      {
        url: "/icon",
        type: "image/png",
        sizes: "32x32",
      },
    ],

    shortcut: ["/icon"],

    apple: [
      {
        url: "/apple-icon",
        type: "image/png",
        sizes: "180x180",
      },
    ],
  },

  openGraph: {
    type: "website",

    locale: "uk_UA",

    url: SITE_URL,

    siteName: "UkrTradeHub",

    title: "UkrTradeHub — Український маркетплейс",

    description:
      "Купуйте та продавайте товари на UkrTradeHub — сучасному українському маркетплейсі.",

    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "UkrTradeHub — Український маркетплейс",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",

    title: "UkrTradeHub — Український маркетплейс",

    description:
      "Сучасний український маркетплейс для покупців і продавців.",

    images: ["/twitter-image"],
  },

  other: {
    "format-detection": "telephone=no",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#080b11",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html 
    lang="uk" 
    suppressHydrationWarning
     data-scroll-behavior="smooth"
    >
      <body className="min-h-screen bg-[#080b11] text-white antialiased">
        {children}
      </body>
    </html>
  );
}