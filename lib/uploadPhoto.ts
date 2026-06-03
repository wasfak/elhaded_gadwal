import imageCompression from "browser-image-compression";

const options = {
  maxWidthOrHeight: 1600,
  maxSizeMB: 0.5,
  fileType: "image/webp" as const,
  useWebWorker: true,
};

export async function compressToWebp(file: File): Promise<Blob> {
  return imageCompression(file, options);
}

// uploads an already-compressed blob to a presigned PUT url
export async function putToR2(url: string, blob: Blob): Promise<void> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "image/webp" },
    body: blob,
  });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
}