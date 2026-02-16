import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "No API key configured" },
      { status: 500 },
    );
  }

  try {
    // Try to list models via REST API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "API error",
          details: data,
          apiKeyPrefix: apiKey.substring(0, 10) + "...",
        },
        { status: response.status },
      );
    }

    // Filter to show only generative models
    const models =
      data.models?.map(
        (m: {
          name: string;
          displayName: string;
          supportedGenerationMethods: string[];
        }) => ({
          name: m.name,
          displayName: m.displayName,
          methods: m.supportedGenerationMethods,
        }),
      ) || [];

    return NextResponse.json({
      success: true,
      apiKeyPrefix: apiKey.substring(0, 10) + "...",
      availableModels: models,
      count: models.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch models",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
