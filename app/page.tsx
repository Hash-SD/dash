import type { Metadata } from "next"
// import Dashboard from "../dashboard" // Ensure Dashboard is not imported

export const metadata: Metadata = {
  title: "Test Page - Vercel Diagnosis",
  description: "Simplified test page for diagnosing Vercel white screen issue.",
}

export default function HomePage() {
  return (
    <main role="main" aria-label="Test Page Content">
      <div style={{ padding: "20px", backgroundColor: "lightyellow", color: "black", fontSize: "20px", border: "2px solid orange" }}>
        <p>Static Test Content from app/page.tsx</p>
        <p>If you see this, app/page.tsx itself is rendering inside the layout.</p>
      </div>
    </main>
  )
}
