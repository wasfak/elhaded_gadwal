import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Item from "@/models/Item";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const { id } = await params;
  const { active } = await req.json();

  if (typeof active !== "boolean")
    return NextResponse.json({ error: "active must be true/false." }, { status: 400 });

  const updated = await Item.findByIdAndUpdate(id, { active }, { new: true }).lean();
  if (!updated)
    return NextResponse.json({ error: "Item not found." }, { status: 404 });

  return NextResponse.json(updated);
}