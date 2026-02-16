import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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

// Local analysis as fallback when API is not available
function performLocalAnalysis(text: string): AnalysisResult {
  const words = text.split(/\s+/).length;
  const capsWords = (text.match(/\b[A-Z]{2,}\b/g) || []).length;
  const capsUsage = Math.min(100, Math.round((capsWords / words) * 100 * 5));

  const emotionalPatterns = [
    { pattern: /shocking/gi, word: "SHOCKING" },
    { pattern: /terrifying/gi, word: "TERRIFYING" },
    { pattern: /hidden(\s+truth)?/gi, word: "HIDDEN" },
    { pattern: /urgent/gi, word: "URGENT" },
    { pattern: /catastrophic/gi, word: "CATASTROPHIC" },
    { pattern: /dangerous/gi, word: "DANGEROUS" },
    { pattern: /breaking/gi, word: "BREAKING" },
    { pattern: /explosive/gi, word: "EXPLOSIVE" },
  ];

  const emotionalLanguage: string[] = [];
  emotionalPatterns.forEach(({ pattern, word }) => {
    if (pattern.test(text)) {
      emotionalLanguage.push(word);
    }
  });

  const hasVagueSources =
    /experts\s+(say|claim)|studies\s+show|sources\s+(say|report)|scientists\s+(say|claim)/i.test(
      text,
    );
  const hasConspiracyMarkers =
    /they\s+don'?t\s+want|big\s+pharma|cover.?up|mainstream\s+media|wake\s+up/i.test(
      text,
    );
  const hasUnverifiableClaims =
    /100%|always|never|everyone\s+knows|obvious(ly)?/i.test(text);

  let truthScore = 85;
  const detectedIssues: AnalysisResult["detectedIssues"] = [];
  const factVerification: AnalysisResult["factVerification"] = [];

  if (emotionalLanguage.length > 0) {
    truthScore -= emotionalLanguage.length * 10;
    detectedIssues.push({
      text: `Excessive use of emotional language: "${emotionalLanguage.join('", "')}"`,
      severity: emotionalLanguage.length > 2 ? "high" : "medium",
    });
  }

  if (capsUsage > 20) {
    truthScore -= 15;
    detectedIssues.push({
      text: "Excessive use of ALL CAPS text - commonly used in sensationalist content",
      severity: "medium",
    });
  }

  if (hasVagueSources) {
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

  if (hasUnverifiableClaims) {
    truthScore -= 10;
    detectedIssues.push({
      text: "Contains absolute statements that are difficult to verify",
      severity: "medium",
    });
  }

  // Check for common misinformation topics
  if (/5g.*cancer|cancer.*5g/i.test(text)) {
    factVerification.push({
      claim: "5G technology causes cancer",
      status: "false",
      source: "World Health Organization",
    });
  }

  if (/government.*hiding|hiding.*government/i.test(text)) {
    factVerification.push({
      claim: "Government hiding health risks",
      status: "disputed",
      source: "Multiple Fact-Checkers",
    });
  }

  if (/vaccine.*dangerous|dangerous.*vaccine/i.test(text)) {
    factVerification.push({
      claim: "Vaccines are dangerous",
      status: "false",
      source: "CDC & WHO",
    });
  }

  if (/climate.*hoax|hoax.*climate/i.test(text)) {
    factVerification.push({
      claim: "Climate change is a hoax",
      status: "false",
      source: "NASA & Scientific Consensus",
    });
  }

  if (detectedIssues.length === 0) {
    detectedIssues.push({
      text: "Content appears to be well-sourced and balanced in tone",
      severity: "low",
    });
  }

  truthScore = Math.max(5, Math.min(100, truthScore));

  let verdict = "Verified";
  if (truthScore < 30) verdict = "Likely Fake/Manipulated";
  else if (truthScore < 50) verdict = "Questionable Content";
  else if (truthScore < 70) verdict = "Partially Verified";
  else if (truthScore < 85) verdict = "Mostly Verified";

  const tone =
    emotionalLanguage.length > 2 || hasConspiracyMarkers
      ? "Highly Emotional / Fear-Based"
      : emotionalLanguage.length > 0
        ? "Moderately Emotional"
        : "Neutral / Informative";

  const summary =
    truthScore < 50
      ? `This text exhibits multiple hallmarks of misinformation: ${detectedIssues
          .map((i) => i.text.toLowerCase())
          .slice(0, 2)
          .join(
            ", ",
          )}. The Truth Score of ${truthScore}% indicates high likelihood of fake news or manipulated content.`
      : truthScore < 70
        ? `This content shows some concerning patterns but may contain accurate information. The Truth Score of ${truthScore}% suggests verification of specific claims is recommended.`
        : `This content appears to be largely factual with proper sourcing. The Truth Score of ${truthScore}% indicates reliable information. Continue to verify individual claims with primary sources when possible.`;

  return {
    truthScore,
    confidenceLevel: Math.min(95, truthScore + 10),
    verdict,
    detectedIssues,
    factVerification,
    sentimentAnalysis: {
      tone,
      emotionalLanguage:
        emotionalLanguage.length > 0 ? emotionalLanguage : ["None detected"],
      capsUsage,
    },
    summary,
  };
}

