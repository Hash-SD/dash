import type React from "react"
import type { Metadata, Viewport } from "next" 
import "./globals.css"

const newLogoUrl = "https://cdn-1.timesmedia.co.id/images/2022/03/24/tik-polri.jpg";

export const metadata: Metadata = {
  metadataBase: new URL("https://dashboard-tik-polda.vercel.app"), 
  title: "Dashboard TIK Polda - Sistem Manajemen Data Kepolisian",
  description:
    "Dashboard TIK Polda adalah sistem manajemen data terintegrasi untuk kepolisian daerah. Kelola data personel, analisis statistik, dan laporan dengan mudah dan efisien.",
  keywords: [
    "Dashboard TIK Polda",
    "Sistem Manajemen Polda",
    "Data Kepolisian",
    "Analisis Data Polisi",
    "Manajemen Personel",
    "Dashboard Kepolisian",
    "TIK Polda",
    "Sistem Informasi Polisi",
  ],
  authors: [{ name: "TIK Polda Development Team" }],
  creator: "TIK Polda",
  publisher: "Kepolisian Daerah",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://dashboard-tik-polda.vercel.app",
    siteName: "Dashboard TIK Polda",
    title: "Dashboard TIK Polda - Sistem Manajemen Data Kepolisian",
    description:
      "Dashboard TIK Polda adalah sistem manajemen data terintegrasi untuk kepolisian daerah. Kelola data personel, analisis statistik, dan laporan dengan mudah dan efisien.",
    images: [
      {
        url: newLogoUrl, 
        width: 1200, 
        height: 630,
        alt: "Dashboard TIK Polda Logo",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@tikpolda",
    creator: "@tikpolda",
    title: "Dashboard TIK Polda - Sistem Manajemen Data Kepolisian",
    description:
      "Dashboard TIK Polda adalah sistem manajemen data terintegrasi untuk kepolisian daerah. Kelola data personel, analisis statistik, dan laporan dengan mudah dan efisien.",
    images: [newLogoUrl],
  },
  icons: {
    icon: [
      { url: newLogoUrl, type: "image/png" },
    ],
    apple: [{ url: newLogoUrl, sizes: "180x180", type: "image/png" }],
    shortcut: newLogoUrl,
  },
  manifest: "/manifest.json",
  category: "Government",
  classification: "Government Dashboard",
  generator: "Next.js",
  applicationName: "Dashboard TIK Polda",
  referrer: "origin-when-cross-origin",
  verification: {
    google: "your-google-verification-code",
    yandex: "your-yandex-verification-code",
  },
  alternates: {
    canonical: "https://dashboard-tik-polda.vercel.app",
    languages: {
      "id-ID": "https://dashboard-tik-polda.vercel.app",
      "en-US": "https://dashboard-tik-polda.vercel.app/en",
    },
  },
}

export const viewport: Viewport = { 
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://sheets.googleapis.com" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Dashboard TIK Polda" />
        <meta name="application-name" content="Dashboard TIK Polda" />
        <meta name="msapplication-TileColor" content="#2563eb" /> 
        <meta name="msapplication-TileImage" content={newLogoUrl} />
        {/* theme-color is handled by viewport export, this direct meta might be redundant but often kept for wider compatibility */}
        {/* <meta name="theme-color" content="#2563eb" /> */} 
        <link rel="canonical" href="https://dashboard-tik-polda.vercel.app" />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Dashboard TIK Polda",
              description:
                "Dashboard TIK Polda adalah sistem manajemen data terintegrasi untuk kepolisian daerah. Kelola data personel, analisis statistik, dan laporan dengan mudah dan efisien.",
              url: "https://dashboard-tik-polda.vercel.app",
              logo: newLogoUrl, 
              applicationCategory: "GovernmentApplication",
              operatingSystem: "Web Browser",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "IDR",
              },
              creator: {
                "@type": "Organization",
                name: "TIK Polda",
                description: "Tim Teknologi Informasi dan Komunikasi Kepolisian Daerah",
              },
              publisher: {
                "@type": "Organization",
                name: "Kepolisian Daerah",
                logo: {
                  "@type": "ImageObject",
                  url: "https://dashboard-tik-polda.vercel.app/placeholder-logo.png", // This one seems to be a different placeholder, leaving as is.
                },
              },
              inLanguage: "id-ID",
              isAccessibleForFree: true,
              browserRequirements: "Requires JavaScript. Requires HTML5.",
            }),
          }}
        />
        {children}
      </body>
    </html>
  )
}
