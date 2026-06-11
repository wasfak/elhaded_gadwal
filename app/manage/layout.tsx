"use client";

import PasswordGuard from "@/components/PasswordGuard";

export default function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PasswordGuard>{children}</PasswordGuard>;
}
