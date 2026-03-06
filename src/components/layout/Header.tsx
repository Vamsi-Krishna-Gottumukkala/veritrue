"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./Header.module.css";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setIsAuthenticated(data.authenticated);
        } else {
          setIsAuthenticated(false);
        }
      } catch (err) {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [pathname]); // Re-check on route change

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    setIsAuthenticated(false);
    sessionStorage.removeItem("auth_token");
    router.push("/");
    router.refresh();
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2L3 7V17L12 22L21 17V7L12 2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M9 12L11 14L15 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className={styles.logoText}>
            <span className={styles.logoVeri}>Veri</span>
            <span className={styles.logoTrue}>True</span>
          </span>
        </Link>

        <nav className={styles.nav}>
          {/* Always show these links */}
          <Link
            href="/how-it-works"
            className={`${styles.navLink} ${pathname === "/how-it-works" ? styles.active : ""}`}
          >
            How It Works
          </Link>
          <Link href="/api-docs" className={styles.navLink}>
            API
          </Link>
          <Link
            href="/pricing"
            className={`${styles.navLink} ${pathname === "/pricing" ? styles.active : ""}`}
          >
            Pricing
          </Link>

          {/* Conditional Auth Links */}
          {!isLoading && (
            <>
              {isAuthenticated ? (
                <>
                  <Link
                    href="/upload"
                    className={`${styles.navLink} ${pathname === "/upload" ? styles.active : ""}`}
                  >
                    Upload
                  </Link>
                  <Link
                    href="/history"
                    className={`${styles.navLink} ${pathname === "/history" ? styles.active : ""}`}
                  >
                    History
                  </Link>
                  <button onClick={handleSignOut} className={styles.signInBtn}>
                    Sign Out
                  </button>
                </>
              ) : (
                <Link href="/auth/signin" className={styles.signInBtn}>
                  Sign In
                </Link>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
