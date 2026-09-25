"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";
import type { Mitra } from "@/lib/types";

const CARDS: { id: Mitra; label: string; desc: string }[] = [
  { id: "wasco", label: "Wasco", desc: "Monitoring hauling road mitra Wasco" },
  { id: "khs", label: "KHS", desc: "Monitoring hauling road mitra KHS" },
];

export default function MitraPage() {
  const router = useRouter();
  const { profile, loading } = useSession();

  useEffect(() => {
    if (!loading && !profile) router.replace("/login");
  }, [loading, profile, router]);

  const akses = profile?.akses_mitra ?? [];
  const visible = profile?.role === "admin" ? CARDS : CARDS.filter((c) => akses.includes(c.id));

  useEffect(() => {
    if (!loading && profile && visible.length === 1) {
      router.replace(`/dashboard/${visible[0].id}/wro`);
    }
  }, [loading, profile, visible, router]);

  if (loading) return <div className="flex h-screen items-center justify-center text-sm text-gray-400">Memuat...</div>;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-asphalt-50 px-4">
      <h1 className="mb-1 text-xl font-semibold text-graphite-900">Pilih Mitra</h1>
      <p className="mb-8 text-sm text-gray-500">Semua data akan difilter sesuai mitra yang Anda pilih.</p>
      <div className="flex flex-wrap justify-center gap-5">
        {visible.length === 0 && (
          <p className="text-sm text-signal-red">Akun Anda belum memiliki akses ke mitra manapun. Hubungi admin.</p>
        )}
        {visible.map((c) => (
          <button
            key={c.id}
            onClick={() => router.push(`/dashboard/${c.id}/wro`)}
            className="w-56 rounded-xl border border-gray-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-lg font-semibold text-graphite-900">{c.label}</div>
            <div className="mt-1 text-xs text-gray-500">{c.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
