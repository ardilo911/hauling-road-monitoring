"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Profile, Mitra } from "@/lib/types";
import { Button } from "./ui/Button";

export function Topbar({ mitra, profile }: { mitra: Mitra; profile: Profile | null }) {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-2">
        <span className="rounded bg-asphalt-100 px-2.5 py-1 text-xs font-semibold uppercase text-graphite-700">
          {mitra}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right text-sm">
          <div className="font-medium text-graphite-900">{profile?.nama ?? "..."}</div>
          <div className="text-xs text-gray-400">{profile?.role === "admin" ? "Administrator" : "User Mitra"}</div>
        </div>
        {(profile?.akses_mitra?.length ?? 0) > 1 && (
          <Button variant="secondary" onClick={() => router.push("/mitra")}>
            Ganti Mitra
          </Button>
        )}
        <Button variant="ghost" onClick={handleLogout}>
          Keluar
        </Button>
      </div>
    </header>
  );
}
