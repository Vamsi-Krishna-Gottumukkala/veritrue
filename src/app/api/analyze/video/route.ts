import { NextRequest, NextResponse } from "next/server";

interface VideoAnalysisResult {
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
  frameAnalysis?: {
    totalFrames: number;
    fakeFrames: number;
    frameScores: Array<{
      timestamp: number;
      label: string;
      confidence: number;
      fake_prob: number;
      face_detected: boolean;
    }>;
  };
  summary: string;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("video") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Video file is required" },
        { status: 400 },
      );
    }

    const validTypes = [
      "video/mp4",
      "video/webm",
      "video/avi",
      "video/quicktime",
      "video/x-msvideo",
    ];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Supported: MP4, WEBM, AVI, MOV" },
        { status: 400 },
      );
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Max size: 50MB" },
        { status: 400 },
      );
    }

    console.log("=== VIDEO ANALYSIS REQUEST ===");
    console.log(
      `File: ${file.name}, Size: ${(file.size / 1024 / 1024).toFixed(1)}MB`,
    );

    // Call Python ML Service (no Gemini fallback for video)
    try {
      const mlFormData = new FormData();
      mlFormData.append("file", file);

      const mlResponse = await fetch("http://localhost:8000/predict/video", {
        method: "POST",
        body: mlFormData,
        signal: AbortSignal.timeout(60000), // 60s timeout for video processing
      });

      if (!mlResponse.ok) {
        const error = await mlResponse.text();
        throw new Error(`ML service error: ${error}`);
      }

      const mlResult = await mlResponse.json();
      console.log("ML video result:", JSON.stringify(mlResult));

      const isFake = mlResult.label === "fake";
      const truthScore = isFake
        ? Math.round((1 - mlResult.confidence) * 100)
        : Math.round(mlResult.confidence * 100);

      const analysis: VideoAnalysisResult = {
        truthScore,
        confidenceLevel: Math.round(mlResult.confidence * 100),
        verdict:
          mlResult.label === "unknown"
            ? "No Faces Detected"
            : isFake
              ? "Deepfake Detected"
              : "Authentic Video",
        detectedIssues: isFake
          ? [
              {
                text: `Deepfake detected: ${mlResult.fake_frame_count}/${mlResult.frame_count} analyzed frames flagged as fake`,
                severity: "high" as const,
              },
            ]
          : mlResult.label === "unknown"
            ? [
                {
                  text: "No faces detected in the video. Deepfake analysis requires visible faces.",
                  severity: "medium" as const,
                },
              ]
            : [
                {
                  text: `Video appears authentic. ${mlResult.frame_count} frames analyzed, no deepfake indicators found.`,
                  severity: "low" as const,
                },
              ],
        factVerification: [],
        sentimentAnalysis: {
          tone: isFake ? "Manipulated Content" : "Authentic Video",
          emotionalLanguage: [],
          capsUsage: 0,
        },
        frameAnalysis: {
          totalFrames: mlResult.frame_count,
          fakeFrames: mlResult.fake_frame_count,
          frameScores: mlResult.frame_scores,
        },
        summary: `Video analysis: ${mlResult.label} (confidence: ${Math.round(mlResult.confidence * 100)}%). Analyzed ${mlResult.frame_count} frames, ${mlResult.fake_frame_count} flagged as fake.`,
      };

      return NextResponse.json(analysis);
    } catch (mlError) {
      console.error("ML video service error:", mlError);
      return NextResponse.json(
        {
          error: `Video analysis failed. Make sure the ML service is running: cd ml_service && python app.py. Error: ${mlError instanceof Error ? mlError.message : "Unknown error"}`,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Video analysis error:", error);
    return NextResponse.json(
      {
        error: `Video analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    );
  }
}
