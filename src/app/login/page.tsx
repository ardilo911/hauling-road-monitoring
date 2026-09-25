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

    // Login pakai email Supabase Auth. Jika user mengetik username, cari email-nya lewat profiles dulu.
    let email = usernameOrEmail;
    if (!email.includes("@")) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("username", usernameOrEmail)
        .maybeSingle();
      if (!prof) {
        setError("Username atau password salah.");
        setLoading(false);
        return;
      }
      // Supabase auth butuh email; skema ini mengasumsikan username disamakan dengan bagian lokal email.
      // Jika Anda menyimpan email penuh di profiles, sesuaikan query di atas untuk mengambil kolom email.
      email = usernameOrEmail;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError("Username atau password salah.");
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
          <Field label="Username / Email">
            <Input
              required
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              placeholder="nama.pengguna atau email"
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
