import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Submission from "@/models/Submission";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const { id } = await params;
  const { status } = await req.json();

  if (status !== "sent" && status !== "not_sent")
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });

  const updated = await Submission.findByIdAndUpdate(
    id,
    { status, statusUpdatedAt: new Date() },
    { new: true }
  ).lean();

  if (!updated)
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });

  return NextResponse.json(updated);
}