"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { formatNumberID, formatDateID } from "@/lib/format";
import {
  WORK_ITEMS,
  LINES,
  REKAP_KATEGORI_LABEL,
  type WorkRecord,
  type Mitra,
  type RekapKategori,
  type WorkItem,
  type LineType,
} from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input, Select, Field } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
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

const emptyForm = {
  work_date: "",
  km_start: "",
  km_finish: "",
  area_nama: "",
  line: "UL" as LineType,
  capex_p: "", capex_l: "",
  opex_p: "", opex_l: "",
  reseal2_p: "", reseal2_l: "",
  repair_p: "", repair_l: "",
  opname_p: "", opname_l: "",
  keterangan: "",
  remark_pekerjaan: "Recycling" as WorkItem,
};

export default function RekapPage() {
  const params = useParams<{ mitra: string }>();
  const mitra = params.mitra as Mitra;

  const [periode, setPeriode] = useState(currentPeriode());
  const [tab, setTab] = useState<(typeof KATEGORI_TABS)[number]>("periode");
  const [rows, setRows] = useState<WorkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("work_records")
      .select("*")
      .eq("mitra", mitra)
      .gte("work_date", `${periode}-01`)
      .lte("work_date", `${periode}-31`)
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
      double_coat: 0,
      reseal_1_coat: 0,
      heavy_patches_recycling: 0,
      heavy_patches_upgrading: 0,
      tambalan: 0,
    };
    for (const r of rows) {
      totals[r.kategori] += r.capex_p * r.capex_l + r.opex_p * r.opex_l + r.reseal2_p * r.reseal2_l;
    }
    return totals;
  }, [rows]);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(row: WorkRecord) {
    setEditingId(row.id);
    setForm({
      work_date: row.work_date,
      km_start: row.km_start,
      km_finish: row.km_finish,
      area_nama: row.area_nama ?? "",
      line: row.line,
      capex_p: String(row.capex_p), capex_l: String(row.capex_l),
      opex_p: String(row.opex_p), opex_l: String(row.opex_l),
      reseal2_p: String(row.reseal2_p), reseal2_l: String(row.reseal2_l),
      repair_p: String(row.repair_p), repair_l: String(row.repair_l),
      opname_p: String(row.opname_p), opname_l: String(row.opname_l),
      keterangan: row.keterangan ?? "",
      remark_pekerjaan: row.remark_pekerjaan,
    });
    setFormError(null);
    setModalOpen(true);
  }

  const n = (v: string) => (v.trim() === "" ? 0 : parseFloat(v));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const kategori = tab === "periode" ? editingRowKategori() : (tab as RekapKategori);
    if (!kategori) {
      setFormError("Pilih tab kategori (bukan 'Periode') untuk menambah data baru.");
      return;
    }
    const payload = {
      mitra,
      work_date: form.work_date,
      kategori,
      km_start: form.km_start,
      km_finish: form.km_finish,
      area_nama: form.area_nama || null,
      line: form.line,
      capex_p: n(form.capex_p), capex_l: n(form.capex_l),
      opex_p: n(form.opex_p), opex_l: n(form.opex_l),
      reseal2_p: n(form.reseal2_p), reseal2_l: n(form.reseal2_l),
      repair_p: n(form.repair_p), repair_l: n(form.repair_l),
      opname_p: n(form.opname_p), opname_l: n(form.opname_l),
      keterangan: form.keterangan || null,
      remark_pekerjaan: form.remark_pekerjaan,
    };
    if (editingId) {
      await supabase.from("work_records").update(payload).eq("id", editingId);
    } else {
      await supabase.from("work_records").insert(payload);
    }
    setModalOpen(false);
    load();
  }

  function editingRowKategori(): RekapKategori | null {
    if (!editingId) return null;
    return rows.find((r) => r.id === editingId)?.kategori ?? null;
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus baris pekerjaan ini?")) return;
    await supabase.from("work_records").delete().eq("id", id);
    load();
  }

  const exportRows = rowsForTab.map((r) => [
    formatDateID(r.work_date), r.km_start, r.km_finish, r.area_nama ?? "-", r.line,
    formatNumberID(r.capex_p, 1), formatNumberID(r.capex_l, 1), formatNumberID(r.capex_p * r.capex_l, 1),
    formatNumberID(r.opex_p, 1), formatNumberID(r.opex_l, 1), formatNumberID(r.opex_p * r.opex_l, 1),
    formatNumberID(r.reseal2_p, 1), formatNumberID(r.reseal2_l, 1), formatNumberID(r.reseal2_p * r.reseal2_l, 1),
    formatNumberID(r.repair_p, 1), formatNumberID(r.repair_l, 1), formatNumberID(r.repair_p * r.repair_l, 1),
    formatNumberID(r.opname_p, 1), formatNumberID(r.opname_l, 1), formatNumberID(r.opname_p * r.opname_l, 1),
    r.keterangan ?? "-", r.remark_pekerjaan,
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-graphite-900">Rekap Pekerjaan</h1>
          <p className="text-sm text-gray-500">Rekap pekerjaan perawatan per kategori dalam satu bulan.</p>
        </div>
        <div className="flex items-end gap-3">
          <Field label="Periode">
            <Input type="month" value={periode} onChange={(e) => setPeriode(e.target.value)} />
          </Field>
          {tab !== "periode" && (
            <>
              <ExportButtons
                filename={`rekap-${tab}-${mitra}-${periode}`}
                title={`Rekap ${REKAP_KATEGORI_LABEL[tab as RekapKategori]} ${mitra.toUpperCase()} - ${periode}`}
                columns={["Tgl", "KM Start", "KM Finish", "Area", "Line", "CAPEX P", "CAPEX L", "CAPEX Luas", "OPEX P", "OPEX L", "OPEX Luas", "Reseal2 P", "Reseal2 L", "Reseal2 Luas", "Repair P", "Repair L", "Repair Luas", "Opname P", "Opname L", "Opname Luas", "Keterangan", "Remark"]}
                rows={exportRows}
              />
              <Button onClick={openAdd}>+ Tambah</Button>
            </>
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
          <h3 className="mb-3 text-sm font-semibold text-graphite-900">Ringkasan Bulan {periode}</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {(Object.keys(REKAP_KATEGORI_LABEL) as RekapKategori[]).map((k) => (
              <div key={k} className="rounded-md bg-asphalt-50 p-3">
                <div className="text-xs text-gray-500">{REKAP_KATEGORI_LABEL[k]}</div>
                <div className="mt-1 text-base font-semibold text-graphite-900">{formatNumberID(summaryPerKategori[k], 1)} m²</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-400">Klik salah satu tab kategori di atas untuk melihat & mengelola detail pekerjaan.</p>
        </div>
      ) : (
        <div className="scroll-x rounded-lg border border-gray-200 bg-white">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tgl</th><th>KM Start</th><th>KM Finish</th><th>Area</th><th>Line</th>
                <th>CAPEX Luas</th><th>OPEX Luas</th><th>Reseal2 Luas</th><th>Repair Luas</th><th>Opname Luas</th>
                <th>Keterangan</th><th>Remark</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={13} className="py-6 text-center text-gray-400">Memuat...</td></tr>}
              {!loading && rowsForTab.length === 0 && (
                <tr><td colSpan={13} className="py-8 text-center text-gray-400">Belum ada data pada kategori & periode ini.</td></tr>
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
                  <td className="space-x-2">
                    <button className="text-signal-blue hover:underline" onClick={() => openEdit(r)}>Ubah</button>
                    <button className="text-signal-red hover:underline" onClick={() => handleDelete(r.id)}>Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal title={editingId ? "Ubah Pekerjaan" : "Tambah Pekerjaan"} onClose={() => setModalOpen(false)} width="max-w-2xl">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Tanggal">
                <Input required type="date" value={form.work_date} onChange={(e) => setForm({ ...form, work_date: e.target.value })} />
              </Field>
              <Field label="KM Start"><Input required placeholder="10+050" value={form.km_start} onChange={(e) => setForm({ ...form, km_start: e.target.value })} /></Field>
              <Field label="KM Finish"><Input required placeholder="10+150" value={form.km_finish} onChange={(e) => setForm({ ...form, km_finish: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Area (nama lokasi)"><Input value={form.area_nama} onChange={(e) => setForm({ ...form, area_nama: e.target.value })} /></Field>
              <Field label="Line">
                <Select value={form.line} onChange={(e) => setForm({ ...form, line: e.target.value as LineType })}>
                  {LINES.map((l) => <option key={l} value={l}>{l}</option>)}
                </Select>
              </Field>
            </div>

            <div className="space-y-2 rounded-md border border-gray-200 p-3">
              <p className="text-xs font-semibold text-gray-500">Volume per Jenis (Panjang / Lebar, meter)</p>
              {[
                ["CAPEX (Upgrading)", "capex_p", "capex_l"],
                ["OPEX (Maintenance)", "opex_p", "opex_l"],
                ["Reseal 2 Coat (Maintenance)", "reseal2_p", "reseal2_l"],
                ["Repair", "repair_p", "repair_l"],
                ["Opname", "opname_p", "opname_l"],
              ].map(([label, pKey, lKey]) => (
                <div key={pKey} className="grid grid-cols-3 items-center gap-2 text-sm">
                  <span className="text-gray-600">{label}</span>
                  <Input type="number" step="0.1" placeholder="Panjang" value={(form as any)[pKey]} onChange={(e) => setForm({ ...form, [pKey]: e.target.value })} />
                  <Input type="number" step="0.1" placeholder="Lebar" value={(form as any)[lKey]} onChange={(e) => setForm({ ...form, [lKey]: e.target.value })} />
                </div>
              ))}
            </div>

            <Field label="Keterangan">
              <Input value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} />
            </Field>
            <Field label="Remark Pekerjaan">
              <Select value={form.remark_pekerjaan} onChange={(e) => setForm({ ...form, remark_pekerjaan: e.target.value as WorkItem })}>
                {WORK_ITEMS.map((w) => <option key={w} value={w}>{w}</option>)}
              </Select>
            </Field>
            {formError && <p className="text-sm text-signal-red">{formError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Batal</Button>
              <Button type="submit">Simpan</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
