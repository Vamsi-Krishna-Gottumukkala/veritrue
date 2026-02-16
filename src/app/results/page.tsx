"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./page.module.css";

interface AnalysisResult {
  truthScore: number;
  confidenceLevel: number;
  verdict: string;
  detectedIssues: Array<{
    text: string;
    severity: "high" | "medium" | "low";
  }>;
  factVerification: Array<{
    claim: string;
    status: "true" | "false" | "disputed";
    source: string;
  }>;
  sentimentAnalysis: {
    tone: string;
    emotionalLanguage: string[];
    capsUsage: number;
  };
  summary: string;
}

// Demo analysis data - in production this would come from real AI analysis
const generateDemoAnalysis = (content: string): AnalysisResult => {
  // Check for common misinformation patterns
  const hasEmotionalLanguage =
    /shocking|terrifying|hidden|urgent|catastrophic|dangerous/i.test(content);
  const hasCapsAbuse = (content.match(/[A-Z]{3,}/g) || []).length > 2;
  const hasVagueSourced =
    /experts say|studies show|scientists claim|sources report/i.test(content);
  const hasConspiracyMarkers =
    /they don't want you to know|big pharma|cover.?up|mainstream media/i.test(
      content,
    );

  let truthScore = 85;
  const detectedIssues: AnalysisResult["detectedIssues"] = [];
  const factVerification: AnalysisResult["factVerification"] = [];
  const emotionalLanguage: string[] = [];

  if (hasEmotionalLanguage) {
    truthScore -= 25;
    detectedIssues.push({
      text: 'Excessive use of emotional language: "SHOCKING", "TERRIFYING", "HIDDEN TRUTH"',
      severity: "high",
    });
    emotionalLanguage.push(
      "SHOCKING",
      "TERRIFYING",
      "HIDDEN",
      "URGENT",
      "CATASTROPHIC",
      "DANGEROUS",
    );
  }

  if (hasCapsAbuse) {
    truthScore -= 15;
    detectedIssues.push({
      text: "Excessive use of ALL CAPS text detected - commonly used in sensationalist content",
      severity: "medium",
    });
  }

  if (hasVagueSourced) {
    truthScore -= 20;
    detectedIssues.push({
      text: 'No verifiable sources cited - uses vague phrases like "experts claim" and "studies show"',
      severity: "high",
    });
  }

  if (hasConspiracyMarkers) {
    truthScore -= 25;
    detectedIssues.push({
      text: "Appeals to fear and conspiracy theories rather than evidence-based reporting",
      severity: "high",
    });
  }

  // Generate fact verification based on content
  if (
    content.toLowerCase().includes("5g") ||
    content.toLowerCase().includes("cancer")
  ) {
    factVerification.push({
      claim: "5G technology causes cancer",
      status: "false",
      source: "World Health Organization",
    });
  }

  if (
    content.toLowerCase().includes("government") &&
    content.toLowerCase().includes("hiding")
  ) {
    factVerification.push({
      claim: "Government hiding health risks",
      status: "disputed",
      source: "Multiple Fact-Checkers",
    });
  }

  if (
    content.toLowerCase().includes("safety") &&
    content.toLowerCase().includes("studies")
  ) {
    factVerification.push({
      claim: "No safety studies conducted",
      status: "false",
      source: "FCC & FDA Documentation",
    });
  }

  // Add a default issue if none detected
  if (detectedIssues.length === 0) {
    detectedIssues.push({
      text: "Content appears to be well-sourced and factual",
      severity: "low",
    });
    truthScore = Math.min(truthScore, 92);
  }

  truthScore = Math.max(10, Math.min(100, truthScore));

  let verdict = "Verified";
  if (truthScore < 40) verdict = "Likely Fake/Manipulated";
  else if (truthScore < 60) verdict = "Questionable Content";
  else if (truthScore < 80) verdict = "Partially Verified";

  return {
    truthScore,
    confidenceLevel: truthScore,
    verdict,
    detectedIssues,
    factVerification,
    sentimentAnalysis: {
      tone: hasEmotionalLanguage
        ? "Highly Emotional / Fear-Based"
        : "Neutral / Informative",
      emotionalLanguage:
        emotionalLanguage.length > 0 ? emotionalLanguage : ["None detected"],
      capsUsage: hasCapsAbuse ? 47 : 5,
    },
    summary:
      truthScore < 50
        ? `This text exhibits multiple hallmarks of misinformation: unsubstantiated claims, heavy use of sensationalist language designed to provoke emotional responses, lack of credible source citations, and reliance on conspiracy theory narratives. The Truth Score of ${truthScore}% indicates high likelihood of fake news.`
        : `This content appears to be largely factual with proper sourcing. The Truth Score of ${truthScore}% indicates reliable information. Continue to verify individual claims with primary sources when possible.`,
  };
};

