import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'gary-travel-site',
  description: 'Next.js App Router starter with Tailwind CSS.'
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
