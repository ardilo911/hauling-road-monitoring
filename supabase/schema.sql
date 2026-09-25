-- ============================================================
-- HAULING GUARD - Schema Supabase (REVISI - aman dijalankan ulang)
-- Copas SELURUH file ini ke Supabase SQL Editor, lalu Run.
-- Aman dijalankan lebih dari sekali (idempotent): tidak akan error
-- kalau tabel/tipe/policy sudah ada.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- ENUM (dibuat dengan guard supaya tidak error jika sudah ada) ----------
do $$ begin
  create type mitra_type as enum ('wasco', 'khs');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role as enum ('admin', 'user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type wro_status as enum ('Approve', 'Process');
exception when duplicate_object then null; end $$;

do $$ begin
  create type work_item_type as enum ('Recycling', 'Reseal 1 Coat', 'Reseal 2 Coat', 'Reseal Selected', 'Upgrading');
exception when duplicate_object then null; end $$;

do $$ begin
  create type line_type as enum ('UL', 'LL', 'LL1', 'LL2');
exception when duplicate_object then null; end $$;

do $$ begin
  create type rekap_kategori as enum ('double_coat', 'reseal_1_coat', 'heavy_patches_recycling', 'heavy_patches_upgrading', 'tambalan');
exception when duplicate_object then null; end $$;

do $$ begin
  create type bast_status as enum ('Draft', 'Final');
exception when duplicate_object then null; end $$;

-- ============================================================
-- TABEL
-- ============================================================

-- ---------- PROFILES (terhubung ke auth.users) ----------
-- `email` disimpan terpisah supaya gampang dipakai untuk query
-- "jadikan akun X admin" tanpa perlu menebak nilai `username`.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  username text unique not null,
  nama text not null,
  role user_role not null default 'user',
  akses_mitra mitra_type[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Kalau tabel profiles sudah pernah dibuat dari versi sebelumnya (tanpa kolom email), tambahkan:
alter table profiles add column if not exists email text;
do $$ begin
  alter table profiles add constraint profiles_email_key unique (email);
exception when duplicate_object then null; end $$;

-- Trigger: bikin baris profile otomatis saat user baru dibuat di Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, username, nama, role, akses_mitra)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'nama', split_part(new.email, '@', 1)),
    'user',
    '{}'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- SETTINGS ----------
create table if not exists settings (
  id int primary key default 1,
  retention_months int not null default 6,
  constraint single_row check (id = 1)
);
insert into settings (id, retention_months) values (1, 6)
  on conflict (id) do nothing;

