# GMAHK Taman Gethsemane — Warta & Susunan Ibadah ⛪

Aplikasi web (*Single Page Application*) resmi **GMAHK Taman Gethsemane**: modern, responsif, dan nyaman dibuka dari smartphone maupun komputer. Satu tempat untuk jemaat melihat susunan ibadah, sejarah gereja, direktori pelayan, kegiatan jemaat, hingga informasi persembahan — dan satu dashboard aman bagi Admin untuk mengelola datanya.

🔗 **Situs:** _tambahkan tautan GitHub Pages di sini_

---

## 🌟 Fitur Utama

### Untuk Jemaat

- 🏠 **Beranda** — Ayat Sabat, Misi & Visi GMAHK, pengumuman terkini, tombol aksi cepat, peta lokasi, serta ulasan jemaat.
- 📖 **Susunan Ibadah** — Tiga program dalam satu tempat: **Sabat Raya** (Sekolah Sabat & Ibadah Khotbah), **Pemuda Advent (PA)**, dan **Rabu Malam**. Dilengkapi *countdown* menuju ibadah berikutnya.
- 🎵 **Referensi Lagu** — Daftar lagu **LSEL** dan **AYS** yang bisa dicari berdasarkan judul atau nomor; tombol penanda menyalin nomor lagu.
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
  - **Jadwal POS** (petugas/pianis) — tambah, ubah, hapus, urutkan, cari, geser jadwal per minggu, dan **Import CSV**.
  - **Direktori Jemaat & Pengurus** — kelola kontak dan pilih siapa yang tampil pada permohonan doa.
  - **Sekolah Sabat & Khotbah** — kelola data susunan ibadah Sabat (tambah/ubah/hapus, cari, urutkan, geser minggu, Import CSV dengan pratinjau perbedaan).
  - **Edit Susunan Langsung** — admin mengubah petugas, lagu (dengan saran otomatis), dan judul khotbah langsung pada halaman Susunan Ibadah; hasilnya disimpan sebagai override tanggal itu.
  - **Galeri Kegiatan** — tambah, ubah, hapus, dan atur urutan event.
  - **Pengumuman** — ubah pengumuman yang tampil di Beranda.

---

## 🛠️ Teknologi

| Lapisan | Yang dipakai |
| --- | --- |
| Antarmuka | HTML5 semantik, CSS3 (variabel CSS untuk tema terang/gelap), JavaScript *vanilla* tanpa framework |
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
├── hero-bg.png    # Gambar latar banner Beranda
├── favicon.svg    # Logo & ikon situs
├── avatar-pastor/ # Foto pendeta untuk kartu di tab Sejarah
├── LICENSE        # Lisensi proyek
└── README.md      # Dokumentasi ini
```

### Peta `style.css`

Berkas dibagi menjadi 19 seksi bernomor (cari `N. JUDUL`): 1 Variabel & palet · 2 Reset & utilitas · 3 App shell · 4 Header · 5 Body & tab · 6 Beranda · 7 Sejarah · 8 Galeri kegiatan · 9 Susunan ibadah · 10 Navigasi bawah · 11 Modal · 12 Toast · 13 Direktori · 14 Persembahan · 15 Tombol admin · 16 Dashboard admin · 17 Cetak · 18 Toggle switch · 19 Skala responsif ponsel. Tema gelap hanya menimpa variabel warna lewat `[data-theme="dark"]`.

### Peta `script.js`

Setiap fungsi dan variabel global memiliki komentar JSDoc. Isi dibagi menjadi bagian bernomor (cari `// N.`):

