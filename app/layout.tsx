import type React from "react"
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
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
        url: "https://pbj.divtik.polri.go.id/media/logos/logo-div-tik.png", // Updated OpenGraph image
        width: 1200, // Assuming new image has similar dimensions or adjust as needed
        height: 630,
        alt: "Dashboard TIK Polda Logo",
        type: "image/png",
      },
      // Removed SVG from OpenGraph as new logo is PNG
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@tikpolda",
    creator: "@tikpolda",
    title: "Dashboard TIK Polda - Sistem Manajemen Data Kepolisian",
    description:
      "Dashboard TIK Polda adalah sistem manajemen data terintegrasi untuk kepolisian daerah. Kelola data personel, analisis statistik, dan laporan dengan mudah dan efisien.",
    images: ["https://pbj.divtik.polri.go.id/media/logos/logo-div-tik.png"],
  },
  icons: {
    icon: [
      { url: "https://pbj.divtik.polri.go.id/media/logos/logo-div-tik.png", type: "image/png" },
    ],
    apple: [{ url: "https://pbj.divtik.polri.go.id/media/logos/logo-div-tik.png", sizes: "180x180", type: "image/png" }],
    shortcut: "https://pbj.divtik.polri.go.id/media/logos/logo-div-tik.png",
  },
  manifest: "/manifest.json",
  category: "Government",
  classification: "Government Dashboard",
  generator: "Next.js",
  applicationName: "Dashboard TIK Polda",
  referrer: "origin-when-cross-origin",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
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
        <meta name="msapplication-TileColor" content="#2563eb" /> {/* You might want to update this color if the new logo has a different dominant color */}
        <meta name="msapplication-TileImage" content="https://pbj.divtik.polri.go.id/media/logos/logo-div-tik.png" />
        <meta name="theme-color" content="#2563eb" /> {/* You might want to update this color */}
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
              logo: "https://pbj.divtik.polri.go.id/media/logos/logo-div-tik.png", // Updated LD+JSON logo
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
                  url: "https://dashboard-tik-polda.vercel.app/placeholder-logo.png",
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
