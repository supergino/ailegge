import './globals.css'

export const metadata = {
  title: 'IusMente — Assistente per lo Studio del Diritto',
  description: 'Assistente virtuale intelligente per studenti di giurisprudenza',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  )
}
