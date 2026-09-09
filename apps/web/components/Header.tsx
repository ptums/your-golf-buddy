"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import OfflineStatus from "./OfflineStatus";

const NAV = [
  { href: "/games", label: "Rounds" },
  { href: "/swing-tips", label: "Swing tips" },
  { href: "/practice-drills", label: "Practice drills" },
  { href: "/settings", label: "Settings" },
];

const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [username, setUsername] = useState("");

  useEffect(() => {
    try {
      setUsername(localStorage.getItem("golf_buddy_username") ?? "");
    } catch {
      /* private mode */
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (path: string) => {
    setIsMenuOpen(false);
    router.push(path);
  };

  return (
    <header className="sticky top-0 z-50 mx-auto flex w-full max-w-[430px] items-center justify-between gap-2 bg-[var(--bs-bg)] px-5 py-[7px]">
      <button
        onClick={() => router.back()}
        className="bs-key h-11 min-h-0 w-11 !gap-0 text-[17px]"
        aria-label="Go back"
      >
        ‹
      </button>

      <Link
        href="/games"
        className="bs-rail bs-rail-ink truncate no-underline"
        style={{ color: "var(--bs-ink)" }}
      >
        Your Golf Buddy
      </Link>

      <div className="flex items-center gap-2">
        <OfflineStatus />
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen((v) => !v)}
            className="bs-key h-11 min-h-0 w-11 !gap-0 text-[18px]"
            aria-label="Menu"
            aria-expanded={isMenuOpen}
            aria-haspopup="true"
          >
            ≡
          </button>

          {isMenuOpen && (
            <div className="bs-box absolute right-0 top-full z-50 mt-2 w-56 p-2">
              <div className="flex flex-col gap-2">
                {NAV.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => go(item.href)}
                    aria-current={
                      pathname?.startsWith(item.href) ? "page" : undefined
                    }
                    className={`bs-key h-11 min-h-0 justify-start px-3 text-[15px] ${
                      pathname?.startsWith(item.href) ? "bs-key-on" : ""
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
                {username && (
                  <p className="bs-rail px-2 pt-1">{username}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
