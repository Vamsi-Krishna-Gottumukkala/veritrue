import styles from "../page.module.css";

export default function HowItWorksPage() {
  return (
    <div className={styles.page}>
      <section
        className={styles.howItWorks}
        id="how-it-works"
        style={{ paddingTop: "120px", minHeight: "calc(100vh - 64px)" }}
      >
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>
            How <span className={styles.textPrimary}>VeriTrue</span> Works
          </h2>
          <p className={styles.sectionSubtitle}>
            Advanced forensic technology made simple. Verify content in four
            easy steps.
          </p>

          <div className={styles.stepsGrid}>
            <div className={styles.step}>
              <div className={styles.stepIcon}>
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className={styles.stepNumber}>Step 1</span>
              <h3 className={styles.stepTitle}>Upload Content</h3>
              <p className={styles.stepDescription}>
                Drag and drop text, images, or paste a URL or enter text
                directly.
              </p>
            </div>

            <div className={styles.step}>
              <div className={styles.stepIcon}>
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className={styles.stepNumber}>Step 2</span>
              <h3 className={styles.stepTitle}>AI Analysis</h3>
              <p className={styles.stepDescription}>
                Our multi-modal AI runs forensic checks, fact verification, and
                pattern detection.
              </p>
            </div>

            <div className={styles.step}>
              <div className={`${styles.stepIcon} ${styles.stepIconWarning}`}>
                <svg
                  width="28"
                  height="28"
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
              <span className={styles.stepNumberWarning}>Step 3</span>
              <h3 className={styles.stepTitle}>Get Results</h3>
              <p className={styles.stepDescription}>
                Receive a comprehensive Truth Score with detailed breakdown of
                findings.
              </p>
            </div>

            <div className={styles.step}>
              <div className={styles.stepIcon}>
                <svg
                  width="28"
                  height="28"
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
              <span className={styles.stepNumber}>Step 4</span>
              <h3 className={styles.stepTitle}>Learn & Act</h3>
              <p className={styles.stepDescription}>
                Educational overlays show exactly what was detected and why it
                matters.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
