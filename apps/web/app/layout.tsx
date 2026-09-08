import type { Metadata } from "next";
import Header from "@/components/Header";
import "./globals.css";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import SyncManagerInitializer from "@/components/SyncManagerInitializer";
import SyncNotification from "@/components/SyncNotification";

export const metadata: Metadata = {
  title: "Your Golf Buddy",
  description: "Golf score tracking and notes app",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Golf Buddy",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/favicon-192.png", sizes: "192x192", type: "image/png" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Golf Buddy",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const themeColor = "#F97316";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans bg-amber-50 text-slate-950">
        <Header />
        <main className="pt-0">{children}</main>
        <PWAInstallPrompt />
        <SyncManagerInitializer />
        <SyncNotification />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Add manifest link if not present
              if (!document.querySelector('link[rel="manifest"]')) {
                const manifestLink = document.createElement('link');
                manifestLink.rel = 'manifest';
                manifestLink.href = '/manifest.json';
                document.head.appendChild(manifestLink);
              }
              
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered successfully: ', registration);
                      
                      // Check if update is available
                      registration.addEventListener('updatefound', () => {
                        console.log('Service worker update found');
                      });
                      
                      // Check if already controlling
                      if (navigator.serviceWorker.controller) {
                        console.log('Service worker is controlling the page');
                      }
                    })
                    .catch(function(registrationError) {
                      console.error('SW registration failed: ', registrationError);
                    });
                });
              } else {
                console.log('Service worker not supported');
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
