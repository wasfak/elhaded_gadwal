import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, R2_BUCKET } from "@/lib/r2";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  const { count } = (await req.json()) as { count: number };

  if (!count || count < 1)
    return NextResponse.json({ error: "count must be >= 1" }, { status: 400 });

  const batch = randomUUID(); // groups one submission's photos

  const uploads = await Promise.all(
    Array.from({ length: count }).map(async (_, i) => {
      const key = `submissions/${batch}/${i}-${randomUUID()}.webp`;
      const cmd = new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        ContentType: "image/webp",
      });
      const url = await getSignedUrl(r2, cmd, { expiresIn: 300 }); // 5 min
      return { key, url };
    })
  );

  return NextResponse.json({ uploads });
}