// Format chainage jalan: "10+050" artinya 10 km + 050 m = 10050 meter.

const CHAINAGE_RE = /^(\d+)\+(\d{1,3})$/;

export function isValidChainage(value: string): boolean {
  return CHAINAGE_RE.test(value.trim());
}

/** Konversi "10+050" -> 10050 (meter) */
export function chainageToMeters(value: string): number {
  const m = value.trim().match(CHAINAGE_RE);
  if (!m) throw new Error(`Format chainage tidak valid: "${value}". Gunakan format XX+XXX (contoh 10+050).`);
  const km = parseInt(m[1], 10);
  const meter = parseInt(m[2], 10);
  return km * 1000 + meter;
}

/** Konversi 10050 (meter) -> "10+050" */
export function metersToChainage(meters: number): string {
  const km = Math.floor(meters / 1000);
  const rest = Math.round(meters - km * 1000);
  return `${km}+${String(rest).padStart(3, "0")}`;
}

/** Panjang segmen dalam meter dari dua chainage */
export function segmentLength(kmStart: string, kmFinish: string): number {
  return chainageToMeters(kmFinish) - chainageToMeters(kmStart);
}
