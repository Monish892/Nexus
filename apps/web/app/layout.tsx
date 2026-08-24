import './globals.css'

export const metadata = { 
  title: 'NEXUS — AI Developer Intelligence Platform', 
  description: 'Evidence-based developer intelligence, skill graphs, career engineering, and AI-powered career tools.' 
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body>{children}</body>
    </html>
  )
}
