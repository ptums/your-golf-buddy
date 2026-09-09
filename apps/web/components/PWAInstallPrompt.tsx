"use client";

import { useState, useEffect } from "react";

export default function PWAInstallPrompt() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Show the install prompt
      setShowInstallPrompt(true);
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      console.log("PWA was installed");
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    // Add event listeners
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setShowInstallPrompt(false);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
    } else {
      console.log("User dismissed the install prompt");
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  if (!showInstallPrompt) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-full max-w-[400px] -translate-x-1/2 px-4">
      <div className="bs-box p-4">
        <p className="font-serif text-[17px] font-semibold">Install Your Golf Buddy</p>
        <p className="bs-note mb-3 mt-1 text-[13px]">
          Add it to your home screen — it runs offline like a normal app.
        </p>
        <div className="flex gap-[10px]">
          <button
            onClick={() => setShowInstallPrompt(false)}
            className="bs-key h-11 min-h-0 flex-1 text-[14px]"
          >
            Not now
          </button>
          <button
            onClick={handleInstallClick}
            className="bs-key bs-key-ink h-11 min-h-0 flex-1 text-[14px]"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
