import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "fallback_secret_key_change_in_production";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Missing email or password" },
        { status: 400 },
      );
    }

    // 1. Fetch user by email
    const [users] = await pool.query(
      "SELECT id, full_name, email, password_hash FROM users WHERE email = ? LIMIT 1",
      [email],
    );

    const matchUsers = users as any[];

    if (matchUsers.length === 0) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const user = matchUsers[0];

    // 2. Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // 3. Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, fullName: user.full_name },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    return NextResponse.json({
      message: "Login successful",
      user: { id: user.id, email: user.email, fullName: user.full_name },
      token,
    });
  } catch (error) {
    console.error("Signin error:", error);
    return NextResponse.json(
      { error: "Internal server error during login" },
      { status: 500 },
    );
  }
}
