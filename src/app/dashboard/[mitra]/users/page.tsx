"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useSession } from "@/lib/useSession";
import type { Profile, Mitra, UserRole } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

const MITRA_OPTIONS: Mitra[] = ["wasco", "khs"];

export default function UsersPage() {
  const router = useRouter();
  const params = useParams<{ mitra: string }>();
  const mitra = params.mitra as Mitra;
  const { profile: me, loading: sessionLoading } = useSession();

  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionLoading && me && me.role !== "admin") router.replace(`/dashboard/${mitra}/wro`);
  }, [sessionLoading, me, mitra, router]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("username");
    setUsers((data as Profile[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateRole(id: string, role: UserRole) {
    await supabase.from("profiles").update({ role }).eq("id", id);
    load();
  }

  async function toggleMitraAccess(u: Profile, m: Mitra) {
    const has = u.akses_mitra.includes(m);
    const next = has ? u.akses_mitra.filter((x) => x !== m) : [...u.akses_mitra, m];
    await supabase.from("profiles").update({ akses_mitra: next }).eq("id", u.id);
    load();
  }

  async function toggleActive(u: Profile) {
    await supabase.from("profiles").update({ is_active: !u.is_active }).eq("id", u.id);
    load();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-graphite-900">Manajemen User</h1>
        <p className="text-sm text-gray-500">
          Atur peran dan akses mitra untuk setiap user. Untuk membuat akun baru, tambahkan user lewat Supabase
          Dashboard &gt; Authentication &gt; Users — profil akan otomatis muncul di sini, lalu atur akses di bawah.
        </p>
      </div>

      <div className="scroll-x rounded-lg border border-gray-200 bg-white">
        <table className="data-table">
          <thead>
            <tr>
              <th>Username</th><th>Nama</th><th>Role</th><th>Akses Mitra</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="py-6 text-center text-gray-400">Memuat...</td></tr>}
            {!loading && users.map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.nama}</td>
                <td>
                  <Select value={u.role} onChange={(e) => updateRole(u.id, e.target.value as UserRole)}>
                    <option value="user">User Mitra</option>
                    <option value="admin">Admin</option>
                  </Select>
                </td>
                <td className="space-x-2">
                  {MITRA_OPTIONS.map((m) => (
                    <label key={m} className="mr-2 inline-flex items-center gap-1 text-xs">
                      <input type="checkbox" checked={u.akses_mitra.includes(m)} onChange={() => toggleMitraAccess(u, m)} />
                      {m.toUpperCase()}
                    </label>
                  ))}
                </td>
                <td>
                  <button onClick={() => toggleActive(u)}>
                    <Badge tone={u.is_active ? "green" : "red"}>{u.is_active ? "Aktif" : "Nonaktif"}</Badge>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
