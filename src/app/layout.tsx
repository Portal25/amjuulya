import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/components/providers/AuthProvider';
import BottomNav from '@/components/layout/BottomNav';

export const metadata: Metadata = {
  title: 'Амжуулъя | Даалгаврын Зах Зээл',
  description: 'Өдөр тутмын ажлаа хялбархан хийлгэж, орлого олоорой',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Амжуулъя' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#4CAF50',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="mn" suppressHydrationWarning>
      <body className={`antialiased bg-surface`}>
        <AuthProvider>
          <main className="min-h-screen max-w-md mx-auto relative bg-white shadow-sm">
            {children}
          </main>
          <BottomNav />
        </AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#1a1a1a',
              color: '#fff',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '14px',
              maxWidth: '360px',
            },
            success: { iconTheme: { primary: '#4CAF50', secondary: '#fff' } },
            error: { iconTheme: { primary: '#F44336', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  );
}
