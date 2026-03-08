import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "fallback_secret_key_change_in_production";

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

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Supported: JPG, PNG, WEBP" },
        { status: 400 },
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Max size: 10MB" },
        { status: 400 },
      );
    }

    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const base64Image = Buffer.from(buffer).toString("base64");

    let analysis: ImageAnalysisResult;

    if (
      !process.env.GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY === "your_gemini_api_key_here"
    ) {
      return NextResponse.json(
        {
          error:
            "Gemini API is not available. Please check your environment variables.",
        },
        { status: 500 },
      );
    }

    console.log("Using Gemini Vision API for image analysis");
    analysis = await performGeminiVisionAnalysis(
      base64Image,
      file.type,
      bytes,
      file.size,
    );

    // Save to DB if authenticated
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get("auth_token")?.value;

      if (token) {
        let userId;
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          userId = decoded.userId;
        } catch (e) {}

        if (userId) {
          await pool.query(
            "INSERT INTO analysis_history (user_id, content_type, content_preview, truth_score, verdict) VALUES (?, ?, ?, ?, ?)",
            [
              userId,
              "image",
              `Image uploaded (${file.name})`,
              analysis!.truthScore,
              analysis!.verdict,
            ],
          );
        }
      }
    } catch (dbError) {
      console.error("Database error (non-critical):", dbError);
    }

    return NextResponse.json(analysis!);
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
  console.log("Starting Gemini Vision forensic analysis...");

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  // Forensic-focused prompt designed to detect AI-generated and manipulated images
  const prompt = `You are an expert digital forensics analyst specializing in detecting AI-generated and manipulated images. Perform a thorough forensic analysis of this image.

CHECK FOR THESE AI-GENERATION ARTIFACTS:
- Hands/fingers: wrong count, fused, extra, missing, unnatural bending
- Eyes: mismatched iris patterns, asymmetric reflections, unnatural catchlights
- Teeth: fused, too uniform, floating, wrong count
- Hair: merging into skin, unnatural strand patterns, impossible physics
- Text in image: garbled, misspelled, nonsensical letters
- Skin: waxy/plastic texture, lack of pores, overly smooth
- Background: warped lines, melting objects, impossible geometry
- Symmetry: faces too perfectly symmetric (real faces are asymmetric)
- Lighting: inconsistent shadows, light from multiple impossible directions
- Edges: unusual blending between subject and background
- Patterns: repeating textures that tile unnaturally
- Overall "uncanny valley" feel or hyperrealistic perfection

CHECK FOR MANIPULATION (PHOTOSHOP/EDITING):
- Clone stamp artifacts (repeated identical patches)
- Inconsistent noise/grain across regions
- Mismatched compression levels
- Cut-paste edges with halo artifacts
- Warped straight lines near edited areas (liquify tool)
- Color/lighting mismatches between composited elements

ALSO CHECK:
- Any visible text claims that can be fact-checked
- Whether this is a screenshot of social media (could be fabricated)

Based on your analysis, determine:
1. Is this image AI-generated? (yes/no/uncertain)
2. Is this image manipulated/edited? (yes/no/uncertain)
3. What specific artifacts did you find?

Return JSON only:
{"isAIGenerated":"yes|no|uncertain","isManipulated":"yes|no|uncertain","aiConfidence":0-100,"artifacts":["specific artifact found"],"detectedIssues":[{"text":"description","severity":"high|medium|low"}],"factVerification":[{"claim":"text claim in image","status":"true|false|disputed","source":"reason"}],"truthScore":0-100,"verdict":"short verdict","summary":"2-3 sentence forensic summary"}`;

  // Retry logic
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

    const metadata = extractBasicMetadata(bytes, mimeType, fileSize);
    const detectedIssues: ImageAnalysisResult["detectedIssues"] =
      parsed.detectedIssues || [];
    const factVerification = parsed.factVerification || [];
    let truthScore = parsed.truthScore ?? 75;

    // ---- AI-generation scoring ----
    const isAI = parsed.isAIGenerated?.toLowerCase();
    const aiConfidence = parsed.aiConfidence ?? 50;

    if (isAI === "yes") {
      truthScore = Math.min(truthScore, Math.max(5, 100 - aiConfidence));
      detectedIssues.unshift({
        text: `AI-GENERATED IMAGE DETECTED (${aiConfidence}% confidence)`,
        severity: "high" as const,
      });
      // Add specific artifacts found
      if (parsed.artifacts && parsed.artifacts.length > 0) {
        parsed.artifacts.forEach((artifact: string) => {
          detectedIssues.push({
            text: `AI artifact: ${artifact}`,
            severity: "medium" as const,
          });
        });
      }
    } else if (isAI === "uncertain") {
      truthScore = Math.min(truthScore, 60);
      detectedIssues.unshift({
        text: `Possibly AI-generated — some indicators present (${aiConfidence}% confidence)`,
        severity: "medium" as const,
      });
    }

    // ---- Manipulation scoring ----
    const isManipulated = parsed.isManipulated?.toLowerCase();
    if (isManipulated === "yes") {
      truthScore = Math.min(truthScore, 35);
      if (
        !detectedIssues.some((i) => i.text.toLowerCase().includes("manipulat"))
      ) {
        detectedIssues.unshift({
          text: "Image shows signs of digital manipulation/editing",
          severity: "high" as const,
        });
      }
    } else if (isManipulated === "uncertain") {
      truthScore = Math.min(truthScore, 65);
    }

    // ---- Metadata scoring ----
    if (!metadata.hasExif && mimeType === "image/jpeg") {
      if (!detectedIssues.some((i) => i.text.includes("EXIF"))) {
        detectedIssues.push({
          text: "No EXIF metadata — may be a screenshot or processed image",
          severity: "low" as const,
        });
      }
    }

    truthScore = Math.max(5, Math.min(100, truthScore));

    // Determine verdict
    let verdict: string;
    if (isAI === "yes" && aiConfidence > 70) {
      verdict = "AI-Generated Image";
    } else if (isAI === "yes") {
      verdict = "Likely AI-Generated";
    } else if (isManipulated === "yes") {
      verdict = "Digitally Manipulated";
    } else if (isAI === "uncertain" || isManipulated === "uncertain") {
      verdict = "Suspicious — Needs Further Review";
    } else if (truthScore >= 85) {
      verdict = "Authentic Image";
    } else if (truthScore >= 70) {
      verdict = "Likely Authentic";
    } else {
      verdict = parsed.verdict || "Inconclusive";
    }

    if (detectedIssues.length === 0) {
      detectedIssues.push({
        text: "No signs of AI generation or manipulation detected",
        severity: "low" as const,
      });
    }

    const analysis: ImageAnalysisResult = {
      truthScore,
      confidenceLevel: Math.min(95, truthScore + 5),
      verdict,
      detectedIssues,
      factVerification,
      metadata,
      sentimentAnalysis: {
        tone: isAI === "yes" ? "AI-Generated Content" : "Visual Media",
        emotionalLanguage: parsed.artifacts || [],
        capsUsage: 0,
      },
      summary:
        parsed.summary ||
        `Image forensic analysis complete. Truth score: ${truthScore}%.`,
    };

    return analysis;
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
