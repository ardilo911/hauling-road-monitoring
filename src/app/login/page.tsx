"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Supabase Auth selalu login pakai email. Kolom `username` di profiles hanya dipakai
    // untuk tampilan, bukan untuk login — mencari email lewat username sebelum login butuh
    // membaca tabel profiles saat belum ada sesi (anonymous), yang sengaja tidak diizinkan
    // oleh RLS supaya alamat email pengguna lain tidak bisa ditebak/di-enumerasi dari luar.
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: usernameOrEmail, password });
    if (signInError) {
      setError("Email atau password salah.");
      setLoading(false);
      return;
    }
    router.push("/mitra");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-graphite-900 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="text-lg font-semibold text-graphite-900">Hauling Guard</div>
          <div className="mt-1 text-sm text-gray-500">Monitoring Garansi Hauling Road</div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Email">
            <Input
              required
              type="email"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              placeholder="nama@perusahaan.com"
              autoFocus
            />
          </Field>
          <Field label="Password">
            <Input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>
          {error && <p className="text-sm text-signal-red">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full justify-center">
            {loading ? "Memproses..." : "Masuk"}
          </Button>
        </form>
      </div>
    </div>
  );
}
