import { NextRequest, NextResponse } from "next/server";

interface FactCheckResult {
  claim: string;
  claimReview: Array<{
    publisher: string;
    url: string;
    title: string;
    textualRating: string;
    rating: "true" | "false" | "mixed" | "unverified";
  }>;
}

// Google Fact Check API integration
async function queryGoogleFactCheck(query: string): Promise<FactCheckResult[]> {
  const apiKey = process.env.GOOGLE_FACT_CHECK_API_KEY;

  if (!apiKey || apiKey === "your_fact_check_api_key_here") {
    return [];
  }

  try {
    const response = await fetch(
      `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${encodeURIComponent(query)}&key=${apiKey}`,
    );

    if (!response.ok) {
      console.error("Fact Check API error:", response.status);
      return [];
    }

    const data = await response.json();

    if (!data.claims) {
      return [];
    }

    return data.claims.map((claim: unknown) => {
      // Type assertion for API response
      const c = claim as {
        text?: string;
        claimReview?: Array<{
          publisher?: { name?: string };
          url?: string;
          title?: string;
          textualRating?: string;
        }>;
      };

      return {
        claim: c.text || "",
        claimReview: (c.claimReview || []).map((review) => {
          const rating = normalizeRating(review.textualRating || "");
          return {
            publisher: review.publisher?.name || "Unknown",
            url: review.url || "",
            title: review.title || "",
            textualRating: review.textualRating || "Unverified",
            rating,
          };
        }),
      };
    });
  } catch (error) {
    console.error("Fact Check API error:", error);
    return [];
  }
}

// Normalize rating to standard format
function normalizeRating(
  textualRating: string,
): "true" | "false" | "mixed" | "unverified" {
  const lower = textualRating.toLowerCase();

  if (
    lower.includes("true") ||
    lower.includes("correct") ||
    lower.includes("accurate")
  ) {
    return "true";
  }
  if (
    lower.includes("false") ||
    lower.includes("incorrect") ||
    lower.includes("fake") ||
    lower.includes("pants on fire")
  ) {
    return "false";
  }
  if (
    lower.includes("mixed") ||
    lower.includes("partly") ||
    lower.includes("half")
  ) {
    return "mixed";
  }

  return "unverified";
}

// Local fact-check database for common claims
const localFactDatabase: Record<
  string,
  { status: "true" | "false" | "mixed"; source: string }
> = {
  "5g causes cancer": { status: "false", source: "World Health Organization" },
  "5g coronavirus": { status: "false", source: "WHO & CDC" },
  "vaccines cause autism": {
    status: "false",
    source: "CDC, WHO, numerous studies",
  },
  "flat earth": { status: "false", source: "NASA, scientific consensus" },
  "climate change hoax": {
    status: "false",
    source: "NASA, IPCC, 97% of climate scientists",
  },
  "covid lab leak": { status: "mixed", source: "Ongoing investigation" },
  "moon landing fake": {
    status: "false",
    source: "NASA, independent verification",
  },
  chemtrails: { status: "false", source: "EPA, atmospheric scientists" },
  "birds arent real": {
    status: "false",
    source: "Ornithological societies worldwide",
  },
  "microchip vaccine": {
    status: "false",
    source: "FDA, vaccine manufacturers",
  },
};

function checkLocalDatabase(query: string): FactCheckResult[] {
  const results: FactCheckResult[] = [];
  const lowerQuery = query.toLowerCase();

  for (const [claim, { status, source }] of Object.entries(localFactDatabase)) {
    if (
      lowerQuery.includes(claim) ||
      levenshteinDistance(lowerQuery, claim) < 10
    ) {
      results.push({
        claim: claim,
        claimReview: [
          {
            publisher: source,
            url: "",
            title: `Fact check: ${claim}`,
            textualRating:
              status === "false"
                ? "False"
                : status === "true"
                  ? "True"
                  : "Mixed/Disputed",
            rating: status,
          },
        ],
      });
    }
  }

  return results;
}

// Simple Levenshtein distance for fuzzy matching
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export async function POST(request: NextRequest) {
  try {
    const { query, claims } = await request.json();

    if (!query && (!claims || claims.length === 0)) {
      return NextResponse.json(
        { error: "Query or claims array is required" },
        { status: 400 },
      );
    }

    const results: FactCheckResult[] = [];

    // Check individual claims if provided
    if (claims && Array.isArray(claims)) {
      for (const claim of claims) {
        // Check local database first
        const localResults = checkLocalDatabase(claim);
        results.push(...localResults);

        // Query Google Fact Check API
        const apiResults = await queryGoogleFactCheck(claim);
        results.push(...apiResults);
      }
    }

    // General query search
    if (query) {
      const localResults = checkLocalDatabase(query);
      results.push(...localResults);

      const apiResults = await queryGoogleFactCheck(query);
      results.push(...apiResults);
    }

    // Deduplicate results by claim
    const uniqueResults = results.reduce((acc, result) => {
      const existingIndex = acc.findIndex(
        (r) => r.claim.toLowerCase() === result.claim.toLowerCase(),
      );
      if (existingIndex === -1) {
        acc.push(result);
      } else {
        // Merge claim reviews
        acc[existingIndex].claimReview.push(...result.claimReview);
      }
      return acc;
    }, [] as FactCheckResult[]);

    return NextResponse.json({
      results: uniqueResults,
      totalResults: uniqueResults.length,
    });
  } catch (error) {
    console.error("Fact check error:", error);
    return NextResponse.json(
      { error: "Failed to perform fact check" },
      { status: 500 },
    );
  }
}
