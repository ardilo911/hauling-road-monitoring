-- ============================================================
-- HAULING GUARD - Schema Supabase
-- Jalankan seluruh file ini di Supabase SQL Editor (satu kali)
-- ============================================================

-- ---------- ENUM ----------
create type mitra_type as enum ('wasco', 'khs');
create type user_role as enum ('admin', 'user');
create type wro_status as enum ('Approve', 'Process');
create type work_item_type as enum ('Recycling', 'Reseal 1 Coat', 'Reseal 2 Coat', 'Reseal Selected', 'Upgrading');
create type line_type as enum ('UL', 'LL', 'LL1', 'LL2');
create type rekap_kategori as enum ('double_coat', 'reseal_1_coat', 'heavy_patches_recycling', 'heavy_patches_upgrading', 'tambalan');
create type bast_status as enum ('Draft', 'Final');

-- ---------- PROFILES (terhubung ke auth.users) ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  nama text not null,
  role user_role not null default 'user',
  akses_mitra mitra_type[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Trigger: bikin baris profile otomatis saat user baru dibuat di Supabase Auth
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, nama, role, akses_mitra)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'nama', split_part(new.email, '@', 1)),
    'user',
    '{}'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- SETTINGS ----------
create table settings (
  id int primary key default 1,
  retention_months int not null default 6,
  constraint single_row check (id = 1)
);
insert into settings (id, retention_months) values (1, 6);

-- ---------- WRO (Work Request Order) ----------
create table wro (
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
  panjang numeric not null, -- meter, auto = km_finish - km_start
  lebar numeric not null default 0, -- meter
  luasan numeric generated always as (panjang * lebar) stored, -- m2
  work_item work_item_type not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- WORK RECORDS (Rekap Pekerjaan / basis Database) ----------
create table work_records (
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
create table bast (
  id uuid primary key default gen_random_uuid(),
  mitra mitra_type not null,
  periode text not null, -- YYYY-MM
  total_per_work_item jsonb not null default '{}',
  status bast_status not null default 'Draft',
  locked_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (mitra, periode)
);

-- ---------- AUDIT LOG ----------
create table audit_logs (
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
-- ============================================================
alter table profiles enable row level security;
alter table settings enable row level security;
alter table wro enable row level security;
alter table work_records enable row level security;
alter table bast enable row level security;
alter table audit_logs enable row level security;

-- Helper: cek apakah user sekarang admin
create function public.is_admin() returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin' and is_active = true
  );
$$ language sql security definer stable;

-- Helper: cek apakah user sekarang punya akses ke mitra tertentu
create function public.has_mitra_access(m mitra_type) returns boolean as $$
  select public.is_admin() or exists (
    select 1 from profiles where id = auth.uid() and is_active = true and m = any(akses_mitra)
  );
$$ language sql security definer stable;

-- PROFILES: user lihat profil sendiri, admin lihat & ubah semua
create policy "profiles_select_own_or_admin" on profiles for select
  using (id = auth.uid() or public.is_admin());
create policy "profiles_update_admin" on profiles for update
  using (public.is_admin());
create policy "profiles_insert_admin" on profiles for insert
  with check (public.is_admin());

-- SETTINGS: semua user login boleh baca, hanya admin boleh ubah
create policy "settings_select_all" on settings for select using (auth.uid() is not null);
create policy "settings_update_admin" on settings for update using (public.is_admin());

-- WRO
create policy "wro_select" on wro for select using (public.has_mitra_access(mitra));
create policy "wro_insert" on wro for insert with check (public.has_mitra_access(mitra));
create policy "wro_update" on wro for update using (public.has_mitra_access(mitra));
create policy "wro_delete" on wro for delete using (public.has_mitra_access(mitra));

-- WORK RECORDS
create policy "wr_select" on work_records for select using (public.has_mitra_access(mitra));
create policy "wr_insert" on work_records for insert with check (public.has_mitra_access(mitra));
create policy "wr_update" on work_records for update using (public.has_mitra_access(mitra));
create policy "wr_delete" on work_records for delete using (public.has_mitra_access(mitra));

-- BAST
create policy "bast_select" on bast for select using (public.has_mitra_access(mitra));
create policy "bast_insert" on bast for insert with check (public.has_mitra_access(mitra));
create policy "bast_update" on bast for update using (public.has_mitra_access(mitra) and status = 'Draft');

-- AUDIT LOGS: admin saja yang bisa baca; siapapun yang login bisa insert log miliknya
create policy "audit_select_admin" on audit_logs for select using (public.is_admin());
create policy "audit_insert_self" on audit_logs for insert with check (actor = auth.uid());

-- ============================================================
-- CATATAN SETUP AWAL
-- ============================================================
-- 1. Setelah menjalankan schema ini, buat user pertama lewat
--    Supabase Dashboard > Authentication > Users > Add user.
-- 2. Baris di tabel `profiles` akan otomatis dibuat oleh trigger.
-- 3. Jadikan user pertama sebagai admin secara manual:
--    update profiles set role = 'admin', akses_mitra = '{wasco,khs}'
--    where username = 'USERNAME_ANDA';
