# GMAHK Taman Gethsemane — Warta & Susunan Ibadah ⛪

Aplikasi resmi GMAHK Taman Gethsemane untuk membantu jemaat mengakses informasi ibadah, kegiatan, dan pelayanan gereja.

**Versi saat ini: v1.0.0**

🔗 **Situs:** _tambahkan tautan GitHub Pages di sini_

---

## 🌟 Fitur Utama

### Untuk Jemaat

- 🏠 **Beranda** — Ayat Sabat, Misi & Visi GMAHK, pengumuman terkini, tombol aksi cepat, peta lokasi, serta ulasan jemaat.
- 📖 **Susunan Ibadah** — Tiga program dalam satu tempat: **Sabat Raya** (Sekolah Sabat & Ibadah Khotbah), **Pemuda Advent (PA)**, dan **Rabu Malam**. Dilengkapi _countdown_ menuju ibadah berikutnya.
- 🏛️ **Sejarah** — Kronologi perjalanan gereja dan ragam pelayanan jemaat.
- 🖼️ **Kegiatan Jemaat** — Galeri kegiatan berbasis presentasi Google Slides (maksimal tiga event).
- 📇 **Direktori Jemaat** — Daftar Pendeta, Officers, dan Majelis/Departemen yang dapat dicari.
- 🙏 **Permohonan Doa** — Kontak Pendeta dan Majelis ditampilkan otomatis untuk mengirim permohonan doa via WhatsApp.
- 💖 **Persembahan** — Informasi rekening gereja dengan tombol salin nomor rekening.
- ⭐ **Ulasan Jemaat** — Rating bintang dan pesan dibaca serta disimpan melalui Supabase.
- 🌗 **Mode Terang / Gelap** — Tema dapat diubah selama halaman dibuka.
- 🔗 **Tautan Langsung Antar Halaman** — Setiap tab punya alamat sendiri (mis. `#ibadah`, `#direktori`), sehingga mudah dibagikan.

### Untuk Admin

- 🔐 **Login Aman** — Autentikasi lewat **Supabase Auth**; hak tulis dijaga oleh **Row Level Security (RLS)** di database.
- 🎵 **Referensi Lagu** — Daftar lagu **LSEL** dan **AYS** yang bisa dicari berdasarkan judul atau nomor; tombol penanda menyalin nomor lagu.
- 🗂️ **Dashboard Admin** dengan panel pengelolaan:
  - **Jadwal Susunan Ibadah** — kelola data susunan ibadah dengan fitur tambah, ubah, hapus, urutkan, cari, geser jadwal per minggu, dan **Import CSV** dengan pratinjau perbedaan.
  - **Direktori Jemaat & Pengurus** — kelola kontak dan pilih siapa yang tampil pada permohonan doa.
  - **Edit Susunan Langsung** — admin mengubah petugas, lagu (dengan saran otomatis), dan judul khotbah langsung pada halaman Susunan Ibadah; hasilnya disimpan sebagai override tanggal itu.
  - **Galeri Kegiatan** — tambah, ubah, hapus, dan atur urutan event.
  - **Pengumuman** — ubah pengumuman yang tampil di Beranda.

---

## 🛠️ Teknologi

| Lapisan          | Yang dipakai                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| Antarmuka        | HTML5 semantik, CSS3 (variabel CSS untuk tema terang/gelap), JavaScript _vanilla_ tanpa framework |
| Tipografi & ikon | Google Fonts (_Outfit_ & _Cinzel_), Font Awesome 6                                                |
| Backend          | [Supabase](https://supabase.com) — PostgreSQL, Auth, dan RLS                                      |
| Hosting          | GitHub Pages (situs statis, tanpa _build step_)                                                   |

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
└── README.md      # Informasi untuk jemaat dan pengunjung
```

## Informasi untuk Jemaat

Melalui situs ini, jemaat dapat:

- Melihat jadwal **Sabat Raya**, **Pemuda Advent**, dan **Rabu Malam**.
- Membaca sejarah gereja dan melihat daftar pelayan.
- Mengikuti kabar dan dokumentasi kegiatan jemaat.
- Melihat informasi persembahan dan lokasi gereja.
- Mengirim permohonan doa serta memberikan ulasan dan penilaian.
- Mengakses situs melalui ponsel maupun komputer, dengan pilihan mode terang atau gelap.

## Informasi untuk Pengurus

Pengurus yang memiliki akses dapat masuk untuk memperbarui jadwal ibadah, direktori, galeri kegiatan, dan pengumuman.

---

## 🗺️ Roadmap

- [x] Susunan ibadah Sabat Raya, Pemuda Advent, dan Rabu Malam
- [x] Integrasi Supabase & dashboard Admin
- [x] Direktori jemaat dan permohonan doa
- [x] Galeri kegiatan berbasis Google Slides
- [ ] Panel Admin Pemuda Advent (kerangka data PA sudah disimpan sebagai komentar di `script.js`)

---

## 👤 Pengembang

Dikembangkan dengan ❤️ oleh **[Meakhel Gunawan](https://github.com/MeakhelG)**.

&copy; 2026 — **GMAHK Taman Gethsemane**. All rights reserved.
