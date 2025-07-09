import type React from "react"
// We are not importing Metadata or Viewport types for this minimal test
// to reduce potential points of failure.
import "./globals.css"

// Minimal metadata for testing
export const metadata = {
  title: "Minimal Layout Test - Vercel Diag",
  description: "Minimal layout to diagnose Vercel white screen.",
};

// Viewport export is temporarily removed for this test.
// export const viewport = {};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id">
      <head>
        <meta charSet="utf-8" />
        {/* Using a very basic viewport meta tag directly */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* The title tag here will be overridden by metadata.title if Next.js processes it */}
        <title>Direct Title Test</title>
      </head>
      <body>
        <div style={{ border: "5px solid green", padding: "15px", margin: "15px", backgroundColor: "lightgreen" }}>
          <h1>LAYOUT SHELL VISIBLE (TEST)</h1>
          <p>If you see this, the basic layout.tsx structure is rendering.</p>
          {children}
        </div>
      </body>
    </html>
  )
}
