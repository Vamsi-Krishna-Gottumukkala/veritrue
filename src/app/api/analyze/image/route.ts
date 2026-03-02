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
    let usedMLModel = false;

    // Step 1: Try Python ML Service
    try {
      console.log("Trying ML image model at http://localhost:8000...");
      const mlFormData = new FormData();
      mlFormData.append("file", file);

      const mlResponse = await fetch("http://localhost:8000/predict/image", {
        method: "POST",
        body: mlFormData,
        signal: AbortSignal.timeout(15000),
      });

      if (mlResponse.ok) {
        const mlResult = await mlResponse.json();
        console.log("ML image result:", JSON.stringify(mlResult));

        if (mlResult.confidence >= 0.7) {
          const isFake = mlResult.label === "fake";
          const truthScore = isFake
            ? Math.round((1 - mlResult.confidence) * 100)
            : Math.round(mlResult.confidence * 100);

          analysis = {
            truthScore,
            confidenceLevel: Math.round(mlResult.confidence * 100),
            verdict: isFake ? "AI-Generated / Fake Image" : "Authentic Image",
            detectedIssues: isFake
              ? [
                  {
                    text: `ML model detected this as a fake/AI-generated image (${Math.round(mlResult.confidence * 100)}% confidence)`,
                    severity: "high" as const,
                  },
                ]
              : [
                  {
                    text: `ML model classified this as a real image (${Math.round(mlResult.confidence * 100)}% confidence)`,
                    severity: "low" as const,
                  },
                ],
            factVerification: [],
            metadata: {
              format: file.type,
              fileSize: file.size,
              hasExif: false,
            },
            sentimentAnalysis: {
              tone: isFake ? "AI-Generated Content" : "Authentic",
              emotionalLanguage: [],
              capsUsage: 0,
            },
            summary: `ML model analysis: ${mlResult.label} (confidence: ${Math.round(mlResult.confidence * 100)}%). Probabilities: fake=${Math.round((mlResult.probabilities?.fake || 0) * 100)}%, real=${Math.round((mlResult.probabilities?.real || 0) * 100)}%.`,
          };
          usedMLModel = true;
          console.log(
            "Using ML image result. Truth score:",
            analysis.truthScore,
          );
        } else {
          console.log(
            `ML image confidence too low (${mlResult.confidence}), falling back to Gemini`,
          );
        }
      }
    } catch (mlError) {
      console.log(
        "ML image service unavailable:",
        mlError instanceof Error ? mlError.message : mlError,
      );
    }

    // Step 2: Gemini fallback
    if (!usedMLModel) {
      if (
        !process.env.GEMINI_API_KEY ||
        process.env.GEMINI_API_KEY === "your_gemini_api_key_here"
      ) {
        return NextResponse.json(
          {
            error:
              "Neither ML service nor Gemini API is available. Start the ML service with: cd ml_service && python app.py",
          },
          { status: 500 },
        );
      }

      analysis = await performGeminiVisionAnalysis(
        base64Image,
        file.type,
        bytes,
        file.size,
      );
    }

    // Save to DB if authenticated
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
          truth_score: analysis!.truthScore,
          verdict: analysis!.verdict,
          detected_issues: analysis!.detectedIssues,
          fact_verification: analysis!.factVerification,
          sentiment_analysis: analysis!.sentimentAnalysis,
          summary: analysis!.summary,
        });

        await supabase.rpc("increment_verification_count", {
          p_user_id: user.id,
        });
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

    return {
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
