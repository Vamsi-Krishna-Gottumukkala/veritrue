import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { GoogleGenerativeAI } from "@google/generative-ai";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
// @ts-ignore
import ffprobeStatic from "ffprobe-static";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

// Configure ffmpeg to use the static binary
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}
if (ffprobeStatic && ffprobeStatic.path) {
  ffmpeg.setFfprobePath(ffprobeStatic.path);
}

const JWT_SECRET =
  process.env.JWT_SECRET || "fallback_secret_key_change_in_production";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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

    // Video Processing with Gemini Vision
    try {
      if (
        !process.env.GEMINI_API_KEY ||
        process.env.GEMINI_API_KEY === "your_gemini_api_key_here"
      ) {
        throw new Error("Gemini API key is not configured");
      }

      console.log("Saving video to temporary file for frame extraction...");
      const buffer = Buffer.from(await file.arrayBuffer());
      const tempDir = await fs.mkdtemp(
        path.join(os.tmpdir(), "veritrue-video-"),
      );
      const videoPath = path.join(tempDir, `input_${Date.now()}.mp4`);
      await fs.writeFile(videoPath, buffer);

      console.log("Extracting 4 keyframes across the video using ffmpeg...");
      const framesDir = path.join(tempDir, "frames");
      await fs.mkdir(framesDir);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(videoPath)
          .on("end", () => resolve())
          .on("error", (err) => reject(err))
          .screenshots({
            count: 4,
            folder: framesDir,
            filename: "frame-at-%s-seconds.jpg",
            size: "1280x720",
          });
      });

      console.log("Frames extracted. Reading frames for Gemini...");
      const frameFiles = await fs.readdir(framesDir);
      const frameParts = [];

      for (const fileName of frameFiles) {
        const filePath = path.join(framesDir, fileName);
        const frameBuffer = await fs.readFile(filePath);
        frameParts.push({
          inlineData: {
            data: frameBuffer.toString("base64"),
            mimeType: "image/jpeg",
          },
        });
      }

      // Cleanup Temp Files asynchronously
      fs.rm(tempDir, { recursive: true, force: true }).catch((err) =>
        console.error("Failed to clean up temp dir:", err),
      );

      console.log("Sending video frames to Gemini 2.5 Flash for analysis...");
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `You are a forensic video analyst and deepfake detection expert. 
I have provided 4 keyframes extracted from a single video file. Examine these frames collectively for any signs of AI generation, digital manipulation, deepfake artifacts, temporal inconsistencies, or factual manipulation.

Analyze the frames for:
1. Deepfake artifacts (warping around the face/edges, blurry borders, unnatural teeth/eyes).
2. Temporal inconsistencies between frames (objects abruptly appearing/disappearing, lighting changes that make no physical sense).
3. AI Generation flaws (implausible physics, extra/missing fingers on people, unnatural textures).
4. Identify any factual claims presented visually or via embedded text in the frames.

Based on your analysis, provide a structured JSON response EXACTLY matching this schema (do not include markdown block wrapping):
{
  "isAIGenerated": "yes|no|uncertain",
  "isManipulated": "yes|no|uncertain",
  "aiConfidence": <number 0-100 indicating confidence that it is fake/AI>,
  "detectedIssues": [{"text": "issue description", "severity": "high|medium|low"}],
  "factVerification": [{"claim": "any visual text/claim", "status": "true|false|disputed", "source": "reason"}],
  "truthScore": <number 0-100 where 100 is perfectly authentic and 0 is entirely fake/manipulated>,
  "verdict": "<short 3-5 word verdict>",
  "summary": "<2-3 sentence forensic summary of your findings across the frames>"
}`;

      // Call Gemini API
      const result = await model.generateContent([prompt, ...frameParts]);
      const responseText = result.response.text();

      // Extract JSON from response
      let jsonString = responseText;
      const codeBlockMatch =
        responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
        responseText.match(/```\s*([\s\S]*?)\s*```/);

      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1];
      } else {
        const firstBrace = responseText.indexOf("{");
        const lastBrace = responseText.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1) {
          jsonString = responseText.substring(firstBrace, lastBrace + 1);
        }
      }

      const parsed = JSON.parse(jsonString);

      // Construct Final Analysis API Response
      const truthScore = Math.max(
        5,
        Math.min(100, Number(parsed.truthScore) || 50),
      );
      const confidence = Number(parsed.aiConfidence) || 80;

      const analysis: VideoAnalysisResult = {
        truthScore: truthScore,
        confidenceLevel: Math.min(95, truthScore + 5),
        verdict: parsed.verdict || "Deepfake Analysis Complete",
        detectedIssues: parsed.detectedIssues || [],
        factVerification: parsed.factVerification || [],
        sentimentAnalysis: {
          tone:
            parsed.isAIGenerated === "yes"
              ? "AI-Generated Media"
              : "Authentic Video",
          emotionalLanguage: [],
          capsUsage: 0,
        },
        frameAnalysis: {
          totalFrames: 4,
          fakeFrames: truthScore < 40 ? 4 : 0,
          frameScores: [],
        },
        summary:
          parsed.summary ||
          `Video analysis complete based on ${frameParts.length} keyframes.`,
      };

      // Try to save to database if user is authenticated
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
                "video",
                `Video uploaded (${file.name})`,
                analysis.truthScore,
                analysis.verdict,
              ],
            );
          }
        }
      } catch (dbError) {
        console.error("Database error (non-critical):", dbError);
      }

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
