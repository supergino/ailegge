// app/layout.js
export const metadata = {
  title: 'IusValidatore AI',
  description: 'Verifica normativa per il Diritto Italiano',
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>
        {children}
      </body>
    </html>
  );
}