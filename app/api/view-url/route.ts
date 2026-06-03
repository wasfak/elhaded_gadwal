import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, R2_BUCKET } from "@/lib/r2";

export async function POST(req: Request) {
  const { keys } = (await req.json()) as { keys: string[] };
  if (!Array.isArray(keys) || keys.length === 0)
    return NextResponse.json({ urls: {} });

  const entries = await Promise.all(
    keys.map(async (key) => {
      const cmd = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key });
      const url = await getSignedUrl(r2, cmd, { expiresIn: 3600 }); // 1 hr
      return [key, url] as const;
    })
  );

  return NextResponse.json({ urls: Object.fromEntries(entries) });
}