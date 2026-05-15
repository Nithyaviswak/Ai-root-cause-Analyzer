import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './tailwind.css';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'AI SRE Copilot — Real-Time Incident Debugging Platform',
  description:
    'Production-grade AI SRE assistant for real-time root cause analysis. Analyzes logs, metrics, traces, and voice input to debug production incidents.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
