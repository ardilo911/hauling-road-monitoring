"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { chainageToMeters, isValidChainage, segmentLength } from "@/lib/chainage";
import { formatNumberID } from "@/lib/format";
import { WORK_ITEMS, LINES, type Wro, type Mitra, type WorkItem, type LineType, type WroStatus } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input, Select, Field } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { ExportButtons } from "@/components/ExportButtons";

function currentPeriode() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const emptyForm = {
  nomer_wro: "",
  tgl_submit: "",
  tgl_approve: "",
  status: "Process" as WroStatus,
  km_start: "",
  km_finish: "",
  line: "UL" as LineType,
  lebar: "",
  work_item: "Recycling" as WorkItem,
};

export default function WroPage() {
  const params = useParams<{ mitra: string }>();
  const mitra = params.mitra as Mitra;

  const [periode, setPeriode] = useState(currentPeriode());
  const [rows, setRows] = useState<Wro[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("wro")
      .select("*")
      .eq("mitra", mitra)
      .eq("periode", periode)
      .order("created_at", { ascending: false });
    setRows((data as Wro[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mitra, periode]);

  const panjangPreview = useMemo(() => {
    if (isValidChainage(form.km_start) && isValidChainage(form.km_finish)) {
      const p = segmentLength(form.km_start, form.km_finish);
      return p > 0 ? p : null;
    }
    return null;
  }, [form.km_start, form.km_finish]);

  const luasanPreview = useMemo(() => {
    const lebar = parseFloat(form.lebar);
    if (panjangPreview && !isNaN(lebar)) return panjangPreview * lebar;
    return null;
  }, [panjangPreview, form.lebar]);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(row: Wro) {
    setEditingId(row.id);
    setForm({
      nomer_wro: row.nomer_wro,
      tgl_submit: row.tgl_submit ?? "",
      tgl_approve: row.tgl_approve ?? "",
      status: row.status,
      km_start: row.km_start,
      km_finish: row.km_finish,
      line: row.line,
      lebar: String(row.lebar),
      work_item: row.work_item,
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!isValidChainage(form.km_start) || !isValidChainage(form.km_finish)) {
      setFormError("Format KM harus XX+XXX, contoh 10+050.");
      return;
    }
    if (chainageToMeters(form.km_finish) <= chainageToMeters(form.km_start)) {
      setFormError("KM Finish harus lebih besar dari KM Start.");
      return;
    }
    const lebar = parseFloat(form.lebar);
    if (isNaN(lebar) || lebar <= 0) {
      setFormError("Lebar harus diisi angka lebih dari 0.");
      return;
    }
    const panjang = segmentLength(form.km_start, form.km_finish);

    const payload = {
      mitra,
      periode,
      nomer_wro: form.nomer_wro,
      tgl_submit: form.tgl_submit || null,
      tgl_approve: form.tgl_approve || null,
      status: form.status,
      km_start: form.km_start,
      km_finish: form.km_finish,
      line: form.line,
      panjang,
      lebar,
      work_item: form.work_item,
    };

    if (editingId) {
      await supabase.from("wro").update(payload).eq("id", editingId);
    } else {
      await supabase.from("wro").insert(payload);
    }
    setModalOpen(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus baris WRO ini?")) return;
    await supabase.from("wro").delete().eq("id", id);
    load();
  }

  const summary = useMemo(() => {
    const totals: Record<WorkItem, number> = {
      Recycling: 0,
      "Reseal 1 Coat": 0,
      "Reseal 2 Coat": 0,
      "Reseal Selected": 0,
      Upgrading: 0,
    };
    for (const r of rows) totals[r.work_item] += r.luasan;
    return totals;
  }, [rows]);

  const exportRows = rows.map((r) => [
    r.nomer_wro,
    r.tgl_submit ?? "-",
    r.tgl_approve ?? "-",
    r.status,
    r.km_start,
    r.km_finish,
    r.line,
    formatNumberID(r.panjang, 1),
    formatNumberID(r.lebar, 1),
    formatNumberID(r.luasan, 1),
    r.work_item,
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-graphite-900">Work Request Order</h1>
          <p className="text-sm text-gray-500">Pengajuan pekerjaan perawatan hauling road.</p>
        </div>
        <div className="flex items-end gap-3">
          <Field label="Periode">
            <Input type="month" value={periode} onChange={(e) => setPeriode(e.target.value)} />
          </Field>
          <ExportButtons
            filename={`wro-${mitra}-${periode}`}
            title={`WRO ${mitra.toUpperCase()} - ${periode}`}
            columns={["No WRO", "Submit", "Approve", "Status", "KM Start", "KM Finish", "Line", "Panjang (m)", "Lebar (m)", "Luasan (m2)", "Work Item"]}
            rows={exportRows}
          />
          <Button onClick={openAdd}>+ Tambah WRO</Button>
        </div>
      </div>

      <div className="scroll-x rounded-lg border border-gray-200 bg-white">
        <table className="data-table">
          <thead>
            <tr>
              <th>No WRO</th>
              <th>Submit</th>
              <th>Approve</th>
              <th>Status</th>
              <th>KM Start</th>
              <th>KM Finish</th>
              <th>Line</th>
              <th>Panjang (m)</th>
              <th>Lebar (m)</th>
              <th>Luasan (m²)</th>
              <th>Work Item</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={12} className="py-6 text-center text-gray-400">Memuat...</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={12} className="py-8 text-center text-gray-400">Belum ada data WRO pada periode ini.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.nomer_wro}</td>
                <td>{r.tgl_submit ?? "-"}</td>
                <td>{r.tgl_approve ?? "-"}</td>
                <td><Badge tone={r.status === "Approve" ? "green" : "amber"}>{r.status}</Badge></td>
                <td className="chainage">{r.km_start}</td>
                <td className="chainage">{r.km_finish}</td>
                <td>{r.line}</td>
                <td>{formatNumberID(r.panjang, 1)}</td>
                <td>{formatNumberID(r.lebar, 1)}</td>
                <td>{formatNumberID(r.luasan, 1)}</td>
                <td>{r.work_item}</td>
                <td className="space-x-2">
                  <button className="text-signal-blue hover:underline" onClick={() => openEdit(r)}>Ubah</button>
                  <button className="text-signal-red hover:underline" onClick={() => handleDelete(r.id)}>Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-graphite-900">Ringkasan Luasan per Work Item</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {WORK_ITEMS.map((wi) => (
            <div key={wi} className="rounded-md bg-asphalt-50 p-3">
              <div className="text-xs text-gray-500">{wi}</div>
              <div className="mt-1 text-base font-semibold text-graphite-900">{formatNumberID(summary[wi], 1)} m²</div>
            </div>
          ))}
        </div>
      </div>

      {modalOpen && (
        <Modal title={editingId ? "Ubah WRO" : "Tambah WRO"} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <Field label="Nomer WRO">
              <Input required value={form.nomer_wro} onChange={(e) => setForm({ ...form, nomer_wro: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date of Submission">
                <Input type="date" value={form.tgl_submit} onChange={(e) => setForm({ ...form, tgl_submit: e.target.value })} />
              </Field>
              <Field label="Date of Approval">
                <Input type="date" value={form.tgl_approve} onChange={(e) => setForm({ ...form, tgl_approve: e.target.value })} />
              </Field>
            </div>
            <Field label="Status WRO">
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as WroStatus })}>
                <option value="Process">Process</option>
                <option value="Approve">Approve</option>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="KM Start (format 10+050)">
                <Input required placeholder="10+050" value={form.km_start} onChange={(e) => setForm({ ...form, km_start: e.target.value })} />
              </Field>
              <Field label="KM Finish (format 10+150)">
                <Input required placeholder="10+150" value={form.km_finish} onChange={(e) => setForm({ ...form, km_finish: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Line">
                <Select value={form.line} onChange={(e) => setForm({ ...form, line: e.target.value as LineType })}>
                  {LINES.map((l) => <option key={l} value={l}>{l}</option>)}
                </Select>
              </Field>
              <Field label="Lebar (m)">
                <Input required type="number" step="0.1" value={form.lebar} onChange={(e) => setForm({ ...form, lebar: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-md bg-asphalt-50 p-3 text-sm">
              <div>Panjang (auto): <span className="chainage font-medium">{panjangPreview ? `${formatNumberID(panjangPreview, 1)} m` : "-"}</span></div>
              <div>Luasan (auto): <span className="font-medium">{luasanPreview ? `${formatNumberID(luasanPreview, 1)} m²` : "-"}</span></div>
            </div>
            <Field label="Work Item">
              <Select value={form.work_item} onChange={(e) => setForm({ ...form, work_item: e.target.value as WorkItem })}>
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