-- ---------- WRO (Work Request Order) ----------
create table if not exists wro (
  id uuid primary key default gen_random_uuid(),
  mitra mitra_type not null,
  periode text not null, -- format YYYY-MM
  nomer_wro text not null,
  tgl_submit date,
  tgl_approve date,
  status wro_status not null default 'Process',
  km_start text not null, -- format XX+XXX
  km_finish text not null,
  line line_type not null,
  panjang numeric not null,
  lebar numeric not null default 0,
  luasan numeric generated always as (panjang * lebar) stored,
  work_item work_item_type not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- WORK RECORDS (Rekap Pekerjaan / basis Database) ----------
create table if not exists work_records (
  id uuid primary key default gen_random_uuid(),
  mitra mitra_type not null,
  work_date date not null,
  kategori rekap_kategori not null,
  km_start text not null,
  km_finish text not null,
  area_nama text,
  line line_type not null,
  capex_p numeric default 0, capex_l numeric default 0,
  opex_p numeric default 0, opex_l numeric default 0,
  reseal2_p numeric default 0, reseal2_l numeric default 0,
  repair_p numeric default 0, repair_l numeric default 0,
  opname_p numeric default 0, opname_l numeric default 0,
  keterangan text,
  remark_pekerjaan work_item_type not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- BAST ----------
create table if not exists bast (
  id uuid primary key default gen_random_uuid(),
  mitra mitra_type not null,
  periode text not null,
  total_per_work_item jsonb not null default '{}',
  status bast_status not null default 'Draft',
  locked_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (mitra, periode)
);

-- ---------- AUDIT LOG ----------
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor uuid references profiles(id),
  action text not null,
  entity text not null,
  entity_id text,
  detail jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- Ini yang menegakkan aturan Anda:
--   - role = 'admin'  -> bisa akses SEMUA mitra
--   - role = 'user'   -> hanya bisa akses mitra yang ada di akses_mitra miliknya
-- Diberlakukan di level database, bukan cuma di tampilan.
-- ============================================================
alter table profiles enable row level security;
alter table settings enable row level security;
alter table wro enable row level security;
alter table work_records enable row level security;
alter table bast enable row level security;
alter table audit_logs enable row level security;

create or replace function public.is_admin() returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin' and is_active = true
  );
$$ language sql security definer stable;

create or replace function public.has_mitra_access(m mitra_type) returns boolean as $$
  select public.is_admin() or exists (
    select 1 from profiles where id = auth.uid() and is_active = true and m = any(akses_mitra)
  );
$$ language sql security definer stable;

-- PROFILES
drop policy if exists "profiles_select_own_or_admin" on profiles;
create policy "profiles_select_own_or_admin" on profiles for select
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_admin" on profiles;
create policy "profiles_update_admin" on profiles for update
  using (public.is_admin());

drop policy if exists "profiles_insert_admin" on profiles;
create policy "profiles_insert_admin" on profiles for insert
  with check (public.is_admin());

-- SETTINGS
drop policy if exists "settings_select_all" on settings;
create policy "settings_select_all" on settings for select using (auth.uid() is not null);

drop policy if exists "settings_update_admin" on settings;
create policy "settings_update_admin" on settings for update using (public.is_admin());

-- WRO
drop policy if exists "wro_select" on wro;
create policy "wro_select" on wro for select using (public.has_mitra_access(mitra));
drop policy if exists "wro_insert" on wro;
create policy "wro_insert" on wro for insert with check (public.has_mitra_access(mitra));
drop policy if exists "wro_update" on wro;
create policy "wro_update" on wro for update using (public.has_mitra_access(mitra));
drop policy if exists "wro_delete" on wro;
create policy "wro_delete" on wro for delete using (public.has_mitra_access(mitra));

-- WORK RECORDS
drop policy if exists "wr_select" on work_records;
create policy "wr_select" on work_records for select using (public.has_mitra_access(mitra));
drop policy if exists "wr_insert" on work_records;
create policy "wr_insert" on work_records for insert with check (public.has_mitra_access(mitra));
drop policy if exists "wr_update" on work_records;
create policy "wr_update" on work_records for update using (public.has_mitra_access(mitra));
drop policy if exists "wr_delete" on work_records;
create policy "wr_delete" on work_records for delete using (public.has_mitra_access(mitra));

-- BAST
drop policy if exists "bast_select" on bast;
create policy "bast_select" on bast for select using (public.has_mitra_access(mitra));
drop policy if exists "bast_insert" on bast;
create policy "bast_insert" on bast for insert with check (public.has_mitra_access(mitra));
drop policy if exists "bast_update" on bast;
create policy "bast_update" on bast for update using (public.has_mitra_access(mitra) and status = 'Draft');

-- AUDIT LOGS
drop policy if exists "audit_select_admin" on audit_logs;
create policy "audit_select_admin" on audit_logs for select using (public.is_admin());
drop policy if exists "audit_insert_self" on audit_logs;
create policy "audit_insert_self" on audit_logs for insert with check (actor = auth.uid());

-- ============================================================
-- SETUP AWAL: 2 jenis akun sesuai kebutuhan Anda
-- ============================================================
-- LANGKAH 1 — Buat dulu akun-akun ini di Supabase Dashboard:
--   Authentication > Users > Add user
--   Contoh:
--     admin@perusahaan.com        (nanti jadi Admin, akses semua mitra)
--     pic.wasco@perusahaan.com    (nanti jadi User Mitra, HANYA Wasco)
--     pic.khs@perusahaan.com      (nanti jadi User Mitra, HANYA KHS)
--   Trigger di atas otomatis membuat baris di `profiles` untuk tiap akun.
--
-- LANGKAH 2 — Setelah akun-akun di atas dibuat, jalankan blok berikut
-- (ganti email sesuai email yang benar-benar Anda daftarkan):

update profiles set role = 'admin', akses_mitra = '{wasco,khs}'
  where email = 'admin@perusahaan.com';

update profiles set role = 'user', akses_mitra = '{wasco}'
  where email = 'pic.wasco@perusahaan.com';

update profiles set role = 'user', akses_mitra = '{khs}'
  where email = 'pic.khs@perusahaan.com';

-- Setelah ini:
--  - admin@perusahaan.com login -> melihat kartu Wasco DAN KHS, plus menu
--    Manajemen User & Pengaturan.
--  - pic.wasco@perusahaan.com login -> langsung masuk dashboard Wasco,
--    tidak pernah melihat data atau menu terkait KHS (diblok di RLS).
--  - pic.khs@perusahaan.com login -> sebaliknya, hanya KHS.
--
-- Untuk menambah/mengubah akses mitra user berikutnya, TIDAK perlu SQL lagi
-- -- cukup login sebagai admin dan atur lewat menu "Manajemen User".
