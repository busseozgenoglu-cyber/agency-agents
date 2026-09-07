import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Buse’nin Ajansı · Yapay Zekâ Stüdyosu',
  description:
    'Kendi yapay zekâ ekibini kur, birlikte fikir geliştir ve projelerini Buse’nin Ajansı ile hayata hazırla.',
  icons: { icon: '/favicon.svg' },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
