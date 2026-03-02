import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid URL. Please enter a valid http/https URL." },
        { status: 400 },
      );
    }

    if (
      !process.env.GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY === "your_gemini_api_key_here"
    ) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured." },
        { status: 500 },
      );
    }

    // Fetch the webpage content
    let pageContent: string;
    let pageTitle = "";
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return NextResponse.json(
          { error: `Failed to fetch URL: HTTP ${response.status}` },
          { status: 400 },
        );
      }

      const html = await response.text();

      // Extract title
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      pageTitle = titleMatch ? titleMatch[1].trim() : parsedUrl.hostname;

      // Extract text content from HTML - strip tags, scripts, styles
      pageContent = html
        // Remove scripts and styles
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
        // Remove HTML tags
        .replace(/<[^>]+>/g, " ")
        // Decode HTML entities
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        // Clean up whitespace
        .replace(/\s+/g, " ")
        .trim();

      if (pageContent.length < 50) {
        return NextResponse.json(
          { error: "Could not extract enough text content from this URL." },
          { status: 400 },
        );
      }

      // Limit content length to avoid exceeding token limits
      pageContent = pageContent.substring(0, 3000);
    } catch (fetchError: any) {
      if (fetchError.name === "AbortError") {
        return NextResponse.json(
          { error: "URL request timed out after 10 seconds." },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: `Failed to fetch URL: ${fetchError.message}` },
        { status: 400 },
      );
    }

    // Now analyze with Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Fact-check this webpage content. Extract each factual claim and verify as true/false/disputed.

SOURCE URL: ${url}
PAGE TITLE: ${pageTitle}
CONTENT: "${pageContent.replace(/"/g, '\\"')}"

Return JSON only:
{"factVerification":[{"claim":"claim text","status":"true|false|disputed","source":"brief reason"}],"truthScore":0-100,"verdict":"verdict","summary":"1-2 sentences about overall credibility","sourceCredibility":"high|medium|low|unknown"}`;

    // Retry logic
    let result;
    let retryCount = 0;
    while (retryCount < 3) {
      try {
        result = await model.generateContent(prompt);
        break;
      } catch (apiError: any) {
        if (apiError.status === 429 || apiError.message?.includes("429")) {
          retryCount++;
          console.log(`Rate limited. Retry ${retryCount}/3...`);
          await new Promise((r) => setTimeout(r, 2000 * retryCount));
        } else {
          throw new Error(
            "Gemini API failed: " +
              (apiError instanceof Error ? apiError.message : String(apiError)),
          );
        }
      }
    }

    if (!result) {
      throw new Error("Gemini API failed after 3 retries (Rate Limit)");
    }

    const response = result.response.text();
    console.log("URL analysis response:", response.substring(0, 500));

    // Extract JSON
    let jsonString = response;
    const codeBlockMatch =
      response.match(/```json\s*([\s\S]*?)\s*```/) ||
      response.match(/```\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonString = codeBlockMatch[1];
    } else {
      const firstBrace = response.indexOf("{");
      const lastBrace = response.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonString = response.substring(firstBrace, lastBrace + 1);
      }
    }

    try {
      const parsed = JSON.parse(jsonString);

      const claims = parsed.factVerification || [];
      const trueClaims = claims.filter(
        (c: { status: string }) => c.status === "true",
      ).length;
      const falseClaims = claims.filter(
        (c: { status: string }) => c.status === "false",
      ).length;
      const totalVerifiable = trueClaims + falseClaims;

      let truthScore = parsed.truthScore ?? 70;
      if (totalVerifiable > 0) {
        truthScore = Math.round((trueClaims / totalVerifiable) * 100);
      }

      // Generate issues from false claims
      const detectedIssues = claims
        .filter((c: { status: string }) => c.status === "false")
        .map((c: { claim: string; source: string }) => ({
          text: `FALSE: "${c.claim}" — ${c.source}`,
          severity: "high" as const,
        }));

      claims
        .filter((c: { status: string }) => c.status === "disputed")
        .forEach((c: { claim: string; source: string }) => {
          detectedIssues.push({
            text: `UNVERIFIED: "${c.claim}" — ${c.source}`,
            severity: "medium" as const,
          });
        });

      // Source credibility adjustment
      const credibility = parsed.sourceCredibility?.toLowerCase();
      if (credibility === "low") {
        truthScore = Math.max(5, truthScore - 15);
        detectedIssues.push({
          text: "Source has low credibility rating",
          severity: "high" as const,
        });
      } else if (credibility === "unknown") {
        detectedIssues.push({
          text: "Source credibility could not be determined",
          severity: "medium" as const,
        });
      }

      if (detectedIssues.length === 0) {
        detectedIssues.push({
          text: "All claims verified — content appears credible",
          severity: "low" as const,
        });
      }

      truthScore = Math.max(5, Math.min(100, truthScore));

      let verdict = "All Claims Verified";
      if (falseClaims > 0 && trueClaims === 0) {
        verdict = "All Claims False";
      } else if (falseClaims > 0) {
        verdict = "Contains False Claims";
      } else if (trueClaims === 0) {
        verdict = "Unverifiable Claims";
      }

      return NextResponse.json({
        truthScore,
        confidenceLevel: Math.min(95, truthScore + 5),
        verdict,
        detectedIssues,
        factVerification: claims,
        sentimentAnalysis: {
          tone: "Web Content Analysis",
          emotionalLanguage: [],
          capsUsage: 0,
        },
        summary:
          parsed.summary ||
          `URL analysis of "${pageTitle}". ${trueClaims} true, ${falseClaims} false claims found.`,
        sourceUrl: url,
        pageTitle,
      });
    } catch (parseError) {
      throw new Error(
        "Failed to parse Gemini response: " + response.substring(0, 200),
      );
    }
  } catch (error) {
    console.error("URL analysis error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `URL analysis failed: ${errorMessage}` },
      { status: 500 },
    );
  }
}