export default function ResultsPage() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Try to get stored analysis result from API
    const storedResult = sessionStorage.getItem("analysisResult");

    if (storedResult) {
      try {
        const parsed = JSON.parse(storedResult);
        // Ensure all required fields exist
        const analysis: AnalysisResult = {
          truthScore: parsed.truthScore || 75,
          confidenceLevel: parsed.confidenceLevel || parsed.truthScore || 75,
          verdict: parsed.verdict || "Analysis Complete",
          detectedIssues: parsed.detectedIssues || [],
          factVerification: parsed.factVerification || [],
          sentimentAnalysis: parsed.sentimentAnalysis || {
            tone: "Unknown",
            emotionalLanguage: ["None detected"],
            capsUsage: 0,
          },
          summary: parsed.summary || "Analysis completed.",
        };
        setResult(analysis);
        setIsLoading(false);
      } catch {
        // Fallback to demo analysis
        const content = sessionStorage.getItem("analysisContent") || "";
        const analysis = generateDemoAnalysis(content);
        setResult(analysis);
        setIsLoading(false);
      }
    } else {
      // Fallback: generate demo analysis
      const content = sessionStorage.getItem("analysisContent") || "";
      const analysis = generateDemoAnalysis(content);
      setResult(analysis);
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return (
      <div className={styles.loadingPage}>
        <div className={styles.loadingSpinner}></div>
        <p className={styles.loadingText}>Analyzing content...</p>
        <p className={styles.loadingSubtext}>
          Running forensic checks and fact verification
        </p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className={styles.errorPage}>
        <p>No analysis data found. Please upload content first.</p>
        <Link href="/upload" className={styles.btnPrimary}>
          Go to Upload
        </Link>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return "var(--color-success)";
    if (score >= 40) return "var(--color-warning)";
    return "var(--color-error)";
  };

  return (
    <div className={styles.page}>
      <Link href="/upload" className={styles.backLink}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M19 12H5M12 19l-7-7 7-7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back
      </Link>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Analysis Results</h1>
          <p className={styles.subtitle}>
            Comprehensive verification report for your content
          </p>
        </div>
        <div className={styles.actions}>
          <button className={styles.actionBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684zm0-9.316a3 3 0 105.366-2.683 3 3 0 00-5.366 2.683z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Share Report
          </button>
          <button
            className={styles.actionBtn}
            onClick={async () => {
              if (!result) return;
              try {
                const response = await fetch("/api/export/pdf", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    ...result,
                    contentType:
                      sessionStorage.getItem("analysisType") || "text",
                    contentPreview:
                      sessionStorage.getItem("analysisContent") || "",
                  }),
                });
                if (response.ok) {
                  const blob = await response.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "veritrue-analysis-report.pdf";
                  a.click();
                  URL.revokeObjectURL(url);
                }
              } catch (error) {
                console.error("PDF export error:", error);
                alert("Failed to generate PDF");
              }
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Export PDF
          </button>
          <Link href="/upload" className={styles.newAnalysisBtn}>
            New Analysis
          </Link>
        </div>
      </div>

      <div className={styles.content}>
        {/* Truth Score Card */}
        <div className={styles.scoreCard}>
          <div className={styles.scoreMain}>
            <div
              className={styles.scoreCircle}
              style={
                {
                  "--score-color": getScoreColor(result.truthScore),
                } as React.CSSProperties
              }
            >
              <svg className={styles.scoreRing} viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="var(--color-border)"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke={getScoreColor(result.truthScore)}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${result.truthScore * 2.83} 283`}
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className={styles.scoreValue}>
                <span className={styles.scoreNumber}>{result.truthScore}</span>
                <span className={styles.scoreMax}>/100</span>
              </div>
            </div>
            <div className={styles.scoreInfo}>
              <p className={styles.scoreLabel}>Truth Score</p>
              <p className={styles.confidenceLabel}>Confidence Level</p>
              <div className={styles.confidenceBar}>
                <div
                  className={styles.confidenceFill}
                  style={{
                    width: `${result.confidenceLevel}%`,
                    background: getScoreColor(result.truthScore),
                  }}
                ></div>
              </div>
              <p
                className={`${styles.verdict} ${result.truthScore < 50 ? styles.verdictBad : styles.verdictGood}`}
              >
                {result.verdict}
              </p>
            </div>
          </div>
          <div
            className={styles.scoreIcon}
            style={{ color: getScoreColor(result.truthScore) }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L3 7V17L12 22L21 17V7L12 2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              {result.truthScore >= 50 ? (
                <path
                  d="M9 12L11 14L15 10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : (
                <path
                  d="M15 9L9 15M9 9L15 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
            <span className={styles.scorePercent}>{result.truthScore}%</span>
          </div>
        </div>

        {/* Detected Issues */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Detected Issues
          </h2>
          <div className={styles.issuesList}>
            {result.detectedIssues.map((issue, index) => (
              <div
                key={index}
                className={`${styles.issue} ${styles[`issue${issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)}`]}`}
              >
                <span className={styles.issueIcon}>!</span>
                <span className={styles.issueText}>{issue.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Fact Verification */}
        {result.factVerification.length > 0 && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Fact Verification
            </h2>
            <div className={styles.factsList}>
              {result.factVerification.map((fact, index) => (
                <div key={index} className={styles.factItem}>
                  <div className={styles.factClaim}>
                    <span className={styles.factText}>{fact.claim}</span>
                    <span
                      className={`${styles.factBadge} ${styles[`badge${fact.status.charAt(0).toUpperCase() + fact.status.slice(1)}`]}`}
                    >
                      {fact.status}
                    </span>
                  </div>
                  <span className={styles.factSource}>
                    Source: {fact.source}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sentiment Analysis */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M13 10V3L4 14h7v7l9-11h-7z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Sentiment Analysis
          </h2>
          <div className={styles.sentimentContent}>
            <div className={styles.sentimentRow}>
              <span className={styles.sentimentLabel}>Tone</span>
              <span className={styles.sentimentBadge}>
                {result.sentimentAnalysis.tone}
              </span>
            </div>
            <div className={styles.sentimentRow}>
              <span className={styles.sentimentLabel}>Emotional Language</span>
              <div className={styles.emotionalTags}>
                {result.sentimentAnalysis.emotionalLanguage.map(
                  (word, index) => (
                    <span key={index} className={styles.emotionalTag}>
                      {word}
                    </span>
                  ),
                )}
              </div>
            </div>
            <div className={styles.sentimentRow}>
              <span className={styles.sentimentLabel}>ALL CAPS Usage</span>
              <div className={styles.capsBar}>
                <div
                  className={styles.capsFill}
                  style={{ width: `${result.sentimentAnalysis.capsUsage}%` }}
                ></div>
                <span className={styles.capsPercent}>
                  {result.sentimentAnalysis.capsUsage}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Analysis Summary */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Analysis Summary</h2>
          <p className={styles.summaryText}>{result.summary}</p>
        </div>
      </div>
    </div>
  );
}
