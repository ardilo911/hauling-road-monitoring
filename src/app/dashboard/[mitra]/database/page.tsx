"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { formatNumberID, formatDateID, lastNPeriods, monthLabelID } from "@/lib/format";
import { REKAP_KATEGORI_LABEL, type WorkRecord, type Mitra, type RekapKategori } from "@/lib/types";
import { Input, Field } from "@/components/ui/Input";
import { ExportButtons } from "@/components/ExportButtons";

function currentPeriode() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const KATEGORI_TABS: (RekapKategori | "periode")[] = [
  "periode",
  "double_coat",
  "reseal_1_coat",
  "heavy_patches_recycling",
  "heavy_patches_upgrading",
  "tambalan",
];

export default function DatabasePage() {
  const params = useParams<{ mitra: string }>();
  const mitra = params.mitra as Mitra;

  const [periode, setPeriode] = useState(currentPeriode());
  const [tab, setTab] = useState<(typeof KATEGORI_TABS)[number]>("periode");
  const [rows, setRows] = useState<WorkRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const periods = useMemo(() => lastNPeriods(periode, 6), [periode]);
  const rangeStart = `${periods[0]}-01`;
  const rangeEndDate = new Date(Number(periode.split("-")[0]), Number(periode.split("-")[1]), 0);
  const rangeEnd = rangeEndDate.toISOString().slice(0, 10);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("work_records")
      .select("*")
      .eq("mitra", mitra)
      .gte("work_date", rangeStart)
      .lte("work_date", rangeEnd)
      .order("work_date", { ascending: false });
    setRows((data as WorkRecord[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mitra, periode]);

  const rowsForTab = useMemo(() => (tab === "periode" ? rows : rows.filter((r) => r.kategori === tab)), [rows, tab]);

  const summaryPerKategori = useMemo(() => {
    const totals: Record<RekapKategori, number> = {
      double_coat: 0, reseal_1_coat: 0, heavy_patches_recycling: 0, heavy_patches_upgrading: 0, tambalan: 0,
    };
    for (const r of rows) totals[r.kategori] += r.capex_p * r.capex_l + r.opex_p * r.opex_l + r.reseal2_p * r.reseal2_l;
    return totals;
  }, [rows]);

  const exportRows = rowsForTab.map((r) => [
    formatDateID(r.work_date), r.km_start, r.km_finish, r.area_nama ?? "-", r.line,
    formatNumberID(r.capex_p * r.capex_l, 1), formatNumberID(r.opex_p * r.opex_l, 1),
    formatNumberID(r.reseal2_p * r.reseal2_l, 1), formatNumberID(r.repair_p * r.repair_l, 1),
    formatNumberID(r.opname_p * r.opname_l, 1), r.keterangan ?? "-", r.remark_pekerjaan,
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-graphite-900">Database</h1>
          <p className="text-sm text-gray-500">
            Riwayat pekerjaan 6 bulan terakhir ({monthLabelID(periods[0])} – {monthLabelID(periode)}). Basis koreksi retensi untuk BAST.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <Field label="Periode Akhir">
            <Input type="month" value={periode} onChange={(e) => setPeriode(e.target.value)} />
          </Field>
          {tab !== "periode" && (
            <ExportButtons
              filename={`database-${tab}-${mitra}-${periode}`}
              title={`Database ${REKAP_KATEGORI_LABEL[tab as RekapKategori]} ${mitra.toUpperCase()} (6 bulan s.d ${periode})`}
              columns={["Tgl", "KM Start", "KM Finish", "Area", "Line", "CAPEX Luas", "OPEX Luas", "Reseal2 Luas", "Repair Luas", "Opname Luas", "Keterangan", "Remark"]}
              rows={exportRows}
            />
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {KATEGORI_TABS.map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              tab === k ? "bg-graphite-900 text-white" : "bg-white text-graphite-700 border border-gray-200 hover:bg-asphalt-100"
            }`}
          >
            {k === "periode" ? "Periode" : REKAP_KATEGORI_LABEL[k]}
          </button>
        ))}
      </div>

      {tab === "periode" ? (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-graphite-900">Ringkasan 6 Bulan Terakhir</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {(Object.keys(REKAP_KATEGORI_LABEL) as RekapKategori[]).map((k) => (
              <div key={k} className="rounded-md bg-asphalt-50 p-3">
                <div className="text-xs text-gray-500">{REKAP_KATEGORI_LABEL[k]}</div>
                <div className="mt-1 text-base font-semibold text-graphite-900">{formatNumberID(summaryPerKategori[k], 1)} m²</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="scroll-x rounded-lg border border-gray-200 bg-white">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tgl</th><th>KM Start</th><th>KM Finish</th><th>Area</th><th>Line</th>
                <th>CAPEX Luas</th><th>OPEX Luas</th><th>Reseal2 Luas</th><th>Repair Luas</th><th>Opname Luas</th>
                <th>Keterangan</th><th>Remark</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={12} className="py-6 text-center text-gray-400">Memuat...</td></tr>}
              {!loading && rowsForTab.length === 0 && (
                <tr><td colSpan={12} className="py-8 text-center text-gray-400">Tidak ada data pada rentang 6 bulan ini.</td></tr>
              )}
              {rowsForTab.map((r) => (
                <tr key={r.id}>
                  <td>{formatDateID(r.work_date)}</td>
                  <td className="chainage">{r.km_start}</td>
                  <td className="chainage">{r.km_finish}</td>
                  <td>{r.area_nama ?? "-"}</td>
                  <td>{r.line}</td>
                  <td>{formatNumberID(r.capex_p * r.capex_l, 1)}</td>
                  <td>{formatNumberID(r.opex_p * r.opex_l, 1)}</td>
                  <td>{formatNumberID(r.reseal2_p * r.reseal2_l, 1)}</td>
                  <td>{formatNumberID(r.repair_p * r.repair_l, 1)}</td>
                  <td>{formatNumberID(r.opname_p * r.opname_l, 1)}</td>
                  <td className="max-w-[160px] truncate">{r.keterangan ?? "-"}</td>
                  <td>{r.remark_pekerjaan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