| No. | Bagian | No. | Bagian |
| --- | --- | --- | --- |
| 0 | Konfigurasi & konstanta | 10 | Modal & konfirmasi hapus |
| 1 | State global | 11 | Utilitas umum (HTML, tanggal, toast) |
| 2 | Inisialisasi saat DOM siap | 12 | Susunan ibadah: data, render, editor, override |
| 3 | Animasi keluarga pendeta | 13 | Klien Supabase |
| 4 | Tema terang/gelap | 14 | Galeri kegiatan jemaat |
| 5 | Router tab berbasis hash | 15 | Autentikasi admin & dashboard |
| 6 | Countdown menuju Sabat | 16 | Jadwal: Pianis, Sekolah Sabat, Khotbah |
| 7 | Rating & ulasan | 17 | Direktori jemaat & pengurus |
| 8 | Pemilih program ibadah | 18 | Permohonan doa |
| 9 | Referensi lagu (LSEL & AYS) | 19 | Pengumuman |

**Alur data susunan ibadah:** kerangka `defaultWorshipData` → diisi dari `Tabel Pianis`, `Tabel SS`, dan `Tabel Khotbah` untuk Sabtu terdekat (lagu paten 515, 1, 260, 21, dan lagu tema *Misi Kita* ditetapkan di kode) → ditimpa override tanggal yang sama bila ada. Semuanya dirangkai oleh `applySabbathDatabaseRows()`.

**Konstanta penting:** `MAX_GALLERY_EVENTS` (3 slot galeri) dan `MAX_PRAYER_CONTACTS` (2 kontak doa selain Pendeta).

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

**Format Import CSV**

Header CSV harus persis sama dengan nama kolom tabel (unduh template dari modal Import). Pemisah `,`, `;`, atau tab terdeteksi otomatis; ukuran maksimal 5 MB; kolom `date` berformat `YYYY-MM-DD` dan tidak boleh ganda. Data digabung berdasarkan tanggal: tanggal baru ditambahkan, tanggal yang sudah ada diperbarui, dan pratinjau menandai kolom yang berbeda.

**Menyiapkan Ulasan Jemaat**

Buat tabel `Ulasan Jemaat` dengan kolom `id` (identity), `name` (text), `score` (integer), `comment` (text), dan `created_at` (timestamp, default `now()`). Aktifkan RLS. Izinkan pembacaan dan penambahan ulasan anonim sesuai kebijakan moderasi yang diinginkan; perubahan tabel operasional tetap dibatasi untuk admin. Nama dan komentar selalu di-*escape* saat ditampilkan.

**Menyiapkan Direktori & Pengumuman**

`Tabel Direktori` memakai kolom `category` (`gembala`, `officers`, `majelis_dept`; nilai lama `majelis_anggota` tetap dibaca sebagai `majelis_dept`), `name`, `role`, `phone`, `avatar_icon`, dan `show_in_prayer`. Pendeta selalu tampil di Permohonan Doa; maksimal dua kontak lain boleh dipilih admin. Tabel `Pengumuman` berkolom `content` dan `created_at`; yang tampil adalah baris terbaru.

---

## 🗄️ Penyimpanan Data

Data operasional dan ulasan dibaca/ditulis melalui Supabase tanpa cache browser. Supabase Auth menyimpan sesi secara persisten di `localStorage`, sehingga Admin tetap login setelah refresh atau browser dibuka kembali. Tema kembali ke mode terang dan halaman dimulai dari tab pada URL ketika dimuat ulang; hak akses tulis tetap dijaga oleh RLS Supabase.

---

## 🗺️ Roadmap

- [x] Susunan ibadah Sabat Raya, Pemuda Advent, dan Rabu Malam
- [x] Integrasi Supabase & dashboard Admin
- [x] Direktori jemaat dan permohonan doa
- [x] Galeri kegiatan berbasis Google Slides
- [ ] Panel Admin Pemuda Advent (kerangka data PA sudah disimpan sebagai komentar di `script.js`)
- [ ] Persembahan & persepuluhan online

---

## 👤 Pengembang

Dikembangkan dengan ❤️ oleh **[Meakhel Gunawan](https://github.com/MeakhelG)**.

&copy; 2026 — **GMAHK Taman Gethsemane**. All rights reserved.
