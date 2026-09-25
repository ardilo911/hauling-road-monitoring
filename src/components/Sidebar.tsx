"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Profile, Mitra } from "@/lib/types";

const NAV = [
  { href: "wro", label: "Work Request Order", icon: "📋" },
  { href: "rekap", label: "Rekap Pekerjaan", icon: "🛣️" },
  { href: "database", label: "Database", icon: "🗄️" },
  { href: "bast", label: "BAST", icon: "✅" },
];

export function Sidebar({ mitra, profile }: { mitra: Mitra; profile: Profile | null }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-shrink-0 flex-col bg-graphite-900 text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="text-sm font-semibold tracking-tight">Hauling Guard</div>
        <div className="mt-0.5 text-xs text-white/50">Monitoring Garansi Hauling Road</div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map((item) => {
          const active = pathname?.includes(`/${item.href}`);
          return (
            <Link
              key={item.href}
              href={`/dashboard/${mitra}/${item.href}`}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                active ? "bg-amber-500 text-graphite-900 font-medium" : "text-white/80 hover:bg-white/10"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      {profile?.role === "admin" && (
        <div className="space-y-1 border-t border-white/10 px-3 py-4">
          <div className="px-3 pb-1 text-[11px] text-white/40">Admin</div>
          <Link
            href={`/dashboard/${mitra}/users`}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
              pathname?.includes("/users") ? "bg-amber-500 text-graphite-900 font-medium" : "text-white/80 hover:bg-white/10"
            }`}
          >
            <span>👤</span> Manajemen User
          </Link>
          <Link
            href={`/dashboard/${mitra}/settings`}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
              pathname?.includes("/settings") ? "bg-amber-500 text-graphite-900 font-medium" : "text-white/80 hover:bg-white/10"
            }`}
          >
            <span>⚙️</span> Pengaturan
          </Link>
        </div>
      )}
    </aside>
  );
}
