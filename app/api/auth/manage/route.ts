import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  const correctPassword = process.env.MANAGE_PASSWORD;

  if (!correctPassword) {
    return NextResponse.json(
      { error: "Password not configured" },
      { status: 500 },
    );
  }

  if (password === correctPassword) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid password" }, { status: 401 });
}
