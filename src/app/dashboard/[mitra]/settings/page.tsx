"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useSession } from "@/lib/useSession";
import type { Mitra } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";

export default function SettingsPage() {
  const router = useRouter();
  const params = useParams<{ mitra: string }>();
  const mitra = params.mitra as Mitra;
  const { profile: me, loading: sessionLoading } = useSession();

  const [retentionMonths, setRetentionMonths] = useState(6);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionLoading && me && me.role !== "admin") router.replace(`/dashboard/${mitra}/wro`);
  }, [sessionLoading, me, mitra, router]);

  useEffect(() => {
    supabase
      .from("settings")
      .select("retention_months")
      .single()
      .then(({ data }) => {
        if (data) setRetentionMonths(data.retention_months);
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    await supabase.from("settings").update({ retention_months: retentionMonths }).eq("id", 1);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-md space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-graphite-900">Pengaturan</h1>
        <p className="text-sm text-gray-500">Konfigurasi berlaku untuk seluruh mitra.</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <Field label="Masa Retensi (bulan)">
          <Input
            type="number"
            min={1}
            value={loading ? "" : retentionMonths}
            onChange={(e) => setRetentionMonths(parseInt(e.target.value || "0", 10))}
          />
        </Field>
        <p className="mt-2 text-xs text-gray-400">
          Pekerjaan baru yang beririsan dengan area yang sudah dikerjakan dalam {retentionMonths} bulan terakhir tidak
          dapat dibayar (dikoreksi otomatis di halaman BAST).
        </p>
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={handleSave} disabled={loading}>Simpan</Button>
          {saved && <span className="text-sm text-signal-green">Tersimpan.</span>}
        </div>
      </div>
    </div>
  );
}
