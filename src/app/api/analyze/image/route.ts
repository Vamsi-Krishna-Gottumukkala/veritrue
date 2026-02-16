import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface ImageAnalysisResult {
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
  metadata: {
    format?: string;
    fileSize?: number;
    hasExif?: boolean;
  };
  sentimentAnalysis: {
    tone: string;
    emotionalLanguage: string[];
    capsUsage: number;
  };
  summary: string;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Image file is required" },
        { status: 400 },
      );
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Supported: JPG, PNG, WEBP" },
        { status: 400 },
      );
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Max size: 10MB" },
        { status: 400 },
      );
    }

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

    // Get file buffer
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const base64Image = Buffer.from(buffer).toString("base64");

    // Perform Gemini Vision analysis
    const analysis = await performGeminiVisionAnalysis(
      base64Image,
      file.type,
      bytes,
      file.size,
    );

    // Try to save to database if user is authenticated
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase.from("analyses").insert({
          user_id: user.id,
          content_type: "image",
          content_preview: `Image: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`,
          truth_score: analysis.truthScore,
          verdict: analysis.verdict,
          detected_issues: analysis.detectedIssues,
          fact_verification: analysis.factVerification,
          sentiment_analysis: analysis.sentimentAnalysis,
          summary: analysis.summary,
        });

        await supabase.rpc("increment_verification_count", {
          p_user_id: user.id,
        });
      }
    } catch (dbError) {
      console.error("Database error (non-critical):", dbError);
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Image analysis error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Image analysis failed: ${errorMessage}` },
      { status: 500 },
    );
  }
}

async function performGeminiVisionAnalysis(
  base64Image: string,
  mimeType: string,
  bytes: Uint8Array,
  fileSize: number,
): Promise<ImageAnalysisResult> {
  console.log("Starting Gemini Vision analysis...");

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `Analyze this image for authenticity and manipulation. Check for:
1. Signs of digital manipulation (splicing, cloning, airbrushing)
2. AI-generated content indicators
3. Misleading context (text overlays, altered captions)
4. Any visible text claims that can be fact-checked

Return JSON only:
{"detectedIssues":[{"text":"description","severity":"high|medium|low"}],"factVerification":[{"claim":"any text claim in image","status":"true|false|disputed","source":"reason"}],"truthScore":0-100,"verdict":"verdict","summary":"1-2 sentences","isAIGenerated":false,"manipulationSigns":[],"tone":"Neutral"}`;

  // Retry logic for rate limits
  let result;
  let retryCount = 0;
  while (retryCount < 3) {
    try {
      result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Image,
          },
        },
      ]);
      break;
    } catch (apiError: any) {
      if (apiError.status === 429 || apiError.message?.includes("429")) {
        retryCount++;
        console.log(
          `Rate limited. Retry ${retryCount}/3 in ${2 * retryCount}s...`,
        );
        await new Promise((r) => setTimeout(r, 2000 * retryCount));
      } else {
        throw new Error(
          "Gemini Vision API failed: " +
            (apiError instanceof Error ? apiError.message : String(apiError)),
        );
      }
    }
  }

  if (!result) {
    throw new Error("Gemini Vision API failed after 3 retries (Rate Limit)");
  }

  const response = result.response.text();
  console.log("Gemini Vision response:", response.substring(0, 500));

  // Extract JSON from response
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

    // Extract metadata from bytes
    const metadata = extractBasicMetadata(bytes, mimeType, fileSize);

    // Calculate truth score from issues
    let truthScore = parsed.truthScore ?? 85;
    const detectedIssues = parsed.detectedIssues || [];
    const factVerification = parsed.factVerification || [];

    // Adjust score based on metadata checks
    if (!metadata.hasExif && mimeType === "image/jpeg") {
      if (
        !detectedIssues.some((i: { text: string }) => i.text.includes("EXIF"))
      ) {
        detectedIssues.push({
          text: "No EXIF metadata found — may be a screenshot or processed image",
          severity: "low" as const,
        });
      }
    }

    if (parsed.isAIGenerated) {
      truthScore = Math.min(truthScore, 30);
      if (
        !detectedIssues.some((i: { text: string }) =>
          i.text.toLowerCase().includes("ai"),
        )
      ) {
        detectedIssues.push({
          text: "Image appears to be AI-generated",
          severity: "high" as const,
        });
      }
    }

    truthScore = Math.max(5, Math.min(100, truthScore));

    let verdict = parsed.verdict || "Authentic Image";
    if (truthScore < 30) verdict = "Likely Fake / AI-Generated";
    else if (truthScore < 50) verdict = "Likely Manipulated";
    else if (truthScore < 70) verdict = "Potentially Edited";
    else if (truthScore < 85) verdict = "Minor Edits Possible";

    if (detectedIssues.length === 0) {
      detectedIssues.push({
        text: "No obvious signs of manipulation detected",
        severity: "low" as const,
      });
    }

    return {
      truthScore,
      confidenceLevel: Math.min(95, truthScore + 5),
      verdict,
      detectedIssues,
      factVerification,
      metadata,
      sentimentAnalysis: {
        tone: parsed.tone || "Neutral",
        emotionalLanguage: parsed.manipulationSigns || [],
        capsUsage: 0,
      },
      summary:
        parsed.summary ||
        `Image analysis complete. Truth score: ${truthScore}%.`,
    };
  } catch (parseError) {
    throw new Error(
      "Failed to parse Gemini Vision response: " + response.substring(0, 200),
    );
  }
}

function extractBasicMetadata(
  bytes: Uint8Array,
  mimeType: string,
  fileSize: number,
): ImageAnalysisResult["metadata"] {
  const metadata: ImageAnalysisResult["metadata"] = {
    format: mimeType.split("/")[1].toUpperCase(),
    fileSize: Math.round(fileSize / 1024),
    hasExif: false,
  };

  // Check for EXIF data in JPEG
  if (mimeType === "image/jpeg") {
    for (let i = 0; i < Math.min(bytes.length, 100); i++) {
      if (bytes[i] === 0xff && bytes[i + 1] === 0xe1) {
        metadata.hasExif = true;
        break;
      }
    }
  }

  return metadata;
}
