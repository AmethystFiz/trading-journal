# Trading Journal - Host Gratis dengan Supabase + Netlify

## Fitur
- Login/Register
- Tambah/Edit/Hapus journal trading
- Upload gambar (before/after)
- Statistik & Chart.js
- Dark/Light mode
- Export CSV/JSON
- Responsive & aman

## Setup (5 Menit)
1. **Buat akun Supabase**: https://supabase.com/
2. **Buat project baru**
3. Di dashboard Supabase:
   - Buka **Authentication** → enable **Email/Password**
   - Buka **Storage** → buat bucket `trade-images` → enable **Public**
   - Buka **Table Editor** → buat tabel `trades` dengan kolom:
     - `id` (uuid, PK)
     - `user_id` (uuid, foreign key ke auth.users)
     - `date` (date)
     - `asset` (text)
     - `reason` (text)
     - `tp`, `sl`, `pnl` (numeric)
     - `notes` (text)
     - `before_image`, `after_image` (text, untuk URL)
   - Aktifkan **Row Level Security (RLS)** di tabel `trades`
4. Salin:
   - `Project URL` → ganti `SUPABASE_URL` di `scripts.js`
   - `Project API keys > anon public` → ganti `SUPABASE_ANON_KEY`
5. **Deploy ke Netlify**:
   - Tarik repo ini ke GitHub
   - Buat site baru di Netlify → pilih repo ini
   - Done! (Netlify otomatis build & deploy)

## Catatan
- Semua data disimpan di Supabase (gratis sampai 500MB DB + 1GB storage)
- Tidak perlu backend — semua logic di browser
- Untuk development lokal: buka `index.html` di browser (atau pakai Live Server)