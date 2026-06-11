"use client";

import PasswordGuard from "@/components/PasswordGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PasswordGuard>{children}</PasswordGuard>;
}
