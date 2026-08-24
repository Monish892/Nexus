import './globals.css'

export const metadata = { title: 'NEXUS', description: 'Developer intelligence platform' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}
