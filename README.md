# GMAHK Taman Gethsemane — Warta & Susunan Ibadah ⛪

Aplikasi web (*Single Page Application*) resmi **GMAHK Taman Gethsemane**: modern, responsif, dan nyaman dibuka dari smartphone maupun komputer. Satu tempat untuk jemaat melihat susunan ibadah, sejarah gereja, direktori pelayan, kegiatan jemaat, hingga informasi persembahan — dan satu dashboard aman bagi Admin untuk mengelola datanya.

🔗 **Situs:** _tambahkan tautan GitHub Pages di sini_

---

## 🌟 Fitur Utama

### Untuk Jemaat

- 🏠 **Beranda** — Ayat Sabat, Misi & Visi GMAHK, pengumuman terkini, tombol aksi cepat, peta lokasi, serta ulasan jemaat.
- 📖 **Susunan Ibadah** — Tiga program dalam satu tempat: **Sabat Raya** (Sekolah Sabat & Ibadah Khotbah), **Pemuda Advent (PA)**, dan **Rabu Malam**. Dilengkapi *countdown* menuju ibadah berikutnya.
- 🎵 **Referensi Lagu** — Daftar lagu **LSEL** dan **AYS** yang bisa dicari berdasarkan judul atau nomor.
- 🏛️ **Sejarah** — Kronologi perjalanan gereja dan ragam pelayanan jemaat.
- 🖼️ **Kegiatan Jemaat** — Galeri kegiatan berbasis presentasi Google Slides (maksimal tiga event).
- 📇 **Direktori Jemaat** — Daftar Pendeta, Officers, dan Majelis/Departemen yang dapat dicari, dengan tombol langsung ke WhatsApp.
- 🙏 **Permohonan Doa** — Kontak Pendeta dan Majelis ditampilkan otomatis untuk mengirim permohonan doa via WhatsApp.
- 💖 **Persembahan** — Informasi rekening gereja dengan tombol salin nomor rekening.
- ⭐ **Ulasan Jemaat** — Rating bintang dan pesan dibaca serta disimpan melalui Supabase.
- 🌗 **Mode Terang / Gelap** — Tema dapat diubah selama halaman dibuka.
- 🔗 **Tautan Langsung Antar Halaman** — Setiap tab punya alamat sendiri (mis. `#ibadah`, `#direktori`), sehingga mudah dibagikan.

### Untuk Admin

- 🔐 **Login Aman** — Autentikasi lewat **Supabase Auth**; hak tulis dijaga oleh **Row Level Security (RLS)** di database.
- 🗂️ **Dashboard Admin** dengan panel pengelolaan:
  - **Jadwal POS** (petugas/pianis) — tambah, ubah, hapus, urutkan, cari, dan geser jadwal per minggu.
  - **Direktori Jemaat & Pengurus** — kelola kontak dan pilih siapa yang tampil pada permohonan doa.
  - **Sekolah Sabat & Khotbah** — kelola data susunan ibadah Sabat.
  - **Override Susunan** — kelola susunan khusus berdasarkan program dan tanggal.
  - **Galeri Kegiatan** — tambah, ubah, hapus, dan atur urutan event.
  - **Pengumuman** — ubah pengumuman yang tampil di Beranda.

---

## 🛠️ Teknologi

