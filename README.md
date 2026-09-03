# Patungin (Next.js + Supabase)

Split bill app — assign item ke tiap orang, dan biarkan Patungin hitung
siapa bayar berapa. Pajak, service charge, dan diskon dibagi **proporsional**
sesuai porsi belanja masing-masing, bukan dibagi rata jumlah orang.

Dibangun dengan **Next.js 16 (App Router)** + React + **Supabase**
(PostgreSQL) buat persistence. Setiap sesi split dapet link sendiri
(`/r/<id>`) yang bisa dibagikan dan dibuka lagi kapan pun — datanya
tersimpan di database, bukan cuma di memory browser.

Versi ini masih MVP: input item manual, dan siapa pun yang pegang link
bisa ikut edit sesi itu (belum ada login/auth — lihat bagian keamanan di
bawah).

## Setup

```bash
npm install
```

1. Bikin project baru di [supabase.com](https://supabase.com) (gratis).
2. Buka **SQL Editor** di dashboard Supabase, paste isi `supabase/schema.sql`,
   lalu **Run**. Ini bikin 4 tabel: `receipts`, `receipt_items`,
   `participants`, `item_assignments`.
3. Buka **Project Settings -> API**, salin **Project URL** dan
   **anon public key**.
4. Buka [aistudio.google.com/apikey](https://aistudio.google.com/apikey),
   bikin API key gratis buat fitur scan struk (pakai Gemini).
5. Copy `.env.local.example` jadi `.env.local`, isi tiga value itu:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   GEMINI_API_KEY=AIza...
   ```

6. Jalanin:

   ```bash
   npm run dev
   ```

   Buka [http://localhost:3000](http://localhost:3000), klik **Mulai
   sekarang** — kamu bakal diarahkan ke `/r/<uuid>` dan semua perubahan
   otomatis kesimpen ke Supabase (~1 detik setelah kamu berhenti mengetik).

## Struktur

```
app/
├── layout.js                     # root layout, font, metadata
├── page.js                       # halaman awal: tombol "Mulai sekarang"
├── globals.css                   # design tokens monokrom
├── r/[id]/
│   ├── page.js                   # server component: load sesi dari DB, render app
│   └── not-found.js              # UI kalau link salah/sesi sudah dihapus
├── api/receipts/
│   ├── route.js                  # POST -> bikin sesi baru
│   └── [id]/route.js             # GET (load) / PUT (save, dengan validasi)
├── components/
│   └── PatunginApp.jsx           # semua state, 3 layar, auto-save (client component)
└── lib/
    ├── calculateSplit.js         # logika split, murni JS — gampang di-unit test
    ├── supabaseClient.js         # inisialisasi Supabase client
    └── receiptRepository.js      # semua query Supabase, terpisah dari route handler
supabase/
└── schema.sql                    # jalanin sekali di SQL Editor Supabase
```

**Kenapa dipisah jadi repository layer** (`lib/receiptRepository.js`):
route handler (`api/receipts/**`) jadi tipis, cuma urus HTTP request/response
dan validasi; semua query Supabase-nya terpusat di satu tempat. Kalau nanti
pindah dari "full replace" ke update per-baris, atau pindah dari Supabase ke
provider lain, cuma file ini yang perlu diubah.

## Alur pemakaian

1. **Home** — klik "Mulai sekarang" untuk bikin sesi baru (insert satu baris
   kosong di tabel `receipts`, lalu redirect ke `/r/<id>`).
2. **Item** — ketik nama & harga tiap item, plus persentase pajak/service
   charge dan nominal diskon kalau ada.
3. **Assign** — tambahkan nama peserta, lalu tandai siapa pesan item apa.
   Satu item boleh ditandai lebih dari satu orang (dibagi rata di antara
   mereka).
4. **Summary** — lihat nominal akhir tiap orang, salin ringkasannya ke
   clipboard. Tombol "Salin link" di pojok atas bisa dipakai kapan pun buat
   ngirim link sesi ini ke temen-temen.

Setiap perubahan (nambah/hapus item, assign, ubah pajak, dst) otomatis
tersimpan ke Supabase 800ms setelah perubahan terakhir (debounced), dengan
indikator "Menyimpan…" / "Tersimpan" / "Gagal menyimpan" di pojok atas.

## Logika split

Untuk tiap peserta:

```
final = item_milik_dia
      + (item_milik_dia / subtotal_semua_item) x (pajak + service - diskon)
```

**Rounding reconciliation**: nominal akhir dibulatkan ke rupiah terdekat,
dan sisa pembulatan dibebankan ke porsi terbesar, supaya total semua orang
selalu sama persis dengan total struk yang ditampilkan.

Sudah dites lewat beberapa skenario: angka bersih, item yang di-share 3
orang, dan diskon yang lebih besar dari subtotal (self-check di
`lib/calculateSplit.js`).

## Validasi yang sudah ditangani

- Nama/harga item kosong atau harga <= 0 ditolak dengan pesan error.
- Nama peserta duplikat ditolak (biar avatar inisialnya gak ketuker).
- Gak bisa lanjut ke summary kalau peserta kurang dari 2, atau ada item
  yang belum di-assign ke siapa pun.
- Hapus peserta otomatis membersihkan assignment-nya juga.
- Clipboard API dibungkus try/catch — kalau gagal (browser lama, bukan
  HTTPS), UI tetap kasih feedback tanpa nge-crash.

## Catatan build

Font (Plus Jakarta Sans) dimuat lewat `<link>` tag di `app/layout.js`,
bukan `next/font/google`, supaya build tidak butuh akses internet saat
proses build (berguna kalau kamu build di CI/CD yang jaringannya
dibatasi). Kalau environment kamu bebas akses internet saat build, kamu
bisa pindah balik ke `next/font/google` untuk self-hosting otomatis dan
menghindari render-blocking request ke Google Fonts.

## Model persistence: "full replace"

Tiap kali auto-save jalan, server **menghapus semua item & peserta lama
punya sesi itu, lalu insert ulang state yang sekarang** (assignment ikut
ke-cascade delete otomatis lewat foreign key). Ini jauh lebih simpel
daripada nge-diff dan update baris satu-satu, dan cukup buat kasus "satu
orang lagi ngedit sesi ini". Trade-off yang sadar dipilih:

- Kalau dua orang edit sesi yang sama di saat bersamaan, yang nyimpen
  paling akhir yang menang — tidak ada conflict resolution.
- Operasi delete+insert-nya bukan satu transaksi atomik (REST API Supabase
  yang dipakai di sini tidak expose transaksi multi-statement). Next
  step-nya: pindahkan ke satu Postgres function dan panggil lewat
  `.rpc()` biar atomik.

## Keamanan: belum ada auth

Row Level Security di `supabase/schema.sql` sengaja dibuat permisif
(`using (true)`) karena belum ada login. Modelnya kayak link Google Docs
dengan akses edit: **siapa pun yang pegang link `/r/<id>` bisa baca dan
ubah sesi itu**. Ini keputusan yang masuk akal buat MVP/demo, tapi jangan
dibawa ke production sungguhan tanpa nambah Supabase Auth dan
menyempitkan policy-nya ke `auth.uid()`.

## Yang sudah ditest, dan yang belum

Karena environment tempat aku ngerjain ini gak punya akses jaringan ke
`supabase.co`, aku sudah verifikasi sejauh yang bisa dites tanpa koneksi
database sungguhan:

- ✅ `npm run build` sukses tanpa error.
- ✅ `npm start` jalan, halaman utama dan route dinamis ke-generate dengan
  benar (`/`, `/api/receipts`, `/api/receipts/[id]`, `/r/[id]`).
- ✅ Validasi payload di `PUT /api/receipts/[id]` sudah dites manual dengan
  beberapa payload salah bentuk (array bukan array, harga <= 0, assignment
  yang mengacu ke item/peserta yang tidak ada) — semua ditolak dengan
  status 400 dan pesan yang jelas, *sebelum* sempat menyentuh Supabase.
- ✅ Kalau kredensial Supabase belum diisi, semua error ditangani dengan
  rapi (pesan jelas + status 500), bukan crash.
- ✅ Logika kalkulasi split (`lib/calculateSplit.js`) sudah lolos 5 test
  case (angka bersih, item di-share 3 orang, diskon lebih besar dari
  subtotal, rounding reconciliation).
- ⚠️ **Belum dites**: baca/tulis sungguhan ke Supabase (insert, delete,
  cascade dari foreign key, RLS policy). Ini butuh project Supabase asli
  dan koneksi internet yang aku gak punya di sini. Setelah kamu isi
  `.env.local`, coba alur penuhnya sekali (bikin sesi -> isi item ->
  refresh halaman -> pastikan datanya masih ada) sebagai sanity check
  terakhir.

## Fitur scan struk (Gemini)

Tombol **Scan Foto Struk** di layar pertama mengirim foto ke
`app/api/receipts/scan/route.js`, yang meneruskannya ke Gemini
(`gemini-1.5-flash`) dengan prompt yang minta output array JSON
`[{"name": ..., "price": ...}]`. Hasilnya divalidasi dan disaring sebelum
ditambahkan sebagai item baru — entri yang namanya kosong atau harganya
bukan angka positif dibuang, bukan diloloskan ke summary.

Butuh `GEMINI_API_KEY` di `.env.local` (lihat bagian Setup). Tanpa key ini,
tombolnya tetap muncul tapi akan menampilkan pesan error yang jelas,
bukan diam-diam gagal.

Batasan yang disengaja untuk saat ini:
- Ukuran foto dibatasi 8MB (dicek di client sebelum upload, dan di server
  sebagai jaring pengaman kedua).
- Kalau Gemini keliru baca angka atau salah pisah item, belum ada cara
  koreksi selain hapus manual item yang salah lalu ketik ulang — belum ada
  layar "review sebelum masuk" di antara scan dan daftar item.

## Belum ada (next steps)

- Layar review antara scan dan daftar item, biar salah baca AI bisa
  dikoreksi sebelum ikut kehitung.
- Autentikasi (Supabase Auth) supaya sesi terikat ke akun, bukan cuma
  "siapa pun yang pegang link".
- Share hasil sebagai gambar, bukan cuma teks di clipboard.
- Realtime sync antar device pakai Supabase Realtime, biar semua orang
  yang buka link yang sama lihat perubahan secara live tanpa refresh.
