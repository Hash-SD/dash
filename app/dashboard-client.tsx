"use client"

import dynamic from "next/dynamic"

const Dashboard = dynamic(() => import("../dashboard"), {
  ssr: false,
  loading: () => <p>Loading...</p>,
})

export default function DashboardClient() {
  return <Dashboard />
}