| Lapisan | Yang dipakai |
| --- | --- |
| Antarmuka | HTML5 semantik, CSS3 (variabel CSS untuk tema), JavaScript *vanilla* |
| Tipografi & ikon | Google Fonts (*Outfit* & *Cinzel*), Font Awesome 6 |
| Backend | [Supabase](https://supabase.com) — PostgreSQL, Auth, dan RLS |
| Hosting | GitHub Pages (situs statis, tanpa *build step*) |

---

## 📁 Struktur Proyek

```text
.
├── index.html     # Struktur halaman, tab, dashboard admin, dan modal
├── style.css      # Sistem desain, tema terang/gelap, layout responsif
├── script.js      # Satu berkas JS: navigasi SPA, integrasi Supabase, logika fitur
├── favicon.svg    # Logo & ikon situs
└── README.md      # Dokumentasi ini
```

---

## 🚀 Cara Menjalankan

Proyek ini adalah situs statis, jadi tidak perlu instalasi apa pun.

**Secara lokal**

1. Unduh atau *clone* repositori ini.
2. Buka `index.html` di browser, atau jalankan server lokal agar perilaku mendekati produksi:

   ```bash
   python -m http.server 8000
   # lalu buka http://localhost:8000
   ```

**Di GitHub Pages**

1. Buka **Settings → Pages** pada repositori.
2. Pilih *branch* utama dan folder root (`/`), lalu simpan.

> Membutuhkan koneksi internet karena font, ikon, dan Supabase dimuat dari CDN.

---

## ⚙️ Konfigurasi Supabase

Aplikasi terhubung ke Supabase melalui `SUPABASE_URL` dan `SUPABASE_KEY` di bagian atas konfigurasi `script.js`.

> 🔑 Gunakan hanya kunci **publishable / anon**. Jangan pernah menaruh *service role key* di kode sisi klien — keamanan data dijaga oleh kebijakan RLS, bukan oleh kerahasiaan kunci publik.

**Tabel yang digunakan**

| Tabel | Fungsi |
| --- | --- |
| `Tabel SS` | Susunan Sekolah Sabat |
| `Tabel Khotbah` | Susunan Ibadah Khotbah |
| `Tabel Override Susunan` | Susunan khusus yang menimpa susunan Sabat/Rabu pada tanggal tertentu |
| `Ulasan Jemaat` | Rating dan ulasan publik |
| `Tabel Pianis` | Jadwal pianis / petugas (POS) |
| `Tabel Direktori` | Direktori jemaat dan pengurus |
| `Tabel LSEL` | Daftar lagu LSEL |
| `Tabel AYS` | Daftar lagu AYS |
| `Pengumuman` | Pengumuman pada Beranda |
| `Kegiatan Jemaat` | Event pada galeri dokumentasi |

**Menyiapkan akun Admin**

1. Buat pengguna di **Supabase Auth**.
2. Jika kebijakan RLS membatasi perubahan data untuk Admin, atur `app_metadata.role` menjadi `admin`. Aplikasi tidak menolak login berdasarkan claim role; izin tulis tetap ditentukan oleh RLS dan tidak memakai `user_metadata`.

**Menyiapkan Galeri Kegiatan**

1. Tabel `Kegiatan Jemaat`, kebijakan RLS, dan fungsi pengaturan slot dikelola langsung di Supabase (**SQL Editor** / **Table Editor**); tidak ada berkas SQL di repositori ini.
2. Pastikan presentasi Google Slides dapat dilihat publik atau sudah diterbitkan ke web agar bisa dimuat melalui *embed*.
3. Setiap event berisi judul, subtitle, dan tautan Google Slides. Slot 1–3 membatasi galeri hingga tiga event.

Tabel Override Susunan pada Supabase harus memiliki kolom `id`, `program_type`, `date_display`, `timeline_json`, dan `updated_at`. Atur RLS agar publik dapat membaca susunan, sedangkan perubahan hanya diizinkan sesuai kebijakan admin yang sudah dipakai proyek.

**Format Override Susunan**

Tabel `Tabel Override Susunan` memakai kolom `id`, `program_type`, `date_display`, `timeline_json`, dan `updated_at`. `program_type` berisi `sabat`, `rabu`, atau `pa`; `date_display` harus sama dengan tanggal tampilan, misalnya `Sabtu, 10 Oktober 2026`. `timeline_json` adalah array JSON berisi header bagian (`isHeader: true`) dan item susunan (`title`, `desc`, `time`, `highlight`, opsional `note`). Item lagu dapat menyimpan `type`, `songBook`, `songNo`, dan `songTitle`; item kelompok dapat menyimpan `subItems`. Override hanya dipakai jika program dan tanggal cocok persis.

Rabu malam selalu menampilkan susunan dasar dengan tanda `-` untuk petugas dan pengisi acara jika belum ada override pada tanggal tersebut. Setelah tanggal program berlalu, override lama tidak lagi digunakan; override bertanggal lampau dibersihkan dari Supabase saat admin memuat data. Sabat Raya kembali menggunakan susunan dari tabel Sekolah Sabat dan Khotbah setelah override tanggalnya berakhir.

**Menyiapkan Ulasan Jemaat**

Buat tabel `Ulasan Jemaat` dengan kolom `id` (identity), `name` (text), `score` (integer), `comment` (text), dan `created_at` (timestamp, default `now()`). Aktifkan RLS. Izinkan pembacaan dan penambahan ulasan anonim sesuai kebijakan moderasi yang diinginkan; perubahan tabel operasional tetap dibatasi untuk admin.

---

## 🗄️ Penyimpanan Data

Data operasional dan ulasan dibaca/ditulis melalui Supabase tanpa cache browser. Supabase Auth menyimpan sesi secara persisten di `localStorage`, sehingga Admin tetap login setelah refresh atau browser dibuka kembali. Tema kembali ke mode terang dan halaman dimulai dari tab pada URL ketika dimuat ulang; hak akses tulis tetap dijaga oleh RLS Supabase.

---

## 🗺️ Roadmap

- [x] Susunan ibadah Sabat Raya, Pemuda Advent, dan Rabu Malam
- [x] Integrasi Supabase & dashboard Admin
- [x] Direktori jemaat dan permohonan doa
- [x] Galeri kegiatan berbasis Google Slides
- [ ] Panel Admin Pemuda Advent
- [ ] Persembahan & persepuluhan online

---

## 👤 Pengembang

Dikembangkan dengan ❤️ oleh **[Meakhel Gunawan](https://github.com/MeakhelG)**.

&copy; 2026 — **GMAHK Taman Gethsemane**. All rights reserved.
