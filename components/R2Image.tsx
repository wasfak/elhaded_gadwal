"use client";

import { useState } from "react";

export default function R2Image({
  url,
  alt,
  onClick,
}: {
  url?: string;
  alt: string;
  onClick?: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  if (!url) {
    return <div className="h-16 w-16 animate-pulse rounded bg-muted" />;
  }
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      onLoad={() => setLoaded(true)}
      onClick={onClick}
      className={`h-16 w-16 cursor-pointer rounded border object-cover transition-opacity ${
        loaded ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}