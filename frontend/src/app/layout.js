import './globals.css';

export const metadata = {
  title: 'GERS - Plataforma de Gestión Logística',
  description: 'Plataforma web de gestión, monitoreo y operación logística de GERS',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
