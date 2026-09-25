# Hauling Guard

Dashboard monitoring pekerjaan perawatan hauling road dalam masa garansi/retensi (WRO, Rekap Pekerjaan, Database, BAST dengan koreksi luasan retensi otomatis).

Stack: **Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase (Auth + Postgres)**, siap deploy ke **Netlify**.

---

## 1. Setup Supabase

1. Buat project baru di [supabase.com](https://supabase.com).
2. Buka **SQL Editor**, tempel seluruh isi file `supabase/schema.sql`, lalu jalankan (Run). Ini membuat semua tabel, tipe data, trigger profile otomatis, dan Row Level Security.
3. Buka **Authentication → Users → Add user**, buat user pertama (pakai email asli, misal `admin@perusahaan.com`), isi password.
   - Baris di tabel `profiles` akan otomatis terbuat oleh trigger.
4. Jadikan user tadi admin dengan penuh akses ke kedua mitra. Di SQL Editor jalankan:
   ```sql
   update profiles
   set role = 'admin', akses_mitra = '{wasco,khs}'
   where username = 'admin'; -- username = bagian sebelum @ di email
   ```
5. Buka **Project Settings → API**, salin **Project URL** dan **anon public key** — dipakai di langkah 3.

> Catatan: aplikasi ini login menggunakan **email** Supabase Auth (bukan username custom terpisah), karena Supabase Auth berbasis email. Kolom `username` di tabel `profiles` dipakai untuk tampilan & pemetaan akses, tapi saat login isi kolom "Username/Email" dengan **email lengkap** yang didaftarkan.

---

## 2. Jalankan secara lokal (opsional, untuk cek dulu)

```bash
npm install
cp .env.example .env.local
# isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local
npm run dev
```

Buka `http://localhost:3000`.

---

## 3. Push ke GitHub

```bash
cd hauling-guard
git init
git add .
git commit -m "Initial commit: Hauling Guard dashboard"
git branch -M main
git remote add origin https://github.com/USERNAME_ANDA/hauling-guard.git
git push -u origin main
```

Ganti `USERNAME_ANDA` dan buat repository kosong terlebih dahulu di GitHub (jangan centang "initialize with README").

---

## 4. Deploy ke Netlify

**Lewat UI (paling mudah):**
1. Login ke [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**.
2. Pilih repo GitHub `hauling-guard` yang baru di-push.
3. Netlify akan otomatis mendeteksi `netlify.toml` (build command `npm run build`, plugin `@netlify/plugin-nextjs`).
4. Sebelum deploy, buka **Site settings → Environment variables**, tambahkan:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Klik **Deploy site**.

**Lewat CLI (alternatif):**
```bash
npm install -g netlify-cli
netlify login
netlify init
netlify env:set NEXT_PUBLIC_SUPABASE_URL "https://xxxx.supabase.co"
netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "eyJhbGci..."
netlify deploy --prod
```

---

## 5. Menambah user baru (setelah live)

1. Supabase Dashboard → Authentication → Users → Add user (isi email & password).
2. Login sebagai admin ke aplikasi → menu **Manajemen User** → atur Role dan centang mitra yang boleh diakses user tersebut.

---

## 6. Logika Koreksi Retensi (inti aplikasi)

Diimplementasikan di `src/lib/retention.ts`. Ringkasan aturan:

- Koreksi hanya berlaku pada **Line yang sama**.
- Berlaku **lintas jenis pekerjaan** (dikonfirmasi): pekerjaan baru tipe apapun bisa dikoreksi oleh record lama tipe apapun, selama beririsan chainage & line, dan record lama masih dalam jendela retensi (`tanggal_baru − retention_months ≤ tanggal_lama < tanggal_baru`).
- Jika beririsan dengan beberapa record retensi sekaligus, semua interval retensi di-**union** dulu sebelum dihitung overlap — mencegah double counting.
- `Luas dapat dibayar = Luas baru − (panjang overlap × lebar pekerjaan baru)`, minimum 0.
- Pemetaan kategori Rekap Pekerjaan → Work Item BAST (dikonfirmasi):
  `double_coat → Reseal 1 Coat`, `heavy_patches_recycling → Recycling`, `heavy_patches_upgrading → Upgrading`, `reseal_1_coat → Reseal 1 Coat`, `tambalan → Reseal Selected`. Ubah di `src/lib/types.ts` (`KATEGORI_TO_WORK_ITEM`) bila perlu.

Test case wajib dari PRD (didokumentasikan sebagai komentar di `retention.ts`):
- Rekap: 01 Sep 2026, KM 10+050–10+150, LL, P=100 L=6 → 600 m² Recycling.
- Database: 01 Jun 2026, KM 10+100–10+150, LL, P=50 L=6 (masih retensi 6 bulan).
- Hasil BAST: dapat dibayar 300 m² (KM 10+050–10+100).

---

## 7. Struktur proyek

```
src/
  app/
    login/page.tsx            # Halaman login
    mitra/page.tsx             # Pilihan mitra (Wasco/KHS)
    dashboard/[mitra]/
      layout.tsx                # Guard akses + sidebar/topbar
      wro/page.tsx               # Work Request Order
      rekap/page.tsx             # Rekap Pekerjaan (per kategori)
      database/page.tsx          # Riwayat 6 bulan (basis retensi)
      bast/page.tsx               # BAST + koreksi retensi + drill-down
      users/page.tsx              # Admin: manajemen user
      settings/page.tsx           # Admin: durasi retensi
  components/                # Sidebar, Topbar, ExportButtons, UI primitives
  lib/
    retention.ts              # Engine koreksi retensi (inti bisnis)
    chainage.ts                # Parsing format KM XX+XXX
    types.ts                    # Tipe data & mapping kategori→work item
supabase/schema.sql           # Skema database + RLS
```

## 8. Keterbatasan versi ini (transparansi)

- Manajemen user baru (membuat akun) dilakukan lewat Supabase Dashboard, bukan dari dalam aplikasi — membuat user Auth baru butuh **service role key** yang tidak aman dipanggil dari browser. Admin hanya mengatur *role* & *akses mitra* dari dalam aplikasi.
- Login memakai email Supabase Auth, bukan username custom.
- Export PDF menggunakan layout tabel sederhana (bukan template BAST resmi bermeterai) — bisa dikembangkan lebih lanjut sesuai kop surat perusahaan.
