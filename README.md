# GMAHK Taman Gethsemane - Aplikasi Web & Warta Ibadah

Aplikasi web resmi **GMAHK Taman Gethsemane** yang dirancang modern, responsif, dan mudah diakses dari perangkat smartphone maupun komputer/laptop. Web app ini menyajikan informasi lengkap seputar warta ibadah, susunan acara Sabat, sejarah gereja, hingga layanan jemaat.

---

## 🌟 Fitur Utama

- 📖 **Susunan Ibadah Sabat**: Jadwal Sekolah Sabat, Kebaktian Khotbah, Pemuda Advent (PA), dilengkapi _live countdown timer_ dan opsi cetak PDF.
- 🏛️ **Sejarah & Dokumentasi**: Kronologi perjalanan gereja serta galeri event dinamis berbasis presentasi Google Slides.
- 📍 **Lokasi & Kontak**: Integrasi Google Maps, rute petunjuk arah, serta layanan WhatsApp permohonan doa.
- 💖 **Persembahan Digital**: Informasi rekening gereja dan fitur salin nomor rekening.
- ⭐ **Ulasan Jemaat**: Sistem rating bintang dan pesan jemaat berbasis penyimpanan lokal (_localStorage_).
- 🌗 **Mode Tampilan**: Pengatur _Light Mode_ / _Dark Mode_ dan opsi simulasi layar.

---

## 🛠️ Teknologi

- **HTML5**: Struktur halaman semantik.
- **CSS3**: Sistem desain modern dengan Google Fonts (_Outfit_ & _Cinzel_).
- **JavaScript (Vanilla)**: Logika navigasi _Single Page App_ (SPA) dan fitur interaktif.

---

## 🚀 Cara Menjalankan

Buka berkas `index.html` langsung di browser pilihan Anda atau akses melalui layanan **GitHub Pages**.

## Menyiapkan Galeri Dokumentasi

1. Jalankan `supabase-gallery-events.sql` melalui Supabase **SQL Editor** untuk menyiapkan tabel `Kegiatan Jemaat`, kebijakan RLS, dan fungsi pengaturan slot.
2. Pada akun administrator di Supabase Auth, atur `app_metadata.role` menjadi `admin`. Kebijakan tulis tidak menggunakan `user_metadata`.
3. Pastikan presentasi Google Slides dapat dilihat publik atau diterbitkan ke web agar dapat dimuat melalui embed.

Setiap event berisi judul, subtitle, dan link Google Slides. Slot 1–3 membatasi galeri hingga tiga event.
