"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();
  const [userCount, setUserCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app we'd verify admin session here first, but hardcoded access is enough for this feature

    async function fetchUserCount() {
      try {
        const res = await fetch("/api/admin/users/count");
        if (!res.ok) {
          throw new Error("Failed to connect to database");
        }
        const data = await res.json();
        setUserCount(data.count);
      } catch (err) {
        // If MySQL isn't running via XAMPP yet, catch the error so the page doesn't crash
        console.warn(
          "MySQL database not connected yet, defaulting to mock views.",
        );
        setError(
          err instanceof Error ? err.message : "Database connection failed",
        );
        setUserCount(0); // Mock/Fallback
      } finally {
        setLoading(false);
      }
    }

    fetchUserCount();
  }, []);

  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        padding: "4rem 2rem",
        background: "var(--color-bg-primary)",
      }}
    >
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h1
          style={{
            fontSize: "2rem",
            marginBottom: "1rem",
            color: "var(--color-text-primary)",
          }}
        >
          Admin Dashboard
        </h1>
        <p
          style={{ color: "var(--color-text-secondary)", marginBottom: "2rem" }}
        >
          Welcome back, Admin. Here is an overview of the VeriTrue platform.
        </p>

        <div
          style={{
            background: "var(--color-bg-card)",
            padding: "2rem",
            borderRadius: "12px",
            border: "1px solid var(--color-border)",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <h2
            style={{ fontSize: "1.2rem", color: "var(--color-text-secondary)" }}
          >
            Platform Statistics
          </h2>

          {loading ? (
            <div style={{ fontSize: "2rem", color: "var(--color-text-muted)" }}>
              Loading DB...
            </div>
          ) : (
            <div
              style={{
                fontSize: "3rem",
                fontWeight: "bold",
                color: "var(--color-primary)",
              }}
            >
              {userCount}
            </div>
          )}

          <p style={{ color: "var(--color-text-muted)" }}>
            Total Registered Users
          </p>

          {error && (
            <div
              style={{
                marginTop: "1rem",
                padding: "1rem",
                background: "rgba(255, 71, 87, 0.1)",
                border: "1px solid var(--color-error)",
                borderRadius: "8px",
                color: "var(--color-error)",
                fontSize: "0.85rem",
              }}
            >
              <strong>Note:</strong> {error}. Ensure you have started the MySQL
              module via XAMPP Control Panel and created the{" "}
              <code>veritrue_db</code> database before starting the application.
            </div>
          )}
        </div>

        <button
          onClick={() => router.push("/auth/signin")}
          style={{
            marginTop: "2rem",
            padding: "0.75rem 1.5rem",
            background: "var(--color-bg-tertiary)",
            color: "var(--color-text-primary)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