// Gemini-powered fact-checking analysis
async function performGeminiAnalysis(text: string): Promise<AnalysisResult> {
  console.log("Starting Gemini analysis...");
  console.log("API Key present:", !!process.env.GEMINI_API_KEY);

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const escapedText = text.replace(/"/g, '\\"');
    const prompt = `Fact-check this text. Extract each claim and verify as true/false/disputed.

TEXT: "${escapedText}"

Return JSON only:
{"factVerification":[{"claim":"claim text","status":"true|false|disputed","source":"brief reason"}],"truthScore":0-100,"verdict":"verdict","summary":"1 sentence"}`;

    let result;
    let retryCount = 0;
    while (retryCount < 3) {
      try {
        result = await model.generateContent(prompt);
        break;
      } catch (apiError: any) {
        if (apiError.status === 429 || apiError.message?.includes("429")) {
          retryCount++;
          console.log(
            `Rate limited. Retrying attempt ${retryCount}/3 in 2s...`,
          );
          await new Promise((resolve) =>
            setTimeout(resolve, 2000 * retryCount),
          );
        } else {
          console.error("Gemini API call failed:", apiError);
          throw new Error(
            "Gemini API call failed: " +
              (apiError instanceof Error ? apiError.message : String(apiError)),
          );
        }
      }
    }

    if (!result) {
      throw new Error("Gemini API call failed after 3 retries (Rate Limit)");
    }
    const response = result.response.text();
    console.log("Gemini raw response:", response.substring(0, 500));

    // Improved JSON extraction - handles markdown code blocks
    let jsonString = response;
    const codeBlockMatch =
      response.match(/```json\s*([\s\S]*?)\s*```/) ||
      response.match(/```\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonString = codeBlockMatch[1];
    } else {
      // Fallback: try to find the first { and last }
      const firstBrace = response.indexOf("{");
      const lastBrace = response.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonString = response.substring(firstBrace, lastBrace + 1);
      }
    }

    try {
      const parsed = JSON.parse(jsonString);
      console.log("Parsed claims:", parsed.factVerification?.length || 0);

      // Calculate truth score based on verified claims
      const claims = parsed.factVerification || [];
      const trueClaims = claims.filter(
        (c: { status: string }) => c.status === "true",
      ).length;
      const falseClaims = claims.filter(
        (c: { status: string }) => c.status === "false",
      ).length;
      const totalVerifiable = trueClaims + falseClaims;

      let calculatedScore = parsed.truthScore;
      if (totalVerifiable > 0) {
        calculatedScore = Math.round((trueClaims / totalVerifiable) * 100);
      }

      // Generate issues from false claims
      const detectedIssues = claims
        .filter((c: { status: string }) => c.status === "false")
        .map((c: { claim: string; source: string }) => ({
          text: `FALSE: "${c.claim}" - ${c.source}`,
          severity: "high" as const,
        }));

      // Add disputed claims as medium severity
      claims
        .filter((c: { status: string }) => c.status === "disputed")
        .forEach((c: { claim: string; source: string }) => {
          detectedIssues.push({
            text: `UNVERIFIED: "${c.claim}" - ${c.source}`,
            severity: "medium" as const,
          });
        });

      if (detectedIssues.length === 0 && trueClaims > 0) {
        detectedIssues.push({
          text: "All claims verified as true",
          severity: "low" as const,
        });
      }

      let verdict = "All Claims Verified";
      if (falseClaims > 0 && trueClaims === 0) {
        verdict = "All Claims False";
      } else if (falseClaims > 0) {
        verdict = "Contains False Claims";
      } else if (trueClaims === 0) {
        verdict = "Unverifiable Claims";
      }

      return {
        truthScore: calculatedScore,
        confidenceLevel: Math.min(95, calculatedScore + 5),
        verdict,
        detectedIssues,
        factVerification: parsed.factVerification || [],
        sentimentAnalysis: parsed.sentimentAnalysis || {
          tone: "Factual Analysis",
          emotionalLanguage: [],
          capsUsage: 0,
        },
        summary:
          parsed.summary ||
          `Analysis complete. ${trueClaims} claim(s) verified as true, ${falseClaims} claim(s) identified as false.`,
      };
    } catch (parseError) {
      throw new Error(
        "Failed to parse Gemini response: " + response.substring(0, 200),
      );
    }
  } catch (error) {
    console.error("Gemini API error:", error);
    // Re-throw error instead of fallback
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text content is required" },
        { status: 400 },
      );
    }

    if (text.length < 10) {
      return NextResponse.json(
        { error: "Text must be at least 10 characters" },
        { status: 400 },
      );
    }

    // Perform analysis
    let analysis: AnalysisResult;

    console.log("=== TEXT ANALYSIS REQUEST ===");
    console.log("Text length:", text.length);
    console.log("GEMINI_API_KEY exists:", !!process.env.GEMINI_API_KEY);
    console.log(
      "GEMINI_API_KEY value (first 10 chars):",
      process.env.GEMINI_API_KEY?.substring(0, 10),
    );

    // Check if API key is configured
    if (
      !process.env.GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY === "your_gemini_api_key_here"
    ) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY is not configured. Please add your API key to .env.local",
        },
        { status: 500 },
      );
    }

    console.log("Using Gemini API for analysis");
    analysis = await performGeminiAnalysis(text);
    console.log("Analysis complete. Truth score:", analysis.truthScore);

    // Try to save to database if user is authenticated
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Save analysis to database
        await supabase.from("analyses").insert({
          user_id: user.id,
          content_type: "text",
          content_preview: text.substring(0, 200),
          truth_score: analysis.truthScore,
          verdict: analysis.verdict,
          detected_issues: analysis.detectedIssues,
          fact_verification: analysis.factVerification,
          sentiment_analysis: analysis.sentimentAnalysis,
          summary: analysis.summary,
        });

        // Increment verification count
        await supabase.rpc("increment_verification_count", {
          p_user_id: user.id,
        });
      }
    } catch (dbError) {
      console.error("Database error (non-critical):", dbError);
      // Continue without saving - analysis still works
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Analysis error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Analysis failed: ${errorMessage}` },
      { status: 500 },
    );
  }
}
