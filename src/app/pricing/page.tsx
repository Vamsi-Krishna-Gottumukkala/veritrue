import Link from "next/link";
import styles from "./page.module.css";

export const metadata = {
  title: "Pricing - VeriTrue",
  description:
    "Choose your verification plan. Start with our free tier or unlock advanced features for professional use.",
};

export default function PricingPage() {
  return (
    <div className={styles.page}>
      <section className={styles.heroSection}>
        <h1 className={styles.title}>
          Choose Your{" "}
          <span className={styles.textPrimary}>Verification Plan</span>
        </h1>
        <p className={styles.subtitle}>
          Start with our free tier or unlock advanced features for professional
          use
        </p>
      </section>

      <section className={styles.pricingSection}>
        <div className={styles.container}>
          <div className={styles.pricingGrid}>
            {/* Free Tier */}
            <div className={styles.pricingCard}>
              <h3 className={styles.planName}>Free</h3>
              <div className={styles.priceContainer}>
                <span className={styles.price}>$0</span>
                <span className={styles.period}>/month</span>
              </div>
              <p className={styles.planDescription}>
                Perfect for individuals and basic verification needs
              </p>
              <ul className={styles.featureList}>
                <li className={styles.feature}>
                  <svg
                    className={styles.checkIcon}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  10 verifications per month
                </li>
                <li className={styles.feature}>
                  <svg
                    className={styles.checkIcon}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Text analysis
                </li>
                <li className={styles.feature}>
                  <svg
                    className={styles.checkIcon}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Image forensics
                </li>
                <li className={styles.feature}>
                  <svg
                    className={styles.checkIcon}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Basic reports
                </li>
                <li className={styles.feature}>
                  <svg
                    className={styles.checkIcon}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Community support
                </li>
              </ul>
              <Link href="/auth/signin" className={styles.btnOutline}>
                Get Started
              </Link>
            </div>

            {/* Professional Tier */}
            <div className={`${styles.pricingCard} ${styles.featured}`}>
              <span className={styles.popularBadge}>Most Popular</span>
              <h3 className={styles.planName}>Professional</h3>
              <div className={styles.priceContainer}>
                <span className={styles.price}>$49</span>
                <span className={styles.period}>/month</span>
              </div>
              <p className={styles.planDescription}>
                For journalists and content creators
              </p>
              <ul className={styles.featureList}>
                <li className={styles.feature}>
                  <svg
                    className={styles.checkIcon}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  500 verifications per month
                </li>
                <li className={styles.feature}>
                  <svg
                    className={styles.checkIcon}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  All verification types
                </li>
                <li className={styles.feature}>
                  <svg
                    className={styles.checkIcon}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Advanced forensic analysis
                </li>
                <li className={styles.feature}>
                  <svg
                    className={styles.checkIcon}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Detailed PDF reports
                </li>
                <li className={styles.feature}>
                  <svg
                    className={styles.checkIcon}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Priority support
                </li>
                <li className={styles.feature}>
                  <svg
                    className={styles.checkIcon}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  API access
                </li>
                <li className={styles.feature}>
                  <svg
                    className={styles.checkIcon}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Bulk uploads
                </li>
              </ul>
              <Link href="/auth/signin" className={styles.btnPrimary}>
                Start Free Trial
              </Link>
            </div>

            {/* Enterprise Tier */}
            <div className={styles.pricingCard}>
              <h3 className={styles.planName}>Enterprise</h3>
              <div className={styles.priceContainer}>
                <span className={styles.price}>Custom</span>
              </div>
              <p className={styles.planDescription}>
                For newsrooms and organizations
              </p>
              <ul className={styles.featureList}>
                <li className={styles.feature}>
                  <svg
                    className={styles.checkIcon}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Unlimited verifications
                </li>
                <li className={styles.feature}>
                  <svg
                    className={styles.checkIcon}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  White-label solution
                </li>
                <li className={styles.feature}>
                  <svg
                    className={styles.checkIcon}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Custom integrations
                </li>
                <li className={styles.feature}>
                  <svg
                    className={styles.checkIcon}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Dedicated account manager
                </li>
                <li className={styles.feature}>
                  <svg
                    className={styles.checkIcon}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  24/7 premium support
                </li>
                <li className={styles.feature}>
                  <svg
                    className={styles.checkIcon}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Custom ML model training
                </li>
                <li className={styles.feature}>
                  <svg
                    className={styles.checkIcon}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  SLA guarantee
                </li>
              </ul>
              <Link href="/contact" className={styles.btnOutline}>
                Contact Sales
              </Link>
            </div>
          </div>

          <p className={styles.disclaimer}>
            All plans include our core verification technology. No credit card
            required for free tier.
          </p>
        </div>
      </section>
    </div>
  );
}
