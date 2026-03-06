"use client";

import { useState, useEffect } from "react";
import styles from "./page.module.css";
import Link from "next/link";

interface HistoryRecord {
  id: number;
  content_type: "text" | "image" | "video" | "url";
  content_preview: string;
  truth_score: number;
  verdict: string;
  created_at: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch("/api/history");
        if (!res.ok) {
          throw new Error("Failed to load history");
        }
        const data = await res.json();
        setHistory(data.history || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 70) return "#10B981"; // Emerald
    if (score >= 40) return "#F59E0B"; // Amber
    return "#EF4444"; // Red
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "text":
        return "📝";
      case "image":
        return "🖼️";
      case "video":
        return "🎥";
      case "url":
        return "🔗";
      default:
        return "📄";
    }
  };

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>Loading your verification history...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.container}>
          <h1 className={styles.title}>Your Verification History</h1>
          <p className={styles.subtitle}>
            Review past analyses of text, images, and videos.
          </p>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.container}>
          {error && (
            <div className={styles.errorBox}>
              <p>⚠️ {error}</p>
              <button
                onClick={() => window.location.reload()}
                className={styles.retryBtn}
              >
                Try Again
              </button>
            </div>
          )}

          {!error && history.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🔍</div>
              <h2>No History Found</h2>
              <p>You haven&apos;t verified any content yet.</p>
              <Link href="/upload" className={styles.actionBtn}>
                VeriTrue Your First File
              </Link>
            </div>
          ) : (
            <div className={styles.historyList}>
              {history.map((record) => (
                <div key={record.id} className={styles.historyCard}>
                  <div className={styles.cardHeader}>
                    <div className={styles.typeBadge}>
                      {getIcon(record.content_type)}
                      <span className={styles.typeText}>
                        {record.content_type.toUpperCase()}
                      </span>
                    </div>
                    <time className={styles.date}>
                      {new Date(record.created_at).toLocaleDateString(
                        undefined,
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </time>
                  </div>

                  <div className={styles.cardBody}>
                    <p className={styles.preview}>
                      {record.content_preview.length > 150
                        ? record.content_preview.substring(0, 150) + "..."
                        : record.content_preview}
                    </p>
                  </div>

                  <div className={styles.cardFooter}>
                    <div className={styles.scoreWrapper}>
                      <span className={styles.scoreLabel}>Truth Score</span>
                      <div
                        className={styles.scoreValue}
                        style={{ color: getScoreColor(record.truth_score) }}
                      >
                        {record.truth_score}%
                      </div>
                    </div>
                    <div
                      className={styles.verdictBadge}
                      style={{
                        backgroundColor: `${getScoreColor(record.truth_score)}15`,
                        color: getScoreColor(record.truth_score),
                        border: `1px solid ${getScoreColor(record.truth_score)}40`,
                      }}
                    >
                      {record.verdict}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
