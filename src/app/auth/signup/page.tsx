"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../signin/page.module.css";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  // Validation Logic
  const isValidEmail =
    /^[^\s@]+@(gmail\.com|yahoo\.com|outlook\.com|hotmail\.com)$/i.test(email);
  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isPasswordValid =
    hasLength && hasUpper && hasLower && hasNumber && hasSpecial;
  const isFormValid =
    isValidEmail && isPasswordValid && fullName.trim().length > 0;

  const CheckIcon = () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );
  const CrossIcon = () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, fullName }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create account");
      } else {
        // Store token (in a real app, use httpOnly cookies)
        sessionStorage.setItem("auth_token", data.token);
        setSuccess(true);
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {};
  const handleGithubSignUp = async () => {};

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.card}>
            <div
              className={styles.logo}
              style={{ background: "rgba(0, 212, 170, 0.2)" }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 12L11 14L15 10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <h1 className={styles.title}>Account created successfully!</h1>
            <p className={styles.subtitle}>
              Welcome to VeriTrue, {fullName || email}.
            </p>
            <p className={styles.subtitle} style={{ marginTop: "1rem" }}>
              Your account is fully set up and you can now access all
              verification services.
            </p>
            <Link
              href="/upload"
              className={styles.submitBtn}
              style={{
                display: "block",
                textAlign: "center",
                marginTop: "2rem",
                textDecoration: "none",
              }}
            >
              Continue to Upload
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.logo}>
            <svg
              width="32"
              height="32"
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
          <h1 className={styles.title}>Create an account</h1>
          <p className={styles.subtitle}>
            Join VeriTrue and start verifying content
          </p>

          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.inputGroup}>
              <label className={styles.label}>Full Name</label>
              <input
                type="text"
                className={styles.input}
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Email</label>
              <input
                type="email"
                className={styles.input}
                placeholder="you@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                required
              />
              {emailTouched && !isValidEmail && email.length > 0 && (
                <div className={styles.fieldError}>
                  Please enter a valid email address (e.g., @gmail.com,
                  @yahoo.com)
                </div>
              )}
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Password</label>
              <input
                type="password"
                className={styles.input}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordTouched(true);
                }}
                onBlur={() => setPasswordTouched(true)}
                required
              />
              {(passwordTouched || password.length > 0) && (
                <div className={styles.checklist}>
                  <div
                    className={`${styles.checklistItem} ${hasLength ? styles.valid : styles.invalid}`}
                  >
                    {hasLength ? <CheckIcon /> : <CrossIcon />} At least 8
                    characters
                  </div>
                  <div
                    className={`${styles.checklistItem} ${hasUpper ? styles.valid : styles.invalid}`}
                  >
                    {hasUpper ? <CheckIcon /> : <CrossIcon />} One uppercase
                    letter
                  </div>
                  <div
                    className={`${styles.checklistItem} ${hasLower ? styles.valid : styles.invalid}`}
                  >
                    {hasLower ? <CheckIcon /> : <CrossIcon />} One lowercase
                    letter
                  </div>
                  <div
                    className={`${styles.checklistItem} ${hasNumber ? styles.valid : styles.invalid}`}
                  >
                    {hasNumber ? <CheckIcon /> : <CrossIcon />} One number
                  </div>
                  <div
                    className={`${styles.checklistItem} ${hasSpecial ? styles.valid : styles.invalid}`}
                  >
                    {hasSpecial ? <CheckIcon /> : <CrossIcon />} One special
                    character
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isLoading || !isFormValid}
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className={styles.signupLink}>
            Already have an account? <Link href="/auth/signin">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
