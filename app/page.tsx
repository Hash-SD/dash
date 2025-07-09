import type { Metadata } from "next"
import Dashboard from "../dashboard"

export const metadata: Metadata = {
  title: "Dashboard TIK Polda - Beranda",
  description:
    "Halaman utama Dashboard TIK Polda untuk manajemen data kepolisian daerah. Akses fitur input data, analisis statistik, dan laporan terintegrasi.",
  openGraph: {
    title: "Dashboard TIK Polda - Beranda",
    description:
      "Halaman utama Dashboard TIK Polda untuk manajemen data kepolisian daerah. Akses fitur input data, analisis statistik, dan laporan terintegrasi.",
    url: "https://dashboard-tik-polda.vercel.app/",
    images: ["/placeholder-logo.png"], // Note: This is a placeholder, might need updating later if a specific page OG image is desired. The layout provides a default.
  },
}

export default function HomePage() {
  return (
    <main role="main" aria-label="Dashboard TIK Polda">
      <h1 className="sr-only">Dashboard TIK Polda - Sistem Manajemen Data Kepolisian</h1>
      <Dashboard />
    </main>
  )
}
