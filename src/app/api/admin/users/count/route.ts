import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    // Attempt to query the users table for a count
    // The user will need to have created table "users" in their XAMPP MySQL environment.
    const [rows] = await pool.query("SELECT COUNT(*) as count FROM users");
    const count = (rows as any)[0].count;

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Database query failed:", error);

    // Return a 500 so the frontend can catch it and display the warning alert appropriately.
    return NextResponse.json(
      {
        error: 'Database connection failed or table "users" not found',
        count: 0,
      },
      { status: 500 },
    );
  }
}
