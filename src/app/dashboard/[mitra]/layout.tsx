"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "@/lib/useSession";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import type { Mitra } from "@/lib/types";

export default function DashboardMitraLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useParams<{ mitra: string }>();
  const mitra = params.mitra as Mitra;
  const { profile, loading } = useSession();

  useEffect(() => {
    if (loading) return;
    if (!profile) {
      router.replace("/login");
      return;
    }
    const allowed = profile.role === "admin" || profile.akses_mitra.includes(mitra);
    if (!allowed) router.replace("/mitra");
  }, [loading, profile, mitra, router]);

  if (loading || !profile) {
    return <div className="flex h-screen items-center justify-center text-sm text-gray-400">Memuat...</div>;
  }

  return (
    <div className="flex h-screen bg-asphalt-50">
      <Sidebar mitra={mitra} profile={profile} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar mitra={mitra} profile={profile} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
