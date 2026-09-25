"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { formatNumberID, formatDateID, lastNPeriods } from "@/lib/format";
import { chainageToMeters } from "@/lib/chainage";
import { calculateRetentionCorrection, type CorrectionResult } from "@/lib/retention";
import {
  WORK_ITEMS,
  REKAP_KATEGORI_LABEL,
  KATEGORI_TO_WORK_ITEM,
  type WorkRecord,
  type Mitra,
  type WorkItem,
  type RekapKategori,
  type Bast,
} from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { ExportButtons } from "@/components/ExportButtons";

function currentPeriode() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface RowResult {
  record: WorkRecord;
  totalAreaM2: number;
  correction: CorrectionResult;
  workItem: WorkItem;
}

export default function BastPage() {
  const params = useParams<{ mitra: string }>();
  const mitra = params.mitra as Mitra;

  const [periode, setPeriode] = useState(currentPeriode());
  const [retentionMonths, setRetentionMonths] = useState(6);
  const [newRecords, setNewRecords] = useState<WorkRecord[]>([]);
  const [dbRecords, setDbRecords] = useState<WorkRecord[]>([]);
  const [bastRow, setBastRow] = useState<Bast | null>(null);
  const [loading, setLoading] = useState(true);
  const [drillDown, setDrillDown] = useState<RowResult | null>(null);

  async function load() {
    setLoading(true);
    const { data: settingsData } = await supabase.from("settings").select("retention_months").single();
    const months = settingsData?.retention_months ?? 6;
    setRetentionMonths(months);

    const { data: newData } = await supabase
      .from("work_records")
      .select("*")
      .eq("mitra", mitra)
      .gte("work_date", `${periode}-01`)
      .lte("work_date", `${periode}-31`);
    setNewRecords((newData as WorkRecord[]) ?? []);

    // Ambil kandidat database mundur (retention_months + 1) bulan sebelum awal periode, sebagai basis retensi
    const periods = lastNPeriods(periode, months + 1);
    const rangeStart = `${periods[0]}-01`;
    const rangeEndDate = new Date(Number(periode.split("-")[0]), Number(periode.split("-")[1]) - 1, 1);
    rangeEndDate.setDate(rangeEndDate.getDate() - 1); // hari terakhir bulan sebelumnya
    const rangeEnd = rangeEndDate.toISOString().slice(0, 10);
    const { data: dbData } = await supabase
      .from("work_records")
      .select("*")
      .eq("mitra", mitra)
      .gte("work_date", rangeStart)
      .lte("work_date", rangeEnd);
    setDbRecords((dbData as WorkRecord[]) ?? []);

    const { data: bastData } = await supabase.from("bast").select("*").eq("mitra", mitra).eq("periode", periode).maybeSingle();
    setBastRow((bastData as Bast) ?? null);

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mitra, periode]);

  function recordArea(r: WorkRecord): number {
    return r.capex_p * r.capex_l + r.opex_p * r.opex_l + r.reseal2_p * r.reseal2_l + r.repair_p * r.repair_l + r.opname_p * r.opname_l;
  }

  const results: RowResult[] = useMemo(() => {
    return newRecords.map((r) => {
      const totalAreaM2 = recordArea(r);
      const segLength = chainageToMeters(r.km_finish) - chainageToMeters(r.km_start);
      const lebarEquivalent = segLength > 0 ? totalAreaM2 / segLength : 0;
      const correction = calculateRetentionCorrection({
        newKmStart: r.km_start,
        newKmFinish: r.km_finish,
        newLine: r.line,
        newDate: r.work_date,
        newLebar: lebarEquivalent,
        databaseRecords: dbRecords,
        retentionMonths,
      });
      return { record: r, totalAreaM2, correction, workItem: KATEGORI_TO_WORK_ITEM[r.kategori] };
    });
  }, [newRecords, dbRecords, retentionMonths]);

  const totalsPerWorkItem = useMemo(() => {
    const totals: Record<WorkItem, number> = {
      Recycling: 0, "Reseal 1 Coat": 0, "Reseal 2 Coat": 0, "Reseal Selected": 0, Upgrading: 0,
    };
    for (const res of results) totals[res.workItem] += res.correction.payableAreaM2;
    return totals;
  }, [results]);

  const totalsPerKategori = useMemo(() => {
    const totals: Record<RekapKategori, number> = {
      double_coat: 0, reseal_1_coat: 0, heavy_patches_recycling: 0, heavy_patches_upgrading: 0, tambalan: 0,
    };
    for (const res of results) totals[res.record.kategori] += res.correction.payableAreaM2;
    return totals;
  }, [results]);

  const isLocked = bastRow?.status === "Final";

  async function handleSaveDraft() {
    const payload = {
      mitra,
      periode,
      total_per_work_item: totalsPerWorkItem,
      status: "Draft" as const,
    };
    await supabase.from("bast").upsert(payload, { onConflict: "mitra,periode" });
    load();
  }

  async function handleFinalize() {
    if (!confirm("Finalisasi BAST periode ini? Data tidak dapat diubah setelah difinalkan.")) return;
    await supabase
      .from("bast")
      .upsert({ mitra, periode, total_per_work_item: totalsPerWorkItem, status: "Final", locked_at: new Date().toISOString() }, { onConflict: "mitra,periode" });
    load();
  }

  const exportRows = results.map((res) => [
    formatDateID(res.record.work_date),
    res.record.km_start,
    res.record.km_finish,
    res.record.line,
    REKAP_KATEGORI_LABEL[res.record.kategori],
    formatNumberID(res.totalAreaM2, 1),
    formatNumberID(res.correction.correctedAreaM2, 1),
    formatNumberID(res.correction.payableAreaM2, 1),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-graphite-900">BAST</h1>
          <p className="text-sm text-gray-500">Rekap volume yang dapat dibayar setelah koreksi area retensi ({retentionMonths} bulan).</p>
        </div>
        <div className="flex items-end gap-3">
          <Field label="Periode">
            <Input type="month" value={periode} onChange={(e) => setPeriode(e.target.value)} />
          </Field>
          <ExportButtons
            filename={`bast-${mitra}-${periode}`}
            title={`BAST ${mitra.toUpperCase()} - ${periode}`}
            columns={["Tgl", "KM Start", "KM Finish", "Line", "Kategori", "Luas Sebelum (m2)", "Luas Dikoreksi (m2)", "Luas Dapat Dibayar (m2)"]}
            rows={exportRows}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {bastRow ? (
          <Badge tone={bastRow.status === "Final" ? "green" : "amber"}>{bastRow.status}</Badge>
        ) : (
          <Badge tone="neutral">Belum dibuat</Badge>
        )}
        <Button variant="secondary" onClick={handleSaveDraft} disabled={isLocked}>Simpan Draft</Button>
        <Button onClick={handleFinalize} disabled={isLocked}>{isLocked ? "Sudah Final" : "Finalisasi"}</Button>
      </div>

      <div className="scroll-x rounded-lg border border-gray-200 bg-white">
        <table className="data-table">
          <thead>
            <tr>
              <th>Tgl</th><th>KM Start</th><th>KM Finish</th><th>Line</th><th>Kategori</th>
              <th>Luas Sebelum (m²)</th><th>Luas Dikoreksi Retensi (m²)</th><th>Luas Dapat Dibayar (m²)</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9} className="py-6 text-center text-gray-400">Menghitung koreksi retensi...</td></tr>}
            {!loading && results.length === 0 && (
              <tr><td colSpan={9} className="py-8 text-center text-gray-400">Tidak ada pekerjaan baru pada periode ini.</td></tr>
            )}
            {results.map((res) => (
              <tr key={res.record.id}>
                <td>{formatDateID(res.record.work_date)}</td>
                <td className="chainage">{res.record.km_start}</td>
                <td className="chainage">{res.record.km_finish}</td>
                <td>{res.record.line}</td>
                <td>{REKAP_KATEGORI_LABEL[res.record.kategori]}</td>
                <td>{formatNumberID(res.totalAreaM2, 1)}</td>
                <td className={res.correction.correctedAreaM2 > 0 ? "text-signal-red font-medium" : ""}>
                  {formatNumberID(res.correction.correctedAreaM2, 1)}
                </td>
                <td className="font-medium">{formatNumberID(res.correction.payableAreaM2, 1)}</td>
                <td>
                  {res.correction.retainedSegments.length > 0 && (
                    <button className="text-signal-blue hover:underline" onClick={() => setDrillDown(res)}>Detail</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-graphite-900">Summary Work Item (Luasan Dapat Dibayar, Terkoreksi)</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {WORK_ITEMS.map((wi) => (
            <div key={wi} className="rounded-md bg-asphalt-50 p-3">
              <div className="text-xs text-gray-500">{wi}</div>
              <div className="mt-1 text-base font-semibold text-graphite-900">{formatNumberID(totalsPerWorkItem[wi], 1)} m²</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-graphite-900">Rekap per Kategori (setelah koreksi)</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {(Object.keys(REKAP_KATEGORI_LABEL) as RekapKategori[]).map((k) => (
            <div key={k} className="rounded-md bg-asphalt-50 p-3">
              <div className="text-xs text-gray-500">{REKAP_KATEGORI_LABEL[k]}</div>
              <div className="mt-1 text-base font-semibold text-graphite-900">{formatNumberID(totalsPerKategori[k], 1)} m²</div>
            </div>
          ))}
        </div>
      </div>

      {drillDown && (
        <Modal title="Detail Koreksi Retensi" onClose={() => setDrillDown(null)} width="max-w-xl">
          <div className="space-y-3 text-sm">
            <p>
              Pekerjaan baru <span className="chainage font-medium">{drillDown.record.km_start}–{drillDown.record.km_finish}</span> Line{" "}
              {drillDown.record.line} pada {formatDateID(drillDown.record.work_date)} beririsan dengan area yang masih dalam masa
              retensi berikut (dari halaman Database):
            </p>
            <div className="scroll-x rounded-md border border-gray-200">
              <table className="data-table">
                <thead>
                  <tr><th>Tgl Record Lama</th><th>KM Start</th><th>KM Finish</th><th>Kategori</th><th>Panjang Overlap (m)</th></tr>
                </thead>
                <tbody>
                  {drillDown.correction.retainedSegments.map((seg, i) => (
                    <tr key={i}>
                      <td>{formatDateID(seg.record.work_date)}</td>
                      <td className="chainage">{seg.record.km_start}</td>
                      <td className="chainage">{seg.record.km_finish}</td>
                      <td>{REKAP_KATEGORI_LABEL[seg.record.kategori]}</td>
                      <td>{formatNumberID(seg.overlap.end - seg.overlap.start, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500">
              Total overlap (setelah union, tanpa double counting): {formatNumberID(drillDown.correction.overlapLengthM, 1)} m —
              luas dikoreksi {formatNumberID(drillDown.correction.correctedAreaM2, 1)} m².
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
