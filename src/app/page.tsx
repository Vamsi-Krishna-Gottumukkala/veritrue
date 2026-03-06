import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroIcon}>
            <svg
              width="48"
              height="48"
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
          <h1 className={styles.heroTitle}>
            <span className={styles.heroVeri}>Veri</span>
            <span className={styles.heroTrue}>True</span>
          </h1>
          <p className={styles.heroSubtitle}>
            AI-Powered Media Verification Platform
          </p>
          <p className={styles.heroDescription}>
            Detect fake news and manipulated images with advanced forensic
            analysis and machine learning technology
          </p>
          <div className={styles.heroCTA}>
            <Link href="/upload" className={styles.btnPrimary}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Start Analysis
            </Link>
            <Link href="/how-it-works" className={styles.btnSecondary}>
              View Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features} id="features">
        <div className={styles.container}>
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className={styles.featureTitle}>Fake News Detection</h3>
              <p className={styles.featureDescription}>
                Cross-reference claims with fact-checking databases and analyze
                linguistic patterns to identify misinformation
              </p>
            </div>

            <div className={styles.featureCard}>
              <div
                className={`${styles.featureIcon} ${styles.featureIconWarning}`}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className={styles.featureTitle}>Image Forensics</h3>
              <p className={styles.featureDescription}>
                Error Level Analysis, metadata inspection, and AI artifact
                detection to spot manipulated or generated images
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
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
                  <path d="M12 22V12" stroke="currentColor" strokeWidth="2" />
                  <path d="M12 12L3 7" stroke="currentColor" strokeWidth="2" />
                  <path d="M12 12L21 7" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <h3 className={styles.featureTitle}>Source Verification</h3>
              <p className={styles.featureDescription}>
                Verify claims against trusted sources and databases to provide
                credibility scores and evidence
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={styles.stats}>
        <div className={styles.container}>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>98.7%</span>
              <span className={styles.statLabel}>Accuracy Rate</span>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>5M+</span>
              <span className={styles.statLabel}>Verifications</span>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>&lt;30s</span>
              <span className={styles.statLabel}>Avg Analysis Time</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
