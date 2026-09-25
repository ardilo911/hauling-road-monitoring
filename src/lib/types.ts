export type Mitra = "wasco" | "khs";
export type UserRole = "admin" | "user";
export type WroStatus = "Approve" | "Process";
export type WorkItem =
  | "Recycling"
  | "Reseal 1 Coat"
  | "Reseal 2 Coat"
  | "Reseal Selected"
  | "Upgrading";
export type LineType = "UL" | "LL" | "LL1" | "LL2";
export type RekapKategori =
  | "double_coat"
  | "reseal_1_coat"
  | "heavy_patches_recycling"
  | "heavy_patches_upgrading"
  | "tambalan";
export type BastStatus = "Draft" | "Final";

export const WORK_ITEMS: WorkItem[] = [
  "Recycling",
  "Reseal 1 Coat",
  "Reseal 2 Coat",
  "Reseal Selected",
  "Upgrading",
];

export const LINES: LineType[] = ["UL", "LL", "LL1", "LL2"];

export const REKAP_KATEGORI_LABEL: Record<RekapKategori, string> = {
  double_coat: "Double Coat",
  reseal_1_coat: "Reseal 1 Coat",
  heavy_patches_recycling: "Heavy Patches Recycling",
  heavy_patches_upgrading: "Heavy Patches Upgrading",
  tambalan: "Tambalan",
};

// Mapping kategori Rekap Pekerjaan -> Work Item BAST (dikonfirmasi dengan user)
export const KATEGORI_TO_WORK_ITEM: Record<RekapKategori, WorkItem> = {
  double_coat: "Reseal 1 Coat",
  reseal_1_coat: "Reseal 1 Coat",
  heavy_patches_recycling: "Recycling",
  heavy_patches_upgrading: "Upgrading",
  tambalan: "Reseal Selected",
};

export interface Profile {
  id: string;
  email: string | null;
  username: string;
  nama: string;
  role: UserRole;
  akses_mitra: Mitra[];
  is_active: boolean;
}

export interface Wro {
  id: string;
  mitra: Mitra;
  periode: string; // YYYY-MM
  nomer_wro: string;
  tgl_submit: string | null;
  tgl_approve: string | null;
  status: WroStatus;
  km_start: string;
  km_finish: string;
  line: LineType;
  panjang: number;
  lebar: number;
  luasan: number;
  work_item: WorkItem;
  created_at?: string;
}

export interface WorkRecord {
  id: string;
  mitra: Mitra;
  work_date: string; // YYYY-MM-DD
  kategori: RekapKategori;
  km_start: string;
  km_finish: string;
  area_nama: string | null;
  line: LineType;
  capex_p: number; capex_l: number;
  opex_p: number; opex_l: number;
  reseal2_p: number; reseal2_l: number;
  repair_p: number; repair_l: number;
  opname_p: number; opname_l: number;
  keterangan: string | null;
  remark_pekerjaan: WorkItem;
  created_at?: string;
}

export interface Bast {
  id: string;
  mitra: Mitra;
  periode: string;
  total_per_work_item: Record<string, number>;
  status: BastStatus;
  locked_at: string | null;
}

export interface Settings {
  retention_months: number;
}
