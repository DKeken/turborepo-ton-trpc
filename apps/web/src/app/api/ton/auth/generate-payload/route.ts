import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function GET() {
  try {
    // Generate a random payload for authentication
    const payload = randomBytes(32).toString("hex");
    
    return NextResponse.json({ payload });
  } catch (error) {
    console.error("Error generating auth payload:", error);
    return NextResponse.json(
      { error: "Failed to generate auth payload" },
      { status: 500 }
    );
  }
} 