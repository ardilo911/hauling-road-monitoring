export function formatNumberID(value: number, decimals = 2): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatDateID(value: string | null | undefined): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(value + "T00:00:00")
  );
}

export function monthLabelID(periode: string): string {
  // periode: "2026-09"
  const [y, m] = periode.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
}

/** Daftar N periode (YYYY-MM) berakhir di `endPeriode`, urut lama->baru */
export function lastNPeriods(endPeriode: string, n: number): string[] {
  const [y, m] = endPeriode.split("-").map(Number);
  const result: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return result;
}
