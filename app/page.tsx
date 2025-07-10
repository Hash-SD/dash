import type { Metadata } from "next"
import DashboardClient from "./dashboard-client" // Import the new client component

export const metadata: Metadata = {
  title: "Dashboard TIK Polda - Beranda",
  description:
    "Halaman utama Dashboard TIK Polda untuk manajemen data kepolisian daerah. Akses fitur input data, analisis statistik, dan laporan terintegrasi.",
  openGraph: {
    title: "Dashboard TIK Polda - Beranda",
    description:
      "Halaman utama Dashboard TIK Polda untuk manajemen data kepolisian daerah. Akses fitur input data, analisis statistik, dan laporan terintegrasi.",
    url: "https://dashboard-tik-polda.vercel.app/",
    images: ["/placeholder-logo.png"], 
  },
}

export default function HomePage() {
  return (
    <main role="main" aria-label="Dashboard TIK Polda">
      <h1 className="sr-only">
        Dashboard TIK Polda - Sistem Manajemen Data Kepolisian
      </h1>
      <DashboardClient />
    </main>
  )
}
