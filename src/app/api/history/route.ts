import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { pool } from "@/lib/db";

const JWT_SECRET =
  process.env.JWT_SECRET || "fallback_secret_key_change_in_production";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let userId;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    userId = decoded.userId;
  } catch (error) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  try {
    const [rows] = await pool.query(
      "SELECT id, content_type, content_preview, truth_score, verdict, created_at FROM analysis_history WHERE user_id = ? ORDER BY created_at DESC",
      [userId],
    );

    return NextResponse.json({ history: rows });
  } catch (error) {
    console.error("Error fetching history:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 },
    );
  }
}
