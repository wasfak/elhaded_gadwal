import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Branch from "@/models/Branch";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const { id } = await params;
  const { active } = await req.json();

  if (typeof active !== "boolean")
    return NextResponse.json({ error: "active must be true/false." }, { status: 400 });

  const updated = await Branch.findByIdAndUpdate(id, { active }, { new: true }).lean();
  if (!updated)
    return NextResponse.json({ error: "Branch not found." }, { status: 404 });

  return NextResponse.json(updated);
}