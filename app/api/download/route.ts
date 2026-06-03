import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "@/lib/r2";

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  const obj = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }));
  const bytes = await obj.Body!.transformToByteArray();

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": obj.ContentType ?? "image/webp",
      "Cache-Control": "no-store",
    },
  });
}