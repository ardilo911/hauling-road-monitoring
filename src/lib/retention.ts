import { chainageToMeters } from "./chainage";
import type { WorkRecord, LineType } from "./types";

export interface Interval {
  start: number; // meter
  end: number; // meter
}

/** Gabungkan interval yang overlap/bersentuhan jadi union tanpa duplikasi. */
export function unionIntervals(intervals: Interval[]): Interval[] {
  const sorted = [...intervals]
    .filter((iv) => iv.end > iv.start)
    .sort((a, b) => a.start - b.start);
  const result: Interval[] = [];
  for (const iv of sorted) {
    const last = result[result.length - 1];
    if (last && iv.start <= last.end) {
      last.end = Math.max(last.end, iv.end);
    } else {
      result.push({ ...iv });
    }
  }
  return result;
}

/** Total panjang overlap antara satu interval baru dan sebuah union interval retensi. */
export function overlapLengthWithUnion(target: Interval, retained: Interval[]): number {
  let total = 0;
  for (const r of retained) {
    const overlap = Math.min(target.end, r.end) - Math.max(target.start, r.start);
    if (overlap > 0) total += overlap;
  }
  return total;
}

/** Tambah N bulan ke tanggal (string YYYY-MM-DD), dipakai untuk menghitung batas retensi. */
export function addMonths(dateStr: string, months: number): Date {
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d;
}

export interface CorrectionResult {
  newLengthM: number;
  newAreaM2: number;
  overlapLengthM: number;
  correctedAreaM2: number; // luas yang dipotong
  payableLengthM: number;
  payableAreaM2: number; // luas yang dapat dibayar
  retainedSegments: Array<{ record: WorkRecord; overlap: Interval }>;
}

/**
 * Hitung luas yang dapat dibayar untuk satu pekerjaan baru (dari Rekap Pekerjaan / B)
 * setelah dikoreksi terhadap area yang masih dalam masa retensi (dari Database / C).
 *
 * Aturan (sesuai PRD & konfirmasi user):
 * - Koreksi hanya berlaku pada Line yang sama.
 * - Berlaku LINTAS jenis pekerjaan (work item baru apapun bisa dikoreksi oleh record lama apapun).
 * - Record lama dianggap "masih retensi" jika newDate - retentionMonths <= record.work_date < newDate.
 * - Jika beririsan dengan beberapa record, union dulu interval-nya sebelum dihitung overlap
 *   (supaya tidak double counting).
 */
export function calculateRetentionCorrection(params: {
  newKmStart: string;
  newKmFinish: string;
  newLine: LineType;
  newDate: string; // YYYY-MM-DD
  newLebar: number;
  databaseRecords: WorkRecord[]; // kandidat dari halaman Database (C), sudah difilter mitra
  retentionMonths: number;
}): CorrectionResult {
  const { newKmStart, newKmFinish, newLine, newDate, newLebar, databaseRecords, retentionMonths } = params;

  const target: Interval = {
    start: chainageToMeters(newKmStart),
    end: chainageToMeters(newKmFinish),
  };
  const newLengthM = target.end - target.start;
  const newAreaM2 = newLengthM * newLebar;

  const cutoffMs = addMonths(newDate, -retentionMonths).getTime();
  const newDateMs = new Date(newDate + "T00:00:00").getTime();

  // 1. Filter kandidat: line sama + tanggal masih dalam jendela retensi + lebih lama dari pekerjaan baru
  const candidates = databaseRecords.filter((r) => {
    if (r.line !== newLine) return false;
    const rDateMs = new Date(r.work_date + "T00:00:00").getTime();
    return rDateMs >= cutoffMs && rDateMs < newDateMs;
  });

  // 2. Ambil interval tiap kandidat + hitung overlap individual untuk drill-down
  const retainedIntervals: Interval[] = [];
  const retainedSegments: Array<{ record: WorkRecord; overlap: Interval }> = [];
  for (const r of candidates) {
    const iv: Interval = { start: chainageToMeters(r.km_start), end: chainageToMeters(r.km_finish) };
    retainedIntervals.push(iv);
    const ovStart = Math.max(target.start, iv.start);
    const ovEnd = Math.min(target.end, iv.end);
    if (ovEnd > ovStart) {
      retainedSegments.push({ record: r, overlap: { start: ovStart, end: ovEnd } });
    }
  }

  // 3. Union interval retensi supaya tidak double counting saat overlap tumpang tindih
  const unioned = unionIntervals(retainedIntervals);
  const overlapLengthM = overlapLengthWithUnion(target, unioned);

  const correctedAreaM2 = overlapLengthM * newLebar;
  const payableLengthM = Math.max(0, newLengthM - overlapLengthM);
  const payableAreaM2 = Math.max(0, newAreaM2 - correctedAreaM2);

  return {
    newLengthM,
    newAreaM2,
    overlapLengthM,
    correctedAreaM2,
    payableLengthM,
    payableAreaM2,
    retainedSegments,
  };
}

/*
TEST CASE WAJIB (dari PRD, harus selalu lulus):
Rekap (B): 2026-09-01, KM 10+050–10+150, LL, P=100, L=6, Recycling -> area 600 m2
Database (C): 2026-06-01, KM 10+100–10+150, LL, P=50, L=6, Recycling (dalam retensi 6 bulan)
Hasil: overlap = 50m, payableArea = 600 - (50*6) = 300 m2

calculateRetentionCorrection({
  newKmStart: "10+050", newKmFinish: "10+150", newLine: "LL", newDate: "2026-09-01", newLebar: 6,
  databaseRecords: [{ ...minimal WorkRecord, work_date: "2026-06-01", km_start: "10+100", km_finish: "10+150", line: "LL" }],
  retentionMonths: 6,
}) // => payableAreaM2 === 300
*/
