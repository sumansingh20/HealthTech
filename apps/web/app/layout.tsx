import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI ICU Monitoring System',
  description: 'AI-based remote ICU patient monitoring and decision support platform'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
