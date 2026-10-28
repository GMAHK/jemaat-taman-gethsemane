/**
 * GMAHK TAMAN GETHSEMANE — Logika Aplikasi (Single Page App)
 *
 * Satu berkas JavaScript murni (tanpa build step) agar mudah di-host di GitHub Pages.
 * Dimuat setelah Supabase JS SDK (CDN) dan setelah markup di index.html, sehingga
 * seluruh elemen yang dicari lewat getElementById sudah tersedia.
 *
 * Konvensi:
 *  - Handler inline di HTML (onclick/oninput) memanggil fungsi global di berkas ini.
 *  - Data operasional dibaca/ditulis langsung ke Supabase tanpa cache browser;
 *    hak tulis dijaga oleh Row Level Security (bukan oleh status login di klien).
 *  - Nilai dari database selalu di-escape (escapeHtml) sebelum disisipkan lewat innerHTML.
 *
 * Peta isi (cari "// N." untuk melompat):
 *   0. Konfigurasi & konstanta          10. Modal & konfirmasi hapus
 *   1. State global                     11. Utilitas umum (HTML, tanggal, toast)
 *   2. Inisialisasi saat DOM siap       12. Susunan ibadah (data, render, editor, override)
 *   3. Animasi keluarga pendeta         13. Klien Supabase
 *   4. Tema terang/gelap                14. Galeri kegiatan jemaat
 *   5. Router tab berbasis hash         15. Autentikasi admin & dashboard
 *   6. Countdown menuju Sabat           16. Jadwal: Pianis, Sekolah Sabat, Khotbah
 *   7. Rating & ulasan                  17. Direktori jemaat & pengurus
 *   8. Pemilih program ibadah           18. Permohonan doa
 *   9. Referensi lagu (LSEL & AYS)      19. Pengumuman
 */

// ==========================================
// 0. KONFIGURASI & KONSTANTA
// Kredensial Supabase dan batas-batas aplikasi.
// ==========================================

/**
 * Kredensial Supabase. Kunci di bawah adalah kunci *publishable* (aman dipublikasikan);
 * akses tulis tetap dibatasi oleh Row Level Security di database.
 */
const SUPABASE_URL = "https://jgrarsmzaqcviurladpm.supabase.co";
const SUPABASE_KEY = "sb_publishable_Vp2_Hx0mpyreTrfFQW-14g_NTxNBABy";

/** Batas slot galeri "Kegiatan Jemaat" (sinkron dengan constraint slot 1–3 di Supabase). */
const MAX_GALLERY_EVENTS = 3;

/** Jumlah maksimum kontak (selain Pendeta) yang boleh tampil di modal Permohonan Doa. */
const MAX_PRAYER_CONTACTS = 2;

/** Pesan yang ditampilkan saat batas kontak doa tercapai. */
const PRAYER_LIMIT_MESSAGE = "Sudah ada 2 kontak doa. Nonaktifkan salah satu terlebih dahulu.";

// ==========================================
// 1. STATE GLOBAL (BAGIAN AWAL)
// Variabel yang dipakai lintas fitur. State khusus fitur dideklarasikan dekat fiturnya masing-masing.
// ==========================================

/** Klien Supabase; dibuat oleh initSupabaseClient() (null bila SDK gagal dimuat). */
let supabaseClient = null;

/** Event galeri hasil fetchGalleryEvents(), terurut berdasarkan slot (maks. MAX_GALLERY_EVENTS). */
let galleryEvents = [];
/** Pesan galat terakhir saat memuat galeri; string kosong bila berhasil. */
let galleryEventsLoadError = "";
/** Id event yang sedang dibuka di penampil galeri (null bila tidak ada). */
let currentGalleryEventId = null;
/** true saat admin berada di mode "Atur Slot" (drag & drop). */
let galleryOrderMode = false;
/** Salinan urutan sementara yang diedit di mode Atur Slot; baru disimpan saat admin menekan Simpan. */
let galleryOrderDraft = [];

/** Katalog lagu LSEL dari Supabase: [{ id, num, title, book: "LSEL" }]. Kosong bila tabel kosong/gagal dimuat. */
let lselSongs = [];
/** Katalog lagu AYS dari Supabase: [{ id, num, title, book: "AYS" }]. */
let aysSongs = [];
/** Gabungan lselSongs + aysSongs untuk daftar di modal referensi lagu. */
let hymnalSongs = [];

/** Skor bintang (0–5) yang dipilih pengguna pada formulir ulasan; 0 = belum memilih. */
let userRatingScore = 0;
/** Maks. 5 ulasan terbaru yang ditampilkan di Beranda. */
let communityRatings = [];

// ==========================================
// 2. INISIALISASI SAAT DOM SIAP
// Titik masuk aplikasi: memasang semua fitur setelah HTML selesai dimuat.
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initRouter();
  initMinisterFamilyTransitions();
  initCountdown();
  initRatingSystem();
  initProgramTabs();
  initWorshipSubTabs();
  initHymnal();
  initModalDismissal();
  initAdminState();
  renderPublicDirectory();
});

// ==========================================
// 3. ANIMASI KARTU KELUARGA PENDETA (TAB SEJARAH)
// ==========================================

/**
 * Menganimasikan buka/tutup daftar keluarga pendeta (<details class="minister-family">).
 * Browser menyembunyikan isi <details> seketika, jadi tinggi kartu (.minister-card) dianimasikan manual lewat Web Animations API.
 * Menghormati prefers-reduced-motion: tanpa animasi bila diminta pengguna.
 */
function initMinisterFamilyTransitions() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  document.querySelectorAll(".minister-family").forEach(family => {
    const summary = family.querySelector("summary");
    const card = family.closest(".minister-card");
    if (!summary || !card) return;

    let desiredOpen = family.open;
    let cardAnimation = null;
    let pendingFrame = 0;

    summary.addEventListener("click", event => {
      event.preventDefault();

      const startHeight = card.getBoundingClientRect().height;
      if (cardAnimation) {
        cardAnimation.cancel();
        cardAnimation = null;
      }
      if (pendingFrame) {
        cancelAnimationFrame(pendingFrame);
        pendingFrame = 0;
      }

      const shouldOpen = !desiredOpen;
      desiredOpen = shouldOpen;
      family.classList.toggle("is-closing", !shouldOpen);
      family.open = true;
      card.style.height = "auto";
      let endHeight = card.getBoundingClientRect().height;

      if (!shouldOpen) {
        family.open = false;
        card.style.height = "auto";
        endHeight = card.getBoundingClientRect().height;
        family.open = true;
      }

      card.style.height = `${startHeight}px`;
      card.style.overflow = "hidden";
      card.classList.add("is-family-animating");
      card.offsetHeight;

      const finish = () => {
        if (desiredOpen !== shouldOpen) return;
        family.open = shouldOpen;
        family.classList.remove("is-closing");
        card.style.height = "";
        card.style.overflow = "";
        card.classList.remove("is-family-animating");
        cardAnimation = null;
      };

      if (reduceMotion.matches || Math.abs(endHeight - startHeight) < 1) {
        finish();
        return;
      }

      pendingFrame = requestAnimationFrame(() => {
        pendingFrame = 0;
        const animation = card.animate(
          [{ height: `${startHeight}px` }, { height: `${endHeight}px` }],
          { duration: 240, easing: "cubic-bezier(.2, .7, .2, 1)" }
        );
        cardAnimation = animation;
        animation.onfinish = () => {
          if (cardAnimation === animation) finish();
        };
      });
    });
  });
}

// ==========================================
// 4. TEMA TERANG / GELAP
// Tema hanya berlaku selama halaman terbuka (tidak disimpan); setiap muat ulang kembali ke mode terang.
// ==========================================

/** Memulai tema terang dan memasang tombol pengalih tema di header. */
function initTheme() {
  setTheme("light");

  const themeBtn = document.getElementById("btn-theme-toggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      toggleTheme();
    });
  }
}

/** Berganti antara tema terang dan gelap. */
function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const nextTheme = current === "dark" ? "light" : "dark";
  setTheme(nextTheme);
}

/**
 * Menerapkan tema lewat atribut data-theme pada <html> dan memperbarui ikon tombol tema.
 * @param {"light"|"dark"} theme
 */
function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const icon = theme === "dark"
    ? '<i class="fa-solid fa-sun text-gold"></i>'
    : '<i class="fa-solid fa-moon"></i>';

  const themeBtn = document.getElementById("btn-theme-toggle");
  if (themeBtn) themeBtn.innerHTML = icon;

  const adminThemeBtn = document.getElementById("btn-admin-theme-toggle");
  if (adminThemeBtn) adminThemeBtn.innerHTML = icon;
}


// ==========================================
// 5. NAVIGASI TAB & ROUTER BERBASIS HASH
// Setiap tab punya alamat sendiri (#beranda, #ibadah, ...) sehingga tombol Back/Forward dan tautan bagikan berfungsi.
// Halaman penampil galeri memakai pola #galeri-<id-event>.
// ==========================================

/** Peta id tab -> hash URL (dipakai saat berpindah tab). */
const tabToHashMap = {
  "tab-home": "beranda",
  "tab-history": "sejarah",
  "tab-worship": "ibadah",
  "tab-directory": "direktori",
  "tab-donate": "persembahan",
  "tab-gallery-viewer": "galeri"
};

/** Peta hash URL -> id tab. Alias bahasa Inggris (home, history, ...) dipertahankan agar tautan lama tetap berfungsi. */
const hashToTabMap = {
  "beranda": "tab-home",
  "home": "tab-home",
  "sejarah": "tab-history",
  "history": "tab-history",
  "ibadah": "tab-worship",
  "worship": "tab-worship",
  "direktori": "tab-directory",
  "directory": "tab-directory",
  "persembahan": "tab-donate",
  "donate": "tab-donate",
  "galeri": "tab-gallery-viewer"
};

/**
 * Mencari id tab dari hash URL.
 * @returns {string|null} Id tab, atau null bila hash tidak dikenal.
 */
function resolveTabFromHash(hash) {
  return hashToTabMap[hash] || (hash.startsWith("galeri-") ? "tab-gallery-viewer" : null);
}

/** Seperti resolveTabFromHash(), tetapi hash tak dikenal jatuh ke tab Beranda. */
function getTabIdFromHash(hash) {
  return resolveTabFromHash(hash) || "tab-home";
}

/** Bila hash berpola "galeri-<id>", simpan id event aktif dan tampilkan penampil galerinya. */
function renderGalleryViewerFromHash(hash) {
  if (!hash.startsWith("galeri-")) return;
  currentGalleryEventId = hash.slice("galeri-".length);
  renderGalleryViewer(currentGalleryEventId);
}

/**
 * Menampilkan satu tab: mengaktifkan konten & tombol navigasi bawah, memperbarui hash URL/riwayat, lalu menggulir ke atas.
 * @param {string} tabId Id elemen tab (mis. "tab-worship").
 * @param {boolean} [updateHistory=true] false saat dipanggil dari router agar riwayat tidak bertambah dua kali.
 */
function switchTab(tabId, updateHistory = true) {
  // Sembunyikan semua tab
  const tabs = document.querySelectorAll(".tab-content");
  tabs.forEach(tab => tab.classList.remove("active"));

  // Tampilkan tab tujuan
  const targetTab = document.getElementById(tabId);
  if (targetTab) {
    targetTab.classList.add("active");
  }

  // Tandai tombol navigasi bawah yang aktif
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach(item => item.classList.remove("active"));

  const navTabId = tabId === "tab-gallery-viewer" ? "tab-home" : tabId;
  const targetNavBtn = document.getElementById(`nav-${navTabId}`);
  if (targetNavBtn) {
    targetNavBtn.classList.add("active");
  }

  // Perbarui hash URL dan riwayat browser
  const hash = tabId === "tab-gallery-viewer" && currentGalleryEventId
    ? `galeri-${currentGalleryEventId}`
    : tabToHashMap[tabId] || "beranda";
  if (updateHistory) {
    if (window.location.hash !== `#${hash}`) {
      const state = {
        tabId,
        galleryViewer: tabId === "tab-gallery-viewer",
        galleryEventId: tabId === "tab-gallery-viewer" ? currentGalleryEventId : null
      };
      const replaceViewerEntry = tabId === "tab-gallery-viewer"
        && window.location.hash.replace("#", "").startsWith("galeri-");
      window.history[replaceViewerEntry ? "replaceState" : "pushState"](state, "", `#${hash}`);
    }
  }

  // Gulir area utama ke atas dengan halus
  const appBody = document.querySelector(".app-body");
  if (appBody) {
    appBody.scrollTo({ top: 0, behavior: "smooth" });
  }
}

/**
 * Memasang router: mendengarkan popstate/hashchange (tombol Back/Forward) dan menampilkan tab sesuai hash awal.
 * Menekan Back dari penampil galeri mengembalikan pengguna ke Beranda.
 */
function initRouter() {
  const applyHashRoute = event => {
    const hash = window.location.hash.replace("#", "").toLowerCase();
    if (event?.type === "popstate" && hash.startsWith("galeri-")) {
      currentGalleryEventId = null;
      window.history.replaceState({ tabId: "tab-home" }, "", "#beranda");
      switchTab("tab-home", false);
      return;
    }
    const tabId = getTabIdFromHash(hash);
    if (tabId === "tab-gallery-viewer") renderGalleryViewerFromHash(hash);
    switchTab(tabId, false);
  };

  // Dengarkan tombol Back/Forward browser dan gestur kembali di ponsel
  window.addEventListener("popstate", applyHashRoute);
  window.addEventListener("hashchange", applyHashRoute);

  // Mulai dari rute pada URL, atau dari tab Beranda.
  const initialHash = window.location.hash.replace("#", "").toLowerCase();
  const tabFromHash = resolveTabFromHash(initialHash);

  if (tabFromHash) {
    if (tabFromHash === "tab-gallery-viewer") renderGalleryViewerFromHash(initialHash);
    switchTab(tabFromHash, false);
  } else {
    switchTab("tab-home", true);
  }
}

// ==========================================
// 6. COUNTDOWN MENUJU IBADAH SABAT
// ==========================================

/** Memulai hitung mundur (hari/jam/menit/detik) menuju Sabtu 09.00 terdekat; diperbarui tiap detik. */
function initCountdown() {
  const elDays = document.getElementById("cd-days");
  const elHours = document.getElementById("cd-hours");
  const elMins = document.getElementById("cd-mins");
  const elSecs = document.getElementById("cd-secs");
  const pad = value => String(value).padStart(2, "0");

  function updateTimer() {
    const now = new Date();
    const target = new Date(now);
    target.setHours(9, 0, 0, 0);

    // Hari menuju Sabtu; bila hari ini Sabtu dan jam 09.00 sudah lewat, hitung ke Sabtu depan.
    let daysUntilSaturday = (6 - now.getDay() + 7) % 7;
    if (daysUntilSaturday === 0 && now > target) daysUntilSaturday = 7;
    target.setDate(target.getDate() + daysUntilSaturday);

    const diff = Math.max(0, target - now);
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    if (elDays) elDays.textContent = pad(days);
    if (elHours) elHours.textContent = pad(hours);
    if (elMins) elMins.textContent = pad(minutes);
    if (elSecs) elSecs.textContent = pad(seconds);
  }

  updateTimer();
  setInterval(updateTimer, 1000);
}

// ==========================================
// 7. RATING BINTANG & ULASAN JEMAAT
// Ulasan dibaca dan disimpan di tabel Supabase "Ulasan Jemaat".
// ==========================================

/** Memasang interaksi rating bintang (hover/klik), pengiriman ulasan, tombol ubah, lalu memuat ulasan komunitas. */
function initRatingSystem() {
  const starContainer = document.getElementById("star-rating-container");
  if (!starContainer) return;

  const stars = starContainer.querySelectorAll(".star-btn");
  const scoreLabel = document.getElementById("rating-score-label");
  const ratingForm = document.getElementById("rating-form");
  const editRatingBtn = document.getElementById("btn-edit-rating");

  stars.forEach(star => {
    star.addEventListener("mouseover", function () {
      const val = parseInt(this.getAttribute("data-value"));
      highlightStars(val, "hover");
    });

    star.addEventListener("mouseout", function () {
      highlightStars(userRatingScore, "active");
    });

    star.addEventListener("click", function () {
      userRatingScore = parseInt(this.getAttribute("data-value"));
      highlightStars(userRatingScore, "active");
      const labels = ["", "Kurang", "Cukup", "Baik", "Sangat Baik", "Luar Biasa & Diberkati!"];
      if (scoreLabel) scoreLabel.textContent = `Nilai: ${userRatingScore}/5 (${labels[userRatingScore]})`;
    });
  });

  if (ratingForm) {
    ratingForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (userRatingScore === 0) {
        showToast("Silakan pilih rating 1 - 5 bintang terlebih dahulu", "fa-solid fa-triangle-exclamation");
        return;
      }

      const nameInput = document.getElementById("rating-name").value.trim() || "Jemaat Taman Gethsemane";
      const commentInput = document.getElementById("rating-comment").value.trim() || "Sangat terberkati dengan warta dan ibadah.";

      const ratingObj = {
        name: nameInput,
        score: userRatingScore,
        comment: commentInput,
        date: new Date().toLocaleDateString("id-ID")
      };

      saveUserRating(ratingObj).then(savedRating => {
        if (!savedRating) return;
        renderUserRatingView(savedRating);
        showToast("Penilaian Anda berhasil disimpan! Terima kasih.");
      });
    });
  }

  if (editRatingBtn) {
    editRatingBtn.addEventListener("click", () => {
      document.getElementById("rating-success-message").classList.add("hidden");
      document.getElementById("rating-form").classList.remove("hidden");
    });
  }

  fetchCommunityRatings();
}

/**
 * Mewarnai bintang 1..count dengan kelas `className` ("hover" atau "active") dan mengosongkan sisanya.
 * @param {number} count
 * @param {"hover"|"active"} className
 */
function highlightStars(count, className) {
  const stars = document.querySelectorAll("#star-rating-container .star-btn");
  stars.forEach((s, idx) => {
    s.classList.remove("active", "hover");
    if (idx < count) {
      s.classList.add(className);
      s.classList.replace("fa-regular", "fa-solid");
    } else {
      s.classList.replace("fa-solid", "fa-regular");
    }
  });
}

/**
 * Menyimpan ulasan ke tabel Supabase "Ulasan Jemaat" dan menaruhnya di daftar ulasan teratas.
 * @returns {Promise<object|null>} Baris tersimpan, atau null bila gagal.
 */
async function saveUserRating(ratingObj) {
  initSupabaseClient();
  if (!supabaseClient) {
    showToast("Supabase belum terhubung. Ulasan tidak disimpan.", "fa-solid fa-triangle-exclamation");
    return null;
  }
  const { data, error } = await supabaseClient.from("Ulasan Jemaat").insert(ratingObj).select().single();
  if (error) {
    showToast(`Ulasan gagal disimpan: ${error.message}`, "fa-solid fa-triangle-exclamation");
    return null;
  }
  communityRatings = [data, ...communityRatings].slice(0, 5);
  renderCommunityReviews();
  return data;
}

/** Memuat 5 ulasan terbaru dari Supabase lalu menampilkannya. */
async function fetchCommunityRatings() {
  initSupabaseClient();
  const container = document.getElementById("reviews-list");
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient
    .from("Ulasan Jemaat")
    .select("id, name, score, comment, created_at")
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) {
    console.warn("Supabase fetch reviews error:", error.message);
    if (container) container.innerHTML = '<p class="reviews-empty">Ulasan belum dapat dimuat.</p>';
    return;
  }
  communityRatings = data || [];
  renderCommunityReviews();
}

/** Menyembunyikan formulir dan menampilkan ringkasan ulasan yang baru dikirim pengguna. */
function renderUserRatingView(ratingObj) {
  const form = document.getElementById("rating-form");
  const successBox = document.getElementById("rating-success-message");
  const details = document.getElementById("saved-rating-details");

  if (form) form.classList.add("hidden");
  if (successBox) successBox.classList.remove("hidden");
  if (details) {
    details.innerHTML = `Rating: <strong>${'★'.repeat(ratingObj.score)}</strong> oleh <em>${escapeHtml(ratingObj.name)}</em><br>"${escapeHtml(ratingObj.comment)}"`;
  }
}

/** Menampilkan daftar ulasan komunitas (nama dan komentar di-escape untuk mencegah XSS). */
function renderCommunityReviews() {
  const container = document.getElementById("reviews-list");
  if (!container) return;

  container.innerHTML = communityRatings.length ? communityRatings.map(r => `
    <div class="review-item">
      <div class="review-user">
        <span>${escapeHtml(r.name)}</span>
        <span class="review-stars">${'★'.repeat(r.score)}</span>
      </div>
      <div class="review-text">"${escapeHtml(r.comment)}"</div>
    </div>
  `).join('') : '<p class="reviews-empty">Belum ada ulasan.</p>';
}

// ==========================================
// 8. PEMILIH PROGRAM IBADAH
// ==========================================

/** Memasang tombol pemilih program (Sabat Raya / PA / Rabu Malam): menampilkan panel program dan merender susunannya. */
function initProgramTabs() {
  const btns = document.querySelectorAll(".program-tab-btn");
  btns.forEach(btn => {
    btn.addEventListener("click", function () {
      const targetProg = this.getAttribute("data-program");

      btns.forEach(b => b.classList.remove("active"));
      this.classList.add("active");

      const progs = document.querySelectorAll(".program-content");
      progs.forEach(p => p.classList.remove("active"));

      const activeProg = document.getElementById(`prog-${targetProg}`);
      if (activeProg) {
        activeProg.classList.add("active");
        renderSubTab(targetProg);
      }
    });
  });
}

// ==========================================
// 9. REFERENSI LAGU (LSEL & AYS)
// Katalog lagu dimuat dari Supabase; dipakai modal referensi lagu dan saran lagu di editor susunan.
// ==========================================

/** Merender daftar lagu awal lalu memuat katalog dari Supabase. */
function initHymnal() {
  renderHymnalList(hymnalSongs);
  fetchHymnalData();
}

/**
 * Menampilkan daftar lagu pada modal referensi lagu.
 * @param {Array} songs Daftar { num, title, book }.
 */
function renderHymnalList(songs) {
  const container = document.getElementById("hymnal-list-container");
  if (!container) return;

  if (songs.length === 0) {
    container.innerHTML = '<p style="text-align:center; padding: 10px; color: var(--text-muted);">Lagu tidak ditemukan.</p>';
    return;
  }

  container.innerHTML = songs.map(s => `
    <div class="hymnal-item">
      <div>
        <span class="hymnal-num">${s.book || "LSEL"} No. ${escapeHtml(String(s.num))}</span>
        <div class="hymnal-title">${escapeHtml(s.title)}</div>
      </div>
      <button class="btn-copy" data-num="${escapeHtml(String(s.num))}" onclick="copyToClipboard(this.dataset.num, 'Nomor Lagu')">
        <i class="fa-solid fa-bookmark"></i>
      </button>
    </div>
  `).join('');
}

/** Menyaring daftar lagu berdasarkan judul atau nomor sesuai isi kolom cari. */
function filterHymnal() {
  const query = document.getElementById("hymnal-search-input").value.toLowerCase().trim();
  if (!query) {
    renderHymnalList(hymnalSongs);
    return;
  }

  const filtered = hymnalSongs.filter(s =>
    String(s.num).includes(query) || s.title.toLowerCase().includes(query)
  );
  renderHymnalList(filtered);
}

/** Memuat Tabel LSEL dan Tabel AYS secara paralel, menggabungkannya, lalu merender ulang daftar dan susunan (agar judul lagu terisi). */
async function fetchHymnalData() {
  initSupabaseClient();
  if (!supabaseClient) return;

  try {
    const [{ data: lselData, error: lselError }, { data: aysData, error: aysError }] = await Promise.all([
      supabaseClient.from("Tabel LSEL").select("id, nomor, judul").order("nomor", { ascending: true }),
      supabaseClient.from("Tabel AYS").select("id, number, title").order("number", { ascending: true })
    ]);

    if (lselError) throw new Error(`Tabel LSEL: ${lselError.message}`);
    if (aysError) throw new Error(`Tabel AYS: ${aysError.message}`);

    if (lselData && lselData.length > 0) {
      lselSongs = lselData.map(song => ({
        id: song.id,
        num: song.nomor,
        title: song.judul,
        book: "LSEL"
      }));
    }

    if (aysData) {
      aysSongs = aysData.map(song => ({
        id: song.id,
        num: song.number,
        title: song.title,
        book: "AYS"
      }));
    }

    hymnalSongs = [...lselSongs, ...aysSongs];
    renderHymnalList(hymnalSongs);
    ["sabat-raya", "rabu-malam"].forEach(renderSubTab);
  } catch (error) {
    console.warn("Gagal mengambil katalog lagu dari Supabase:", error.message);
  }
}

// ==========================================
// 10. MODAL & KONFIRMASI HAPUS
// ==========================================

/** Membuka modal berdasarkan id. Modal Permohonan Doa dirender ulang dulu agar kontaknya terbaru. */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    if (modalId === "modal-prayer") renderPrayerModal();
    modal.classList.add("active");
  }
}

/** Menutup modal berdasarkan id. */
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("active");
  }
}

/** Callback yang dijalankan bila pengguna menyetujui modal konfirmasi hapus generik (modal-delete-confirm). */
let pendingDeleteAction = null;

/**
 * Membuka modal konfirmasi hapus generik yang dipakai berbagai fitur.
 * @param {object} options
 * @param {string} options.subtitle Label kecil di atas pesan (mis. nama tabel).
 * @param {string} options.message Pertanyaan konfirmasi.
 * @param {string} options.description Keterangan tambahan.
 * @param {Function} options.onConfirm Dijalankan bila pengguna menekan Hapus.
 */
function openDeleteConfirmation({ subtitle, message, description, onConfirm }) {
  document.getElementById("delete-confirm-subtitle").textContent = subtitle;
  document.getElementById("delete-confirm-message").textContent = message;
  document.getElementById("delete-confirm-description").textContent = description;
  pendingDeleteAction = onConfirm;
  openModal("modal-delete-confirm");
}

/** Membatalkan konfirmasi hapus dan menutup modalnya. */
function cancelDeleteConfirmation() {
  pendingDeleteAction = null;
  closeModal("modal-delete-confirm");
}

/** Menutup modal lalu menjalankan callback onConfirm yang tertunda. */
async function confirmDeleteAction() {
  const onConfirm = pendingDeleteAction;
  pendingDeleteAction = null;
  closeModal("modal-delete-confirm");
  if (onConfirm) await onConfirm();
}

/**
 * Menampilkan toast hasil penghapusan (berhasil/gagal).
 * @param {boolean} success
 * @param {string} description
 */
function showDeleteResult(success, description) {
  showToast(
    success ? `Data Berhasil Dihapus. ${description}` : `Permintaan Gagal: ${description}`,
    success ? "fa-solid fa-circle-check text-emerald" : "fa-solid fa-triangle-exclamation text-amber"
  );
}

/**
 * Menutup satu modal lewat klik latar/tombol Esc dan membersihkan state tertunda miliknya.
 * Modal Import CSV tidak boleh ditutup saat proses simpan berjalan.
 */
function dismissModalOverlay(modal) {
  if (modal.id === "modal-csv-import") {
    if (csvImportState?.saving) return;
    csvImportState = null;
  }
  if (modal.id === "modal-delete-confirm") pendingDeleteAction = null;
  modal.classList.remove("active");
}

/** Memasang penutupan modal lewat klik latar gelap dan tombol Esc. */
function initModalDismissal() {
  // Klik pada latar gelap (.modal-overlay itu sendiri, bukan kartu di dalamnya).
  document.addEventListener("click", e => {
    if (e.target.classList.contains("modal-overlay")) dismissModalOverlay(e.target);
  });

  // Tombol Esc menutup semua modal yang sedang terbuka.
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    document.querySelectorAll(".modal-overlay.active").forEach(dismissModalOverlay);
  });
}

// ==========================================
// 11. UTILITAS UMUM
// ==========================================

/**
 * Mengubah karakter khusus HTML menjadi entitas agar aman disisipkan lewat innerHTML.
 * @param {*} str Nilai apa pun; null/undefined/"" menghasilkan string kosong.
 * @returns {string} Teks yang sudah di-escape.
 */
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Mengubah objek Date menjadi string ISO lokal "YYYY-MM-DD" (format kolom `date` di Supabase).
 * Memakai komponen lokal (bukan toISOString) agar tidak bergeser hari karena zona waktu.
 */
function toIsoDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

/**
 * Menggeser tanggal ISO sebanyak `days` hari (boleh negatif).
 * Jika `isoDate` tidak valid, nilai aslinya dikembalikan apa adanya.
 */
function shiftIsoDate(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

/** Memeriksa apakah nilai berformat UUID (id baris Supabase; id sementara klien berawalan "pos-"/"dir-"). */
function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Menyalin teks ke clipboard dan menampilkan toast hasilnya.
 * @param {string} text Teks yang disalin.
 * @param {string} label Nama yang ditampilkan di toast (mis. "Nomor Rekening").
 */
function copyToClipboard(text, label) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(`${label} (${text}) berhasil disalin!`);
  }).catch(() => {
    showToast(`Gagal menyalin. Silakan salin manual: ${text}`);
  });
}

/**
 * Menampilkan notifikasi toast selama 3,5 detik.
 * @param {string} message
 * @param {string} [iconClass] Kelas Font Awesome ikon (boleh ditambah kelas warna seperti text-gold).
 */
function showToast(message, iconClass = "fa-solid fa-circle-check") {
  const toast = document.getElementById("toast");
  const toastMsg = document.getElementById("toast-message");
  const toastIcon = document.getElementById("toast-icon");

  if (!toast || !toastMsg) return;

  toastMsg.textContent = message;
  if (toastIcon) toastIcon.className = iconClass;

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3500);
}

// ==========================================
// 12. SUSUNAN IBADAH: DATA DASAR, RENDER, EDITOR INLINE & OVERRIDE
// Alur data: defaultWorshipData -> diisi dari Tabel SS/Khotbah/Pianis -> ditimpa override tanggal tersebut (jika ada).
// ==========================================

/**
 * Susunan dasar (kerangka) tiap program ibadah: judul, bagian, dan baris acara.
 * Nama petugas/lagu dikosongkan lalu diisi dari Supabase oleh applySabbathDatabaseRows().
 * Program Pemuda Advent ("pa") belum aktif; templatenya disimpan sebagai komentar di bawah untuk fitur mendatang.
 * Format item: { time, name, officer, type: "text"|"song"|"group", highlight?, songBook?/songNo?/songTitle?, sermonTitle?, subItems? }.
 */
const defaultWorshipData = {
  "sabat-raya": {
    title: "Susunan Ibadah Kebaktian Sabat Ke-12",
    subtitle: "Sabtu, 19 September 2026",
    dateNum: "19",
    dateMonth: "SEP",
    generalInfo: [
      { key: "Pianis", value: "Sdri. Rachel Sianturi" }
    ],
    sections: [
      {
        title: "Ibadah Sekolah Sabat (Pukul 09.00 - 10.00 WIB)",
        items: [
          { time: "1", name: "Pemimpin Acara", officer: "Bpk. Michael", type: "text" },
          { time: "2", name: "Lagu Buka", officer: "", type: "song", songBook: "LSEL No.", songNo: "", songTitle: "" },
          { time: "3", name: "Ayat Inti - Doa Buka", officer: "Ibu Eni", type: "text" },
          { time: "4", name: "Berita Mission", officer: "Bpk. Okta", type: "text" },
          {
            time: "5",
            name: "Diskusi Sekolah Sabat",
            type: "group",
            highlight: true,
            subItems: [
              { label: "Orang Muda", officer: "Sdr. Hizkia" },
              { label: "Orang Tua", officer: "Sdr. Sapto" }
            ]
          },
          { time: "6", name: "Lagu Pujian", officer: "Orang Muda", type: "text" },
          { time: "7", name: "Promosi Pelayanan Perorangan", officer: "Ibu Tabita", type: "text" },
          { time: "8", name: "Lagu Tutup", officer: "", type: "song", songBook: "LSEL No.", songNo: "", songTitle: "" },
          { time: "9", name: "Diakon & Diakones", officer: "Sdr. Adit & Sdr. Diaz", type: "text" },
          { time: "10", name: "Cerita Anak", officer: "Ibu Teresia", type: "text" }
        ]
      },
      {
        title: "Ibadah Khotbah (Pukul 10.10 - 12.00 WIB)",
        items: [
          { time: "1", name: "Lagu Pengiring Partisipan Mimbar", officer: "", type: "song", songBook: "LSEL No.", songNo: "515", songTitle: "" },
          { time: "2", name: "Lagu Sambutan", officer: "", type: "song", songBook: "LSEL No.", songNo: "1 ayat 1", songTitle: "" },
          { time: "3", name: "MC/Ayat Bersahutan", officer: "Bpk. William", type: "text" },
          { time: "4", name: "Lagu Buka", officer: "", type: "song", songBook: "LSEL No.", songNo: "", songTitle: "" },
          { time: "5", name: "Doa Syafaat", officer: "Bpk. Warno", type: "text" },
          { time: "6", name: "Bacaan Persembahan", officer: "Bpk. William", type: "text" },
          { time: "7", name: "Lagu Persembahan", officer: "", type: "song", songBook: "LSEL No.", songNo: "260", songTitle: "" },
          { time: "8", name: "Lagu Persembahan Lanjutan", officer: "", type: "song", songBook: "LSEL No.", songNo: "21", songTitle: "" },
          { time: "9", name: "Doa Persembahan", officer: "Bpk. William", type: "text" },
          { time: "10", name: "Lagu Pujian", officer: "Jemaat yang lahir bulan September - Desember", type: "text" },
          { time: "11", name: "Ayat Inti & Visi Misi", officer: "Bpk. Warno", type: "text" },
          { time: "12", name: "Lagu Tema", officer: "Misi Kita", type: "text" },
          { time: "13", name: "Khotbah", officer: "Bpk. M Simangunsong", sermonTitle: "", type: "text", highlight: true },
          { time: "15", name: "Lagu Tutup", officer: "", type: "song", songBook: "LSEL No.", songNo: "", songTitle: "" },
          { time: "16", name: "Doa Tutup", officer: "Bpk. M Sinangunsong", type: "text" }
        ]
      }
    ],
    notes: [
      "Bagi partisipan yang berhalangan, diharapkan untuk mencari pengganti secara mandiri.",
    ]
  },
  // TEMPLATE Pemuda Advent (belum aktif): lepaskan komentar bila program PA diaktifkan.
  // Tab PA saat ini menampilkan kartu "Segera hadir" (lihat renderSubTab).
  /*
  "pa": {
    title: "Pemuda Advent (PA)",
    subtitle: "Sabtu Sore, 15 Agustus 2026",
    dateNum: "15",
    dateMonth: "AGT",
    generalInfo: [
      { key: "Pemimpin Acara", value: "Sdra. Hansell" },
      { key: "Pemusik / Gitaris", value: "Sdra. Fabian" }
    ],
    sections: [
      {
        title: "Susunan Acara Pemuda Advent",
        items: [
          { time: "1", name: "MC & Janji PA", officer: "Sdra Hansell", type: "text" },
          { time: "2", name: "Lagu Pembuka (AYS)", officer: "", type: "song", songBook: "AYS No.", songNo: "", songTitle: "" },
          { time: "3", name: "Ayat Inti & Doa Buka PA", officer: "Sdra Fabian", type: "text" },
          { time: "4", name: "Belajar Alkitab Bersama (BAB)", officer: "AKOM", type: "text" },
          { time: "5", name: "Funfact / Tips", officer: "Sdra Jimmy", type: "text" },
          { time: "6", name: "Games", officer: "Bu Pdt Natalia", type: "text" },
          { time: "7", name: "Acara Inti & Diskusi", officer: "Sdra. Misaell", type: "text", highlight: true },
          { time: "8", name: "Lagu Penutup (AYS)", officer: "", type: "song", songBook: "AYS No.", songNo: "", songTitle: "" },
          { time: "9", name: "Doa Tutup", officer: "Sdra. Misaell", type: "text" },
          { time: "10", name: "Pengumuman", officer: "Pengurus PA", type: "text" },
          { time: "11", name: "Laporan Bendahara PA", officer: "Bendahara PA", type: "text" }
        ]
      }
    ]
  },
  */
  "rabu-malam": {
    title: "Susunan Ibadah Permintaan Doa Rabu Malam",
    subtitle: "Rabu, 23 September 2026 | 19.00 WIB",
    dateNum: "23",
    dateMonth: "SEP",
    generalInfo: [
      { key: "Pianis", value: "-" }
    ],
    sections: [
      {
        title: "Susunan Acara Ibadah Permintaan Doa",
        items: [
          { time: "1", name: "Protokol & Doa Buka", officer: "-", type: "text" },
          { time: "2", name: "Lagu Buka", officer: "", type: "song", songBook: "LSEL No.", songNo: "", songTitle: "" },
          { time: "3", name: "Kesaksian-Kesaksian", officer: "-", type: "text" },
          { time: "4", name: "Yang Didoakan", officer: "-", type: "text" },
          { time: "5", name: "Renungan", officer: "-", type: "text", highlight: true },
          { time: "6", name: "Doa Syafaat", officer: "-", type: "text" },
          { time: "7", name: "Lagu Tutup", officer: "", type: "song", songBook: "LSEL No.", songNo: "", songTitle: "" },
          { time: "8", name: "Doa Tutup", officer: "-", type: "text" },
          { time: "9", name: "Pengumuman", officer: "-", type: "text" }
        ]
      }
    ],
    notes: [
      "Seluruh yang melayani wajib berpakaian rapi. Pria menggunakan kemeja, dasi, atau batik; wanita menggunakan rok di bawah lutut.",
      "Bagi yang berhalangan diharapkan mencari pengganti dan menginformasikannya supaya ibadah tetap berjalan dengan lancar."
    ]
  }
};

/** Susunan yang sedang ditampilkan per program; salinan dalam (deep copy) dari defaultWorshipData lalu dimodifikasi. */
let worshipData = JSON.parse(JSON.stringify(defaultWorshipData));
/** Status ketersediaan susunan per program: "loading" (menunggu), true (siap), false (belum ada). */
let worshipAvailability = { "sabat-raya": "loading", "rabu-malam": "loading" };
/** Baris Tabel Override Susunan yang sudah dimuat dari Supabase. */
let worshipOverrideRows = [];
/** Program yang sedang menunggu konfirmasi reset override (modal-worship-reset-confirm). */
let pendingWorshipResetKey = null;
/** Apakah mode edit inline sedang aktif untuk tiap program (hanya berlaku bila admin login). */
let subtabEditState = {
  "sabat-raya": false,
  "rabu-malam": false
};

/** Merender kedua program aktif (Sabat Raya dan Rabu Malam) saat halaman dimuat. */
function initWorshipSubTabs() {
  renderSubTab("sabat-raya");
  renderSubTab("rabu-malam");
}

/**
 * Tanggal terdekat (hari ini atau setelahnya) untuk hari tertentu dalam seminggu.
 * @param {number} targetDay 0 = Minggu ... 3 = Rabu ... 6 = Sabtu.
 * @returns {Date} Tanggal pada pukul 00.00 waktu lokal.
 */
function getUpcomingWorshipDate(targetDay) {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysUntilTarget = (targetDay - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + daysUntilTarget);
  return date;
}

/** Memformat tanggal ke bahasa Indonesia, mis. "Sabtu, 19 September 2026". Format ini juga menjadi kunci date_display pada override. */
function formatWorshipDate(date) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

/** Menghitung Sabat ke-berapa dalam triwulan untuk tanggal Sabtu tertentu (dipakai di judul "Sabat Ke-N"). */
function getSabbathNumberInQuarter(date) {
  const quarterStartMonth = Math.floor(date.getMonth() / 3) * 3;
  const quarterStart = new Date(date.getFullYear(), quarterStartMonth, 1);
  const daysUntilFirstSaturday = (6 - quarterStart.getDay() + 7) % 7;
  const firstSaturday = new Date(
    date.getFullYear(),
    quarterStartMonth,
    1 + daysUntilFirstSaturday
  );
  const daysSinceFirstSaturday = Math.round((date - firstSaturday) / (24 * 60 * 60 * 1000));
  return Math.floor(daysSinceFirstSaturday / 7) + 1;
}

/** Judul susunan; untuk Sabat Raya otomatis memuat nomor Sabat triwulan berjalan. */
function getDynamicWorshipTitle(key, fallbackTitle) {
  if (key !== "sabat-raya") return fallbackTitle;

  const upcomingSaturday = getUpcomingWorshipDate(6);
  const sabbathNumber = getSabbathNumberInQuarter(upcomingSaturday);
  return `Susunan Ibadah Kebaktian Sabat Ke-${sabbathNumber}`;
}

/** Subjudul tanggal: Rabu = "<tanggal> | 19.00 WIB"; lainnya = tanggal Sabtu terdekat. Juga menjadi kunci pencocokan override. */
function getDynamicWorshipSubtitle(key) {
  if (key === "rabu-malam") {
    return `${formatWorshipDate(getUpcomingWorshipDate(3))} | 19.00 WIB`;
  }

  return formatWorshipDate(getUpcomingWorshipDate(6));
}

/** Memetakan kunci program UI ke nilai kolom program_type di Supabase (sabat / rabu / pa). */
function getOverrideProgramType(key) {
  return key === "sabat-raya" ? "sabat" : key === "rabu-malam" ? "rabu" : "pa";
}

/**
 * Membaca kolom timeline_json (array atau string JSON).
 * @returns {Array|null} Array timeline, atau null bila tidak valid.
 */
function parseOverrideTimeline(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Mengubah baris Tabel Override Susunan (timeline_json datar) menjadi struktur susunan { title, generalInfo, sections, notes }.
 * Header "I. Informasi Umum" menjadi generalInfo; header lain membuka bagian baru; entri biasa menjadi item susunan.
 * @returns {object|null} null bila timeline tidak valid.
 */
function convertOverrideRow(row) {
  const timeline = parseOverrideTimeline(row.timeline_json);
  if (!timeline) return null;

  const sections = [];
  const generalInfo = [];
  let inGeneralInfo = false;
  timeline.forEach(entry => {
    if (entry?.isHeader) {
      inGeneralInfo = /^i\.\s*informasi umum$/i.test(entry.title || "");
      if (!inGeneralInfo) sections.push({ title: entry.title || "", items: [] });
    } else if (entry?.title) {
      if (inGeneralInfo) {
        generalInfo.push({ key: entry.title, value: entry.desc || "" });
        return;
      }
      if (sections.length === 0) sections.push({ title: "Susunan Ibadah", items: [] });
      const item = {
        time: entry.time || "",
        name: entry.title,
        officer: entry.desc || "",
        note: entry.note || "",
        highlight: entry.highlight === true,
        type: entry.type === "song" ? "song" : Array.isArray(entry.subItems) ? "group" : "text"
      };
      if (item.type === "song") {
        item.songBook = entry.songBook || "LSEL No.";
        item.songNo = entry.songNo || "";
        item.songTitle = entry.songTitle || "";
      }
      if (entry.sermonTitle !== undefined) item.sermonTitle = entry.sermonTitle || "";
      if (Array.isArray(entry.subItems)) {
        item.subItems = entry.subItems.map(subItem => ({
          label: subItem.label || "",
          officer: subItem.officer || ""
        }));
      }
      sections[sections.length - 1].items.push(item);
    }
  });

  return {
    title: row.program_type === "rabu" ? defaultWorshipData["rabu-malam"].title : "Susunan Ibadah",
    sections,
    generalInfo,
    notes: []
  };
}

/**
 * Menyimpan susunan yang sedang diedit sebagai override untuk tanggal program ini (insert; bila bentrok, update baris terbaru).
 * Baris override lama untuk program+tanggal yang sama dibersihkan setelahnya.
 * @returns {Promise<boolean>} true bila tersimpan.
 */
async function persistWorshipOverride(key) {
  const programType = getOverrideProgramType(key);
  const dateDisplay = getDynamicWorshipSubtitle(key);
  const timelineJson = [
    { title: "I. Informasi Umum", isHeader: true },
    ...(worshipData[key].generalInfo || []).map(info => ({
      title: info.key,
      desc: info.value || "",
      time: "",
      highlight: true
    })),
    ...worshipData[key].sections.flatMap(section => [
      { title: section.title, isHeader: true },
      ...section.items.map(item => ({
        title: item.name,
        desc: item.officer || "",
        time: item.time || "",
        highlight: item.highlight === true,
        ...(item.type === "song" ? {
          type: "song",
          songBook: item.songBook || "LSEL No.",
          songNo: item.songNo || "",
          songTitle: item.songTitle || ""
        } : {}),
        ...(item.sermonTitle !== undefined ? { sermonTitle: item.sermonTitle || "" } : {}),
        ...(Array.isArray(item.subItems) ? {
          subItems: item.subItems.map(subItem => ({
            label: subItem.label || "",
            officer: subItem.officer || ""
          }))
        } : {}),
        ...(item.note ? { note: item.note } : {})
      }))
    ])
  ];
  const payload = { program_type: programType, date_display: dateDisplay, timeline_json: timelineJson };

  initSupabaseClient();
  if (!supabaseClient) {
    showToast("Supabase belum terhubung. Perubahan belum tersimpan.", "fa-solid fa-triangle-exclamation");
    return false;
  }

  const table = supabaseClient.from("Tabel Override Susunan");
  const { data: existingRows, error: lookupError } = await table
    .select("id, updated_at")
    .eq("program_type", programType)
    .eq("date_display", dateDisplay)
    .order("updated_at", { ascending: false });
  if (lookupError) {
    showToast(`Override gagal diperiksa: ${lookupError.message}`, "fa-solid fa-triangle-exclamation");
    return false;
  }

  const oldRows = existingRows || [];
  let savedRow = null;
  const inserted = await table.insert(payload).select().single();
  if (!inserted.error) {
    savedRow = inserted.data;
  } else if (oldRows.length) {
    const updated = await table.update(payload).eq("id", oldRows[0].id).select().single();
    if (updated.error) {
      showToast(`Susunan gagal disimpan: ${updated.error.message}`, "fa-solid fa-triangle-exclamation");
      return false;
    }
    savedRow = updated.data;
  } else {
    showToast(`Susunan gagal disimpan: ${inserted.error.message}`, "fa-solid fa-triangle-exclamation");
    return false;
  }

  const oldIds = oldRows.filter(row => String(row.id) !== String(savedRow.id)).map(row => row.id);
  if (oldIds.length) {
    const { error: deleteError } = await table.delete().in("id", oldIds);
    if (deleteError) {
      showToast(`Versi terbaru tersimpan, tetapi override lama gagal dibersihkan: ${deleteError.message}`, "fa-solid fa-triangle-exclamation");
    }
  }

  worshipOverrideRows = [savedRow, ...worshipOverrideRows.filter(row =>
    row.program_type !== programType || row.date_display !== dateDisplay
  )];
  worshipAvailability[key] = true;
  showToast("Override terbaru tersimpan di Supabase.", "fa-solid fa-circle-check text-gold");
  return true;
}

/**
 * Merender satu program ibadah: header (judul, tanggal, tombol edit admin), Informasi Umum, bagian-bagian susunan, dan catatan.
 * Menangani status loading / belum tersedia / Pemuda Advent (segera hadir) serta mode edit inline untuk admin.
 * @param {string} key "sabat-raya", "rabu-malam", atau "pa".
 */
function renderSubTab(key) {
  const container = document.getElementById(`subtab-container-${key}`);
  if (!container) return;

  if (key === "pa") {
    container.innerHTML = `
      <div class="coming-soon-card">
        <i class="fa-solid fa-clock" aria-hidden="true"></i>
        <h3>Pemuda Advent</h3>
        <p>Segera hadir</p>
      </div>
    `;
    return;
  }

  if (worshipAvailability[key] === "loading") {
    container.innerHTML = '<div class="coming-soon-card"><i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><p>Memuat susunan dari Supabase...</p></div>';
    return;
  }

  if (worshipAvailability[key] === false) {
    container.innerHTML = `
      <div class="coming-soon-card">
        <i class="fa-regular fa-calendar-xmark" aria-hidden="true"></i>
        <h3>Susunan belum tersedia</h3>
        <p>Belum ada susunan untuk ${escapeHtml(getDynamicWorshipSubtitle(key))}.</p>
      </div>
    `;
    return;
  }

  const data = worshipData[key];
  if (!data) return;

  const isEditing = isAdminLoggedIn && subtabEditState[key];

  let html = `
    <div class="subtab-header-card">
      <div class="subtab-header-left">
        <div class="subtab-header-titles">
          <h3>${escapeHtml(getDynamicWorshipTitle(key, data.title))}</h3>
          <div class="subtab-date-pill">
            <i class="fa-solid fa-calendar-day text-gold"></i>
            <span>${escapeHtml(getDynamicWorshipSubtitle(key))}</span>
          </div>
        </div>
      </div>
      <div class="subtab-actions-group">
        ${isAdminLoggedIn ? (
      isEditing ? `
            <button class="btn-subtab-pill btn-pill-reset" onclick="resetSubTabData('${key}')">
              <i class="fa-solid fa-rotate-left"></i> Reset
            </button>
            <button class="btn-subtab-pill btn-pill-edit editing" onclick="toggleEditSubTab('${key}')">
              <i class="fa-solid fa-check"></i> Selesai Edit
            </button>
          ` : `
            <button class="btn-subtab-pill btn-pill-edit" onclick="toggleEditSubTab('${key}')">
              <i class="fa-solid fa-pen-to-square"></i> Edit Susunan
            </button>
          `
    ) : ''}
      </div>
    </div>
  `;

  if (data.generalInfo && data.generalInfo.length > 0) {
    const icons = ["fa-solid fa-music", "fa-solid fa-sliders", "fa-solid fa-volume-high", "fa-solid fa-user-gear"];
    html += `
      <div class="program-card mb-4">
        <div class="program-card-header">
          <h4><i class="fa-solid fa-sliders text-gold"></i> I. Informasi Umum</h4>
        </div>
        <div class="gen-metric-grid">
          ${data.generalInfo.map((info, idx) => `
            <div class="gen-metric-card">
              <div class="gen-metric-icon"><i class="${icons[idx % icons.length]}"></i></div>
              <div class="gen-metric-details">
                <span class="gen-metric-title">${escapeHtml(info.key)}</span>
                ${isEditing ? `
                  <input type="text" class="edit-pill-input" value="${escapeHtml(info.value)}" 
                    oninput="updateGenInfo('${key}', ${idx}, this.value)">
                ` : `
                  <span class="gen-metric-value">${escapeHtml(info.value || '-')}</span>
                `}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  data.sections.forEach((sec, secIdx) => {
    html += `
      <div class="program-card ${secIdx > 0 || (data.generalInfo && data.generalInfo.length > 0) ? 'mt-4' : ''}">
        <div class="program-card-header">
          <h4>${escapeHtml(sec.title)}</h4>
        </div>
        <div class="liturgy-list">
          ${sec.items.map((item, itemIdx) => `
            <div class="liturgy-item ${item.highlight ? 'highlight' : ''} ${item.type === 'group' || item.subItems ? 'liturgy-group-item' : ''}">
              <span class="lit-time">${escapeHtml(item.time)}</span>
              <div class="lit-info">
                <div class="lit-main">
                  <h5>${escapeHtml(item.name)}</h5>
                </div>
                <div class="lit-right">
                  ${isEditing ? (
        item.type === 'song' ? `
                      <div class="edit-song-group">
                        <span class="song-icon"><i class="fa-solid fa-music text-gold"></i></span>
                        <div class="song-no-picker">
                          <input type="text" class="song-no-pill" placeholder="No." value="${escapeHtml(item.songNo || '')}"
                            oninput="updateSongNo('${key}', ${secIdx}, ${itemIdx}, this.value); showSongSuggestions(this, '${key}', ${secIdx}, ${itemIdx})"
                            onfocus="showSongSuggestions(this, '${key}', ${secIdx}, ${itemIdx})"
                            onblur="setTimeout(() => hideSongSuggestions(this), 150)">
                        </div>
                        <input type="text" class="song-title-pill" placeholder="Judul Lagu..." value="${escapeHtml(item.songTitle || '')}"
                          oninput="updateSongTitle('${key}', ${secIdx}, ${itemIdx}, this.value); showSongSuggestions(this, '${key}', ${secIdx}, ${itemIdx})"
                          onfocus="showSongSuggestions(this, '${key}', ${secIdx}, ${itemIdx})"
                          onblur="setTimeout(() => hideSongSuggestions(this), 150)">
                        <div class="song-suggestions" id="song-suggestions-${key}-${secIdx}-${itemIdx}"></div>
                      </div>
                    ` : (item.type === 'group' || item.subItems) ? `
                      <div class="edit-subitems-group">
                        ${item.subItems.map((sub, subIdx) => `
                          <div class="edit-subitem-row">
                            <span class="subitem-edit-label">${escapeHtml(sub.label)}:</span>
                            <input type="text" class="edit-pill-input edit-subitem-input" value="${escapeHtml(sub.officer || '')}"
                              oninput="updateSubGroupOfficer('${key}', ${secIdx}, ${itemIdx}, ${subIdx}, this.value)">
                          </div>
                        `).join('')}
                      </div>
                    ` : `
                      ${item.sermonTitle !== undefined ? `
                        <div class="sermon-edit-group">
                          <input type="text" class="edit-pill-input" value="${escapeHtml(item.officer || '')}"
                            oninput="updateOfficer('${key}', ${secIdx}, ${itemIdx}, this.value)">
                          <input type="text" class="edit-pill-input sermon-title-input" placeholder="Judul khotbah..." value="${escapeHtml(item.sermonTitle || '')}"
                            oninput="updateSermonTitle('${key}', ${secIdx}, ${itemIdx}, this.value)">
                        </div>
                      ` : `
                        <input type="text" class="edit-pill-input" value="${escapeHtml(item.officer || '')}"
                          oninput="updateOfficer('${key}', ${secIdx}, ${itemIdx}, this.value)">
                      `}
                    `
      ) : (
        item.type === 'song' ? `
                      <span class="lit-officer">${formatSongDisplay(item)}</span>
                    ` : (item.type === 'group' || item.subItems) ? `
                      <div class="lit-subitems-list-right">
                        ${item.subItems.map(sub => `
                          <div class="lit-subitem-row-right">
                            <span class="subitem-badge-right">${escapeHtml(sub.label)}:</span>
                            <span class="subitem-val-right">${escapeHtml(sub.officer || '-')}</span>
                          </div>
                        `).join('')}
                      </div>
                    ` : `
                      ${item.sermonTitle !== undefined ? `
                        <div class="sermon-meta">
                          <span class="lit-officer">${escapeHtml(item.officer || '-')}</span>
                          <span class="sermon-title-label">Judul: ${escapeHtml(item.sermonTitle || '-')}</span>
                        </div>
                      ` : `
                        <span class="lit-officer">${escapeHtml(item.officer || '-')}</span>
                      `}
                    `
      )}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  });

  if (data.notes && data.notes.length > 0) {
    html += `
      <div class="worship-notes">
        <h4><i class="fa-solid fa-note-sticky text-gold"></i> Catatan</h4>
        <ol>
          ${data.notes.map(note => `<li>${escapeHtml(note)}</li>`).join('')}
        </ol>
      </div>
    `;
  }

  container.innerHTML = html;
}

/**
 * Teks lagu untuk mode baca, mis. `LSEL No. 12: - "Judul"`. Judul diambil dari katalog bila hanya nomor yang diisi.
 * @returns {string} HTML yang sudah di-escape ("-" bila kosong).
 */
function formatSongDisplay(item) {
  if (!item.songNo && !item.songTitle) return '-';
  const book = item.songBook || 'LSEL No.';
  const catalog = getSongCatalogForBook(book);
  const songNumber = String(item.songNo || '');
  const catalogNumber = songNumber.match(/\d+/)?.[0];
  const catalogSong = !item.songTitle && catalogNumber
    ? catalog.find(song => String(song.num) === catalogNumber)
    : null;
  const songTitle = item.songTitle || (catalogSong && catalogSong.title);
  let res = `${escapeHtml(book)} ${escapeHtml(songNumber)}`;
  if (songTitle) {
    res += `: - "${escapeHtml(songTitle)}"`;
  }
  return res;
}

/** Memilih katalog lagu (AYS atau LSEL) berdasarkan teks buku lagu. */
function getSongCatalogForBook(songBook) {
  return /AYS/i.test(songBook || '') ? aysSongs : lselSongs;
}

/** Menampilkan saran lagu (maks. 8) di editor saat admin mengetik nomor (min. 1 digit) atau judul (min. 3 huruf). */
function showSongSuggestions(input, key, secIdx, itemIdx) {
  const songGroup = input.closest('.edit-song-group');
  const suggestions = songGroup && songGroup.querySelector('.song-suggestions');
  if (!suggestions) return;

  const item = getWorshipItem(key, secIdx, itemIdx);
  const catalog = getSongCatalogForBook(item?.songBook);
  const query = input.value.trim().toLowerCase();
  const isNumberSearch = /^\d+$/.test(query);
  const minimumCharacters = isNumberSearch ? 1 : 3;

  if (!query || query.length < minimumCharacters) {
    suggestions.innerHTML = '';
    suggestions.classList.remove('show');
    return;
  }

  const filtered = catalog
    .filter(song => isNumberSearch
      ? String(song.num).includes(query)
      : String(song.title).toLowerCase().includes(query))
    .slice(0, 8);

  suggestions.innerHTML = filtered.map(song => `
    <button type="button" class="song-suggestion-item"
      data-key="${key}" data-sec="${secIdx}" data-item="${itemIdx}"
      data-song-no="${escapeHtml(String(song.num))}"
      data-song-title="${escapeHtml(String(song.title))}"
      onmousedown="selectSongSuggestion(this); return false;">
      <span class="song-suggestion-number">${escapeHtml(String(item?.songBook || 'LSEL No.'))} ${escapeHtml(String(song.num))}</span>
      <span class="song-suggestion-title">${escapeHtml(String(song.title))}</span>
    </button>
  `).join('');

  suggestions.classList.toggle('show', filtered.length > 0);
}

/** Menyembunyikan kotak saran lagu. */
function hideSongSuggestions(input) {
  const songGroup = input.closest('.edit-song-group');
  const suggestions = songGroup && songGroup.querySelector('.song-suggestions');
  if (suggestions) suggestions.classList.remove('show');
}

/** Menerapkan saran lagu yang dipilih (nomor + judul) ke item susunan lalu merender ulang. */
function selectSongSuggestion(button) {
  const { key, sec, item, songNo, songTitle } = button.dataset;
  const target = getWorshipItem(key, sec, item);
  if (!target) return;

  target.songNo = songNo;
  target.songTitle = songTitle;
  renderSubTab(key);
}

/** Mengaktifkan mode edit; saat ditekan lagi menyimpan perubahan sebagai override dan keluar dari mode edit bila berhasil. */
async function toggleEditSubTab(key) {
  if (!subtabEditState[key]) {
    subtabEditState[key] = true;
    renderSubTab(key);
    showToast("Mode Edit Aktif! Ubah nama/lagu langsung di baris susunan.", "fa-solid fa-pen-to-square text-gold");
  } else {
    const saved = await persistWorshipOverride(key);
    if (saved) subtabEditState[key] = false;
    renderSubTab(key);
  }
}

/** Membuka konfirmasi reset: menghapus override tanggal ini sehingga susunan kembali ke data tabel/dasar. */
function resetSubTabData(key) {
  const programType = getOverrideProgramType(key);
  const dateDisplay = getDynamicWorshipSubtitle(key);
  const row = worshipOverrideRows.find(item => item.program_type === programType && item.date_display === dateDisplay);
  if (!row) return;
  pendingWorshipResetKey = key;
  const description = document.getElementById("worship-reset-description");
  const detail = document.getElementById("worship-reset-detail");
  if (description) {
    description.textContent = key === "rabu-malam"
      ? `Susunan Rabu malam untuk ${dateDisplay} akan kembali ke susunan dasar dengan tanda strip.`
      : `Susunan Sabat Raya untuk ${dateDisplay} akan kembali mengikuti tabel sumber.`;
  }
  if (detail) {
    detail.textContent = key === "rabu-malam"
      ? "Override khusus pada tanggal ini akan dihapus; tanggal berikutnya kembali menampilkan tanda strip."
      : "Override khusus pada tanggal ini akan dihapus; data Sekolah Sabat dan Khotbah dari tabel akan ditampilkan.";
  }
  openModal("modal-worship-reset-confirm");
}

/** Membatalkan reset override. */
function cancelResetSubTab() {
  pendingWorshipResetKey = null;
  closeModal("modal-worship-reset-confirm");
}

/** Menghapus override program+tanggal dari Supabase lalu memuat ulang susunan. */
async function confirmResetSubTab() {
  const key = pendingWorshipResetKey;
  if (!key) return;
  const programType = getOverrideProgramType(key);
  const dateDisplay = getDynamicWorshipSubtitle(key);
  initSupabaseClient();
  if (!supabaseClient) {
    showToast("Supabase belum terhubung. Override belum dihapus.", "fa-solid fa-triangle-exclamation");
    return;
  }
  const { error } = await supabaseClient.from("Tabel Override Susunan")
    .delete()
    .eq("program_type", programType)
    .eq("date_display", dateDisplay);
  if (error) {
    showToast(`Override gagal dihapus: ${error.message}`, "fa-solid fa-triangle-exclamation");
    return;
  }
  subtabEditState[key] = false;
  pendingWorshipResetKey = null;
  closeModal("modal-worship-reset-confirm");
  worshipOverrideRows = worshipOverrideRows.filter(item =>
    item.program_type !== programType || item.date_display !== dateDisplay
  );
  await fetchSabbathProgramData();
  showToast(
    key === "rabu-malam"
      ? "Override dihapus. Susunan Rabu malam kembali menampilkan tanda strip."
      : "Override dihapus. Susunan kembali mengikuti tabel sumber.",
    "fa-solid fa-rotate-left text-gold"
  );
}

/** Mengambil item susunan (baris liturgi) berdasarkan program, indeks bagian, dan indeks item. */
function getWorshipItem(key, secIdx, itemIdx) {
  return worshipData[key]?.sections?.[secIdx]?.items?.[itemIdx];
}

/** Handler input: menyimpan nilai Informasi Umum yang diedit. */
function updateGenInfo(key, idx, val) {
  const info = worshipData[key]?.generalInfo?.[idx];
  if (info) info.value = val;
}

/** Handler input: menyimpan nama petugas pada item susunan. */
function updateOfficer(key, secIdx, itemIdx, val) {
  const item = getWorshipItem(key, secIdx, itemIdx);
  if (item) item.officer = val;
}

/** Handler input: menyimpan judul khotbah. */
function updateSermonTitle(key, secIdx, itemIdx, val) {
  const item = getWorshipItem(key, secIdx, itemIdx);
  if (item) item.sermonTitle = val;
}

/** Handler input: menyimpan petugas sub-item (mis. Diskusi Orang Muda / Orang Tua). */
function updateSubGroupOfficer(key, secIdx, itemIdx, subIdx, val) {
  const subItem = getWorshipItem(key, secIdx, itemIdx)?.subItems?.[subIdx];
  if (subItem) subItem.officer = val;
}

/** Handler input: menyimpan nomor lagu. */
function updateSongNo(key, secIdx, itemIdx, val) {
  const item = getWorshipItem(key, secIdx, itemIdx);
  if (item) item.songNo = val;
}

/** Handler input: menyimpan judul lagu. */
function updateSongTitle(key, secIdx, itemIdx, val) {
  const item = getWorshipItem(key, secIdx, itemIdx);
  if (item) item.songTitle = val;
}

// ==========================================
// 13. KLIEN SUPABASE
// ==========================================

/**
 * Membuat klien Supabase (sekali saja; panggilan berikutnya mengembalikan klien yang sama).
 * Sesi disimpan persisten di localStorage oleh Supabase Auth.
 * @returns {object|null} Klien, atau null bila SDK belum dimuat.
 */
function initSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  if (window.supabase && SUPABASE_URL) {
    try {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      return supabaseClient;
    } catch (err) {
      console.warn("Supabase Client Init Error:", err);
    }
  }
  return null;
}

// Upaya awal membuat klien saat berkas dimuat
initSupabaseClient();

// ==========================================
// 14. GALERI KEGIATAN JEMAAT
// Event berisi judul, subtitle, dan tautan Google Slides; ditampilkan di Beranda dan dikelola admin (maks. MAX_GALLERY_EVENTS).
// ==========================================

/** Memuat event galeri (maks. MAX_GALLERY_EVENTS, urut slot) dari tabel "Kegiatan Jemaat" lalu merender grid publik, panel admin, dan penampil bila URL berpola #galeri-<id>. */
async function fetchGalleryEvents() {
  initSupabaseClient();
  if (!supabaseClient) {
    galleryEventsLoadError = "Supabase belum terhubung.";
    renderGalleryEvents();
    renderGalleryAdminPanel();
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("Kegiatan Jemaat")
      .select("id, slot, title, subtitle, slides_url")
      .order("slot", { ascending: true });

    if (error) throw error;
    galleryEvents = (data || []).slice(0, MAX_GALLERY_EVENTS);
    galleryEventsLoadError = "";
  } catch (error) {
    galleryEvents = [];
    galleryEventsLoadError = error.message || "Gagal memuat dokumentasi.";
    console.warn("Supabase fetch gallery events error:", galleryEventsLoadError);
  }

  renderGalleryEvents();
  renderGalleryAdminPanel();
  const currentHash = window.location.hash.replace("#", "").toLowerCase();
  if (currentHash.startsWith("galeri-")) renderGalleryViewerFromHash(currentHash);
}

/** Merender grid kartu event galeri di Beranda (thumbnail Google Slides dengan cadangan bila gagal dimuat). */
function renderGalleryEvents() {
  const grid = document.getElementById("gallery-event-grid");
  if (!grid) return;

  grid.dataset.count = String(galleryEvents.length);
  if (galleryEvents.length === 0) {
    grid.innerHTML = `<div class="gallery-events-empty"><i class="fa-regular fa-images"></i><span>Belum ada dokumentasi kegiatan.</span></div>`;
    return;
  }

  grid.innerHTML = galleryEvents.map(event => `
    <button class="gallery-event-card" type="button" onclick="openGalleryEvent('${escapeHtml(String(event.id))}')">
      <span class="gallery-event-media">
        <img class="gallery-event-thumbnail" src="${escapeHtml(getGoogleSlidesThumbnailUrl(event.slides_url))}"
          alt="" loading="lazy" decoding="async"
          data-fallback-src="${escapeHtml(getGoogleSlidesThumbnailFallbackUrl(event.slides_url))}"
          onerror="if (this.dataset.fallbackSrc) { this.src = this.dataset.fallbackSrc; this.dataset.fallbackSrc = ''; } else { this.closest('.gallery-event-media').classList.add('is-unavailable'); this.remove(); }">
        <i class="gallery-thumbnail-placeholder fa-solid fa-photo-film" aria-hidden="true"></i>
      </span>
      <span class="gallery-event-copy">
        <span class="gallery-event-title">${escapeHtml(event.title)}</span>
        <span class="gallery-event-subtitle">${escapeHtml(event.subtitle)}</span>
        <span class="gallery-event-action">Lihat dokumentasi <i class="fa-solid fa-arrow-right"></i></span>
      </span>
    </button>
  `).join("");
}

/** Merender panel admin galeri: status slot, tombol Tambah / Atur Slot / Batal / Simpan, dan daftar event (dapat diseret saat mode Atur Slot). */
function renderGalleryAdminPanel() {
  const list = document.getElementById("gallery-admin-list");
  const status = document.getElementById("gallery-admin-status");
  const addButton = document.getElementById("btn-add-gallery-event");
  const orderButton = document.getElementById("btn-gallery-order");
  const cancelOrderButton = document.getElementById("btn-cancel-gallery-order");
  const saveOrderButton = document.getElementById("btn-save-gallery-order");
  if (!list) return;

  const isAtCapacity = galleryEvents.length >= MAX_GALLERY_EVENTS;
  if (addButton) {
    addButton.disabled = isAtCapacity || Boolean(galleryEventsLoadError);
    addButton.hidden = galleryOrderMode;
    addButton.style.display = galleryOrderMode ? "none" : ""; // Sembunyikan Tambah Event saat Atur Slot aktif
    addButton.title = isAtCapacity ? "Maksimal tiga event sudah tercapai." : "";
  }
  
  if (orderButton) {
    orderButton.disabled = galleryEvents.length === 0 || Boolean(galleryEventsLoadError);
    orderButton.setAttribute("aria-pressed", String(galleryOrderMode));
    
    // Ubah warna Atur Slot berdasarkan mode
    if (galleryOrderMode) {
      orderButton.style.background = "var(--primary-navy)";
      orderButton.style.color = "#ffffff";
      orderButton.style.borderColor = "var(--primary-navy)";
    } else {
      orderButton.style.background = ""; // Reset ke css default
      orderButton.style.color = "";
      orderButton.style.borderColor = "";
    }
  }
  
  if (cancelOrderButton) {
    cancelOrderButton.hidden = !galleryOrderMode;
    cancelOrderButton.style.display = galleryOrderMode ? "" : "none";
    // Sesuaikan warna Batal (Terang/Transparan)
    cancelOrderButton.style.background = "var(--bg-main)";
    cancelOrderButton.style.color = "var(--text-main)";
    cancelOrderButton.style.borderColor = "var(--border-color)";
  }
  
  if (saveOrderButton) {
    saveOrderButton.hidden = !galleryOrderMode;
    saveOrderButton.style.display = galleryOrderMode ? "" : "none";
    saveOrderButton.disabled = Boolean(galleryEventsLoadError);
    // Sesuaikan warna Simpan (Gelap/Aksen)
    saveOrderButton.style.background = "var(--accent-gold)";
    saveOrderButton.style.color = "#ffffff";
    saveOrderButton.style.borderColor = "var(--accent-gold)";
  }

  if (status) {
    status.textContent = galleryEventsLoadError
      ? "Tabel galeri belum tersedia. Siapkan tabel Supabase menggunakan SQL yang disediakan."
      : galleryOrderMode
        ? "Mode Atur Slot Aktif. Klik, tahan, dan geser (drag & drop) untuk mengatur urutan."
        : `${galleryEvents.length} dari ${MAX_GALLERY_EVENTS} event digunakan.`;
  }

  if (galleryEvents.length === 0) {
    galleryOrderMode = false;
    list.innerHTML = `<div class="gallery-admin-empty">Belum ada event dokumentasi.</div>`;
    return;
  }

  const items = galleryOrderMode ? galleryOrderDraft : galleryEvents;
  list.innerHTML = items.map((event, index) => `
    <article class="gallery-admin-item${galleryOrderMode ? " is-ordering" : ""}" data-event-id="${escapeHtml(String(event.id))}" ${galleryOrderMode ? 'draggable="true"' : ''}>
      <div class="gallery-admin-item-info">
        <span class="gallery-event-slot">SLOT ${String(index + 1).padStart(2, "0")}</span>
        <h3>${escapeHtml(event.title)}</h3>
        <p>${escapeHtml(event.subtitle)}</p>
        <a href="${escapeHtml(event.slides_url)}" target="_blank" rel="noopener noreferrer">Buka sumber Slides <i class="fa-solid fa-arrow-up-right-from-square"></i></a>
      </div>
      <div class="gallery-admin-item-actions${galleryOrderMode ? " gallery-order-controls" : ""}">
        ${galleryOrderMode ? `
          <div class="gallery-drag-handle" data-event-id="${escapeHtml(String(event.id))}" aria-label="Seret ${escapeHtml(event.title)} untuk mengubah urutan" title="Seret untuk mengubah urutan" style="cursor: grab; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 8px; font-size: 1.2rem; color: var(--text-muted);">
            <i class="fa-solid fa-grip-lines" aria-hidden="true"></i>
          </div>
        ` : `
          <button class="btn-table-edit" type="button" onclick="openGalleryEventForm('${escapeHtml(String(event.id))}')">Edit</button>
          <button class="btn-table-delete" type="button" onclick="deleteGalleryEvent('${escapeHtml(String(event.id))}')">Hapus</button>
        `}
      </div>
    </article>
  `).join("");
  initGalleryOrderDragDrop(list);
}

/** Memasang drag & drop (sekali per daftar) untuk mengubah urutan event pada mode Atur Slot. */
function initGalleryOrderDragDrop(list) {
  if (list.dataset.dragDropReady) return;
  list.dataset.dragDropReady = "true";

  let draggedEventId = null;
  list.addEventListener("dragstart", event => {
    const item = event.target.closest(".gallery-admin-item.is-ordering");
    if (!galleryOrderMode || !item) {
      event.preventDefault();
      return;
    }

    draggedEventId = item.dataset.eventId;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draggedEventId);
    item.classList.add("is-dragging");
  });

  list.addEventListener("dragover", event => {
    const target = event.target.closest(".gallery-admin-item.is-ordering");
    if (!galleryOrderMode || !draggedEventId || !target) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    list.querySelectorAll(".is-drop-target").forEach(item => item.classList.remove("is-drop-target"));
    target.classList.add("is-drop-target");
  });

  list.addEventListener("drop", event => {
    const target = event.target.closest(".gallery-admin-item.is-ordering");
    const sourceId = event.dataTransfer.getData("text/plain") || draggedEventId;
    if (!galleryOrderMode || !sourceId || !target) return;
    event.preventDefault();

    const targetId = target.dataset.eventId;
    const sourceIndex = galleryOrderDraft.findIndex(item => String(item.id) === String(sourceId));
    const targetIndex = galleryOrderDraft.findIndex(item => String(item.id) === String(targetId));
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;

    const rect = target.getBoundingClientRect();
    const insertAfter = event.clientY > rect.top + rect.height / 2;
    const [dragged] = galleryOrderDraft.splice(sourceIndex, 1);
    let insertAt = targetIndex + (insertAfter ? 1 : 0);
    if (sourceIndex < insertAt) insertAt -= 1;
    galleryOrderDraft.splice(insertAt, 0, dragged);
    draggedEventId = null;
    renderGalleryAdminPanel();
  });

  list.addEventListener("dragend", () => {
    draggedEventId = null;
    list.querySelectorAll(".is-dragging, .is-drop-target").forEach(item => {
      item.classList.remove("is-dragging", "is-drop-target");
    });
  });
}

/**
 * Memvalidasi tautan Google Slides (hanya https://docs.google.com/presentation/d/...) dan mengambil id-nya.
 * @returns {{id: string, published: boolean}|null} null bila tautan tidak valid.
 */
function getGoogleSlidesPresentationInfo(slidesUrl) {
  try {
    const url = new URL(slidesUrl);
    if (url.protocol !== "https:" || url.hostname !== "docs.google.com" || url.username || url.password || (url.port && url.port !== "443")) return null;
    const match = url.pathname.match(/^\/presentation\/d\/(e\/)?([^/]+)/);
    if (!match) return null;

    return { id: encodeURIComponent(match[2]), published: Boolean(match[1]) };
  } catch {
    return null;
  }
}

/** URL embed untuk iframe penampil; string kosong bila tautan tidak valid. */
function getGoogleSlidesEmbedUrl(slidesUrl) {
  const presentation = getGoogleSlidesPresentationInfo(slidesUrl);
  if (!presentation) return "";
  const publishedPath = presentation.published ? "e/" : "";
  return `https://docs.google.com/presentation/d/${publishedPath}${presentation.id}/embed?start=false&loop=false&delayms=3000`;
}

/** URL thumbnail utama kartu event (presentasi terbit: export/png; lainnya: thumbnail Drive). */
function getGoogleSlidesThumbnailUrl(slidesUrl) {
  const presentation = getGoogleSlidesPresentationInfo(slidesUrl);
  if (!presentation) return "";
  if (presentation.published) {
    return `https://docs.google.com/presentation/d/e/${presentation.id}/export/png`;
  }
  return `https://drive.google.com/thumbnail?id=${presentation.id}&sz=w1200`;
}

/** URL thumbnail cadangan untuk presentasi yang belum diterbitkan. */
function getGoogleSlidesThumbnailFallbackUrl(slidesUrl) {
  const presentation = getGoogleSlidesPresentationInfo(slidesUrl);
  if (!presentation || presentation.published) return "";
  return `https://docs.google.com/presentation/d/${presentation.id}/export/png`;
}

/** Mengisi halaman penampil (judul, subtitle, iframe Google Slides) atau menampilkan pesan bila event tidak ditemukan/tautan tidak valid. */
function renderGalleryViewer(eventId) {
  const event = galleryEvents.find(item => String(item.id) === String(eventId));
  const title = document.getElementById("gallery-viewer-title");
  const subtitle = document.getElementById("gallery-viewer-subtitle");
  const iframe = document.getElementById("gallery-slides-frame");
  const frame = document.getElementById("gallery-slide-frame");
  const status = document.getElementById("gallery-viewer-status");
  if (!title || !subtitle || !iframe || !frame || !status) return;

  if (!event) {
    title.textContent = "Dokumentasi tidak ditemukan";
    subtitle.textContent = "Event ini mungkin sudah dihapus.";
    iframe.src = "about:blank";
    frame.hidden = true;
    status.hidden = true;
    return;
  }

  title.textContent = event.title;
  subtitle.textContent = event.subtitle;
  const embedUrl = getGoogleSlidesEmbedUrl(event.slides_url);
  iframe.src = embedUrl || "about:blank";
  frame.hidden = !embedUrl;
  status.textContent = embedUrl ? "" : "Tautan Google Slides tidak valid. Hubungi admin jemaat.";
  status.hidden = Boolean(embedUrl);
}

/** Membuka penampil untuk satu event (menambah entri riwayat browser). */
function openGalleryEvent(eventId) {
  if (!galleryEvents.some(event => String(event.id) === String(eventId))) return;
  currentGalleryEventId = String(eventId);
  renderGalleryViewer(currentGalleryEventId);
  switchTab("tab-gallery-viewer");
}

/** Menutup penampil dan kembali ke Beranda. */
function closeGalleryEvent() {
  currentGalleryEventId = null;
  window.history.replaceState({ tabId: "tab-home" }, "", "#beranda");
  switchTab("tab-home", false);
}

/** Membuka modal tambah/ubah event (admin). Tanpa `eventId` berarti tambah baru. */
function openGalleryEventForm(eventId = "") {
  if (!isAdminLoggedIn) return;
  const form = document.getElementById("gallery-event-form");
  const event = galleryEvents.find(item => String(item.id) === String(eventId));
  if (!form) return;

  form.reset();
  document.getElementById("gallery-event-id").value = event ? event.id : "";
  document.getElementById("gallery-event-title").value = event ? event.title : "";
  document.getElementById("gallery-event-subtitle").value = event ? event.subtitle : "";
  document.getElementById("gallery-event-slides-url").value = event ? event.slides_url : "";
  document.getElementById("gallery-event-modal-title").textContent = event ? "Edit Event" : "Tambah Event";
  const error = document.getElementById("gallery-event-form-error");
  error.hidden = true;
  error.textContent = "";
  openModal("modal-gallery-event");
}

/** Masuk ke mode Atur Slot, atau membatalkannya bila sudah aktif. */
function toggleGalleryOrderMode() {
  if (!isAdminLoggedIn || galleryEvents.length === 0) return;
  if (galleryOrderMode) {
    cancelGalleryOrder();
    return;
  }
  galleryOrderMode = true;
  galleryOrderDraft = [...galleryEvents].sort((first, second) => Number(first.slot) - Number(second.slot));
  renderGalleryAdminPanel();
}

/** Keluar dari mode Atur Slot tanpa menyimpan. */
function cancelGalleryOrder() {
  galleryOrderMode = false;
  galleryOrderDraft = [];
  renderGalleryAdminPanel();
}

/**
 * Menyimpan urutan baru dengan cara menukar isi (title, subtitle, slides_url, created_at) antar baris.
 * Kolom `slot` dan `id` tidak diubah sehingga aman dari constraint unik/check di database.
 */
async function saveGalleryEventOrder() {
  const saveButton = document.getElementById("btn-save-gallery-order");
  const status = document.getElementById("gallery-admin-status");

  if (!galleryOrderMode || galleryOrderDraft.length === 0) return;

  if (!isAdminLoggedIn || !supabaseClient) {
    if (status) status.textContent = "Login admin Supabase diperlukan untuk mengatur slot.";
    return;
  }

  if (saveButton) saveButton.disabled = true;
  try {
    for (let i = 0; i < galleryOrderDraft.length; i++) {
      const targetRow = galleryEvents[i]; // Row fisik asli di urutan i
      const newEventData = galleryOrderDraft[i]; // Data yang diinginkan di urutan i
      
      // Jika di urutan ini datanya sudah benar, lewati update
      if (targetRow.id === newEventData.id) continue;
      
      const { error } = await supabaseClient
        .from("Kegiatan Jemaat")
        .update({
          title: newEventData.title,
          subtitle: newEventData.subtitle,
          slides_url: newEventData.slides_url,
          created_at: newEventData.created_at // Tukar juga tanggalnya biar identik
        })
        .eq("id", targetRow.id);
        
      if (error) throw error;
    }

    galleryOrderMode = false;
    galleryOrderDraft = [];
    await fetchGalleryEvents();
    showToast("Urutan slot kegiatan diperbarui.");
  } catch (error) {
    if (status) {
      status.textContent = error.message || "Urutan slot gagal disimpan.";
    }
  } finally {
    if (saveButton) saveButton.disabled = false;
  }
}

/** Menyimpan event baru atau hasil edit (validasi tautan Slides, slot kosong pertama dipakai untuk event baru). */
async function saveGalleryEvent(event) {
  event.preventDefault();
  if (!isAdminLoggedIn || !supabaseClient) {
    showToast("Login admin Supabase diperlukan untuk menyimpan event.", "fa-solid fa-triangle-exclamation");
    return;
  }

  const id = document.getElementById("gallery-event-id").value;
  const title = document.getElementById("gallery-event-title").value.trim();
  const subtitle = document.getElementById("gallery-event-subtitle").value.trim();
  const slidesUrl = document.getElementById("gallery-event-slides-url").value.trim();
  const errorElement = document.getElementById("gallery-event-form-error");
  if (!getGoogleSlidesEmbedUrl(slidesUrl)) {
    errorElement.textContent = "Masukkan link presentasi Google Slides yang valid.";
    errorElement.hidden = false;
    return;
  }

  const existingEvent = galleryEvents.find(item => String(item.id) === String(id));
  const usedSlots = new Set(galleryEvents.map(item => Number(item.slot)));
  const slot = existingEvent
    ? Number(existingEvent.slot)
    : Array.from({ length: MAX_GALLERY_EVENTS }, (_, index) => index + 1).find(candidate => !usedSlots.has(candidate));
  if (!slot) {
    closeModal("modal-gallery-event");
    showToast("Galeri sudah mencapai batas maksimal tiga event.", "fa-solid fa-triangle-exclamation");
    return;
  }

  const payload = { slot, title, subtitle, slides_url: slidesUrl };
  const submitButton = document.querySelector("#gallery-event-form button[type='submit']");
  if (submitButton) submitButton.disabled = true;

  try {
    const query = existingEvent
      ? supabaseClient.from("Kegiatan Jemaat").update(payload).eq("id", id)
      : supabaseClient.from("Kegiatan Jemaat").insert(payload);
    const { error } = await query;
    if (error) throw error;

    closeModal("modal-gallery-event");
    await fetchGalleryEvents();
    showToast(existingEvent ? "Event dokumentasi diperbarui." : "Event dokumentasi ditambahkan.");
  } catch (error) {
    errorElement.textContent = error.message || "Event gagal disimpan. Pastikan hak akses Supabase sudah diatur.";
    errorElement.hidden = false;
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

/** Meminta konfirmasi lalu menghapus event galeri dari Supabase. */
async function deleteGalleryEvent(eventId) {
  if (!isAdminLoggedIn || !supabaseClient) return;
  const item = galleryEvents.find(event => String(event.id) === String(eventId));
  if (!item) return;

  openDeleteConfirmation({
    subtitle: "Kegiatan Jemaat",
    message: `Hapus event "${item.title}" dari galeri?`,
    description: "Event ini akan dihapus dari galeri dan database server Supabase.",
    onConfirm: async () => {
      try {
        const { error } = await supabaseClient.from("Kegiatan Jemaat").delete().eq("id", eventId);
        if (error) throw error;

        await fetchGalleryEvents();
        showDeleteResult(true, "Event dokumentasi berhasil dihapus.");
      } catch (error) {
        showDeleteResult(false, `Event gagal dihapus: ${error.message}`);
      }
    }
  });
}

// ==========================================
// 15. AUTENTIKASI ADMIN & NAVIGASI DASHBOARD
// Login memakai Supabase Auth; hak tulis dijaga oleh RLS di database, bukan oleh status ini (hanya mengatur tampilan UI).
// ==========================================

/** true bila ada sesi Supabase Auth aktif; mengatur tampilan tombol/edit di UI. */
let isAdminLoggedIn = false;

/** Menyetel tampilan admin awal, memulihkan sesi, dan memuat semua data awal (pianis, direktori, susunan Sabat, pengumuman, galeri). */
function initAdminState() {
  updateAdminUIState();
  restoreAdminSession();
  syncNearestPosToWorship();
  fetchDirectoryFromSupabase();
  fetchPosFromSupabase();
  fetchSabbathProgramData();
  fetchPengumuman();
  fetchGalleryEvents();
}

/** Memulihkan sesi Supabase Auth yang tersimpan; bila admin, bersihkan override kedaluwarsa dan terapkan data. */
async function restoreAdminSession() {
  initSupabaseClient();
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    console.warn("Supabase restore admin session error:", error.message);
    return;
  }
  isAdminLoggedIn = Boolean(data.session?.user);
  updateAdminUIState();
  if (isAdminLoggedIn) {
    await removeExpiredWorshipOverrides();
    applySabbathDatabaseRows();
  }
}

/** Menyesuaikan UI dengan status login: tombol header, tombol edit pengumuman, dan tombol edit susunan. */
function updateAdminUIState() {
  const btnAdmin = document.getElementById("btn-admin-login");
  const btnText = document.getElementById("admin-btn-text");
  const btnIcon = document.getElementById("admin-btn-icon");
  const btnEditPengumuman = document.getElementById("btn-edit-pengumuman");
  
  if (btnEditPengumuman) {
    btnEditPengumuman.style.display = isAdminLoggedIn ? "inline-block" : "none";
  }

  if (!isAdminLoggedIn) {
    subtabEditState = {
      "sabat-raya": false,
      "rabu-malam": false
    };
  }

  // Render ulang subtab ibadah agar tombol edit mengikuti status login
  renderSubTab("sabat-raya");
  renderSubTab("rabu-malam");

  if (!btnAdmin) return;

  if (isAdminLoggedIn) {
    btnAdmin.classList.add("admin-logged-in");
    if (btnIcon) {
      btnIcon.className = "fa-solid fa-table-columns";
    }
    if (btnText) {
      btnText.innerHTML = `<span class="pulse-indicator"></span> Buka Dashboard`;
    }
    btnAdmin.title = "Sesi Admin Aktif (Klik untuk langsung membuka Database View)";
  } else {
    btnAdmin.classList.remove("admin-logged-in");
    if (btnIcon) {
      btnIcon.className = "fa-solid fa-user-gear";
    }
    if (btnText) {
      btnText.textContent = "Login Admin";
    }
    btnAdmin.title = "Login Admin / Pengurus";
  }
}

/** Menampilkan dashboard admin (menyembunyikan app shell) dan memuat ulang data tabelnya. */
function openAdminDatabaseView() {
  const appShell = document.getElementById("app-shell");
  const dbView = document.getElementById("admin-database-view");
  if (appShell) appShell.style.display = "none";
  if (dbView) dbView.style.display = "flex";

  // Panel pertama yang dibuka adalah Direktori
  switchAdminDbTab("directory");
  fetchDirectoryFromSupabase();
  fetchPosFromSupabase();
  fetchSabbathProgramData();
  fetchGalleryEvents();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/** Kembali dari dashboard ke aplikasi publik. */
function closeAdminDatabaseView() {
  const appShell = document.getElementById("app-shell");
  const dbView = document.getElementById("admin-database-view");
  if (dbView) dbView.style.display = "none";
  if (appShell) appShell.style.display = "flex";

  updateAdminUIState();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/** Tombol admin di header: bila sudah login buka dashboard, bila belum buka modal login. */
function handleAdminNavClick() {
  if (isAdminLoggedIn) {
    // Sudah login: langsung buka dashboard
    openAdminDatabaseView();
  } else {
    openModal("modal-admin-login");
  }
}

/** Menutup modal konfirmasi dan melakukan logout. */
function confirmLogoutAdmin() {
  closeModal("modal-logout-confirm");
  logoutAdmin();
}

/** Keluar dari Supabase Auth, menutup dashboard, dan menyegarkan UI. */
function logoutAdmin() {
  isAdminLoggedIn = false;

  // Akhiri sesi Supabase Auth bila aktif
  if (supabaseClient && supabaseClient.auth) {
    supabaseClient.auth.signOut().catch(() => { });
  }

  closeAdminDatabaseView();
  updateAdminUIState();
  showToast("Anda telah keluar dari Mode Admin.", "fa-solid fa-right-from-bracket text-gold");
}

/** Menampilkan/menyembunyikan kata sandi pada form login. */
function togglePasswordVisibility() {
  const pwdInput = document.getElementById("admin-password");
  const icon = document.getElementById("password-toggle-icon");
  if (!pwdInput || !icon) return;

  if (pwdInput.type === "password") {
    pwdInput.type = "text";
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
  } else {
    pwdInput.type = "password";
    icon.classList.remove("fa-eye-slash");
    icon.classList.add("fa-eye");
  }
}

/**
 * Memproses form login admin lewat Supabase Auth (email + password).
 * Berhasil: tampilkan banner sukses lalu buka dashboard. Gagal: guncang kartu dan tampilkan pesan galat.
 */
async function handleAdminLoginSubmit(e) {
  e.preventDefault();
  const emailInput = document.getElementById("admin-email");
  const passwordInput = document.getElementById("admin-password");
  const errorBanner = document.getElementById("admin-login-error");
  const errorText = document.getElementById("admin-error-text");
  const successBanner = document.getElementById("admin-login-success");
  const submitBtn = document.getElementById("btn-submit-admin-login");
  const modalCard = document.querySelector("#modal-admin-login .modal-card");

  const email = emailInput ? emailInput.value.trim() : "";
  const password = passwordInput ? passwordInput.value : "";

  // Reset banner status
  if (errorBanner) errorBanner.style.display = "none";
  if (successBanner) successBanner.style.display = "none";

  // Tampilkan indikator memuat
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Menghubungkan Supabase...</span>`;
  }

  const client = initSupabaseClient();

  if (client) {
    // Panggil autentikasi Supabase
    let authResult;
    try {
      authResult = await client.auth.signInWithPassword({
        email: email,
        password: password
      });
    } catch (err) {
      showLoginFailure("Gagal menghubungi Supabase: " + err.message);
      return;
    }

    const { data, error } = authResult;
    if (error) {
      showLoginFailure(error.message || "Gagal masuk Supabase. Periksa Email & Password.");
      return;
    }

    if (data && data.user) {
      showLoginSuccess(data.user.email);
      return;
    }
  }

  showLoginFailure("Supabase belum terhubung; login admin tidak tersedia.");

  function showLoginSuccess(userEmail) {
    if (successBanner) successBanner.style.display = "flex";
    isAdminLoggedIn = true;
    updateAdminUIState();

    setTimeout(() => {
      closeModal("modal-admin-login");
      showToast(`Login Berhasil! Membuka Database View...`, "fa-solid fa-user-shield text-emerald");

      if (emailInput) emailInput.value = "";
      if (passwordInput) passwordInput.value = "";
      if (successBanner) successBanner.style.display = "none";
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> <span>Masuk via Supabase Auth</span>`;
      }

      // Setelah login, langsung buka dashboard
      openAdminDatabaseView();
    }, 700);
  }

  function showLoginFailure(msg) {
    if (modalCard) {
      modalCard.classList.remove("shake-error");
      void modalCard.offsetWidth;
      modalCard.classList.add("shake-error");
    }
    if (errorText) errorText.textContent = msg;
    if (errorBanner) errorBanner.style.display = "flex";

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> <span>Masuk via Supabase Auth</span>`;
    }
  }
}

/**
 * Berpindah panel di sidebar dashboard (pos, directory, sekolah-sabat, khotbah, gallery-events, ...) dan memuat/merender datanya.
 * @param {string} tabKey Nilai atribut data-dbtab tombol sidebar.
 */
function switchAdminDbTab(tabKey) {
  // Tandai tombol sidebar yang aktif
  const tabBtns = document.querySelectorAll(".sidebar-tab-btn");
  tabBtns.forEach(btn => {
    if (btn.getAttribute("data-dbtab") === tabKey) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Tampilkan panel yang sesuai
  const panels = document.querySelectorAll(".admin-panel");
  panels.forEach(panel => {
    if (panel.id === `panel-${tabKey}`) {
      panel.classList.add("active");
    } else {
      panel.classList.remove("active");
    }
  });

  if (tabKey === "pos") {
    renderPosTable();
  } else if (tabKey === "directory") {
    renderDirectoryTable();
  } else if (tabKey === "gallery-events") {
    fetchGalleryEvents();
  }
}

// ==========================================
// 16. DATA JADWAL: PIANIS (POS), SEKOLAH SABAT & KHOTBAH
// Tabel admin, import CSV, geser jadwal, dan penerapan data ke Susunan Ibadah.
// ==========================================

// ------------------------------------------
// Tabel Pianis (POS): state & pemuatan data
// ------------------------------------------

/** Jadwal pianis dari Tabel Pianis: [{ id, date: "YYYY-MM-DD", pianist }]. */
let posScheduleList = [];
/** Kolom pengurutan tabel POS ("date" atau "pianist"). */
let posSortField = "date";
/** Arah pengurutan tabel POS; false = menurun (tanggal terbaru di atas). */
let posSortAsc = false; // Descending by default
/** Kata kunci pencarian tabel POS. */
let posSearchQuery = "";

/** Memuat Tabel Pianis (terbaru di atas), merender tabel POS, dan menyinkronkan pianis ke susunan Sabat. */
async function fetchPosFromSupabase() {
  initSupabaseClient();
  if (!supabaseClient) return;

  try {
    const { data, error } = await supabaseClient
      .from("Tabel Pianis")
      .select("id, date, pianist")
      .order("date", { ascending: false });

    if (error) {
      console.warn("Supabase fetch Tabel Pianis error:", error.message);
      return;
    }

    if (data) {
      posScheduleList = data.map(row => ({
        id: row.id,
        date: row.date,
        pianist: row.pianist
      }));
      syncNearestPosToWorship();
      renderPosTable();
    }
  } catch (err) {
    console.warn("Error fetching Tabel Pianis from Supabase:", err);
  }
}

// ------------------------------------------
// Tabel Sekolah Sabat (SS) & Khotbah: kolom, render, urut, cari
// ------------------------------------------

/** Kolom tabel admin Sekolah Sabat sebagai pasangan [kunci, label]. Kolom "diskusi_gabungan" hanya tampilan (gabungan Orang Muda + Orang Tua). */
const ssTableColumns = [
  ["date", "Tanggal"],
  ["pemimpin_acara", "Pemimpin Acara"],
  ["lagu_buka", "Lagu Buka"],
  ["ayat_inti_doa_buka", "Ayat Inti - Doa Buka"],
  ["mission", "Berita Mission"],
  ["diskusi_gabungan", "Diskusi Orang Muda / Orang Tua"],
  ["lagu_pujian", "Lagu Pujian"],
  ["pp", "PP"],
  ["lagu_tutup", "Lagu Tutup"],
  ["diakon_es", "Diakon & Diakones"],
  ["cerita_anak", "Cerita Anak"]
];

/**
 * Kolom tabel admin Khotbah sebagai pasangan [kunci, label].
 * Lagu paten (515, 1, 260, 21) dan lagu tema "Misi Kita" tidak lagi disimpan di tabel; nilainya ditetapkan langsung di applySabbathDatabaseRows().
 */
const khotbahTableColumns = [
  ["date", "Tanggal"],
  // Kolom paten dihapus: lagu_pengiring_partisipan_mimbar (515), lagu_sambutan (1),
  // lagu_persembahan (260), lagu_persembahan_lanjutan (21), lagu_tema (Misi Kita)
  ["mc_ayat_bersahutan", "MC & Ayat Bersahutan"],
  ["lagu_buka", "Lagu Buka"],
  ["doa_syafaat", "Doa Syafaat"],
  ["bacaan_persembahan", "Bacaan Persembahan"],
  ["doa_persembahan", "Doa Persembahan"],
  ["lagu_pujian", "Lagu Pujian"],
  ["ayat_inti_visi_misi", "Ayat Inti & Visi Misi"],
  ["pengkhotbah", "Pengkhotbah"],
  ["judul", "Judul"],
  ["lagu_tutup", "Lagu Tutup"],
  ["doa_tutup", "Doa Tutup"]
];

/** Baris Tabel SS (Sekolah Sabat) yang sudah dimuat. */
let ssScheduleList = [];
/** Baris Tabel Khotbah yang sudah dimuat. */
let khotbahScheduleList = [];
/** Status pengurutan tabel SS dan Khotbah: { field, ascending } per tabel. */
const sabbathTableSort = {
  ss: { field: 'date', ascending: false },
  khotbah: { field: 'date', ascending: false }
};

/**
 * Merender tabel admin SS atau Khotbah: header yang dapat diurutkan, pencarian, penghitung baris, dan tombol Edit/Hapus.
 * @param {"ss"|"khotbah"} tableKey
 * @param {Array} rows Baris data.
 * @param {Array} columns Pasangan [kunci, label].
 * @param {string} [emptyMessage] Pesan saat tidak ada baris.
 */
function renderSabbathDatabaseTable(tableKey, rows, columns, emptyMessage = "Belum ada data pada tabel Supabase.") {
  const head = document.getElementById(`${tableKey}-table-head`);
  const body = document.getElementById(`${tableKey}-table-body`);
  if (!head || !body) return;

  const sortState = sabbathTableSort[tableKey];
  head.innerHTML = `<tr>${columns.map(([key, label]) => `
    <th class="sortable" onclick="sortSabbathTable('${tableKey}', '${key}')">
      <div class="th-content"><span>${escapeHtml(label)}</span><i class="fa-solid fa-sort${sortState.field === key ? (sortState.ascending ? '-up' : '-down') : ''} th-sort-icon"></i></div>
    </th>
  `).join('')}<th class="th-actions">Aksi</th></tr>`;
  const searchInput = document.getElementById(`${tableKey}-table-search`);
  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const filteredRows = (rows || []).filter(row => !query || columns.some(([key]) =>
    getSabbathTableValue(row, key).toLowerCase().includes(query)
  ));
  const displayed = document.getElementById(`${tableKey}-count-displayed`);
  const total = document.getElementById(`${tableKey}-count-total`);
  if (displayed) displayed.textContent = filteredRows.length;
  if (total) total.textContent = rows?.length || 0;

  if (filteredRows.length === 0) {
    body.innerHTML = `<tr><td colspan="${columns.length + 1}" style="text-align:center; padding:40px 16px; color:var(--text-muted);">${escapeHtml(emptyMessage)}</td></tr>`;
    return;
  }

  filteredRows.sort((a, b) => {
    const first = getSabbathTableValue(a, sortState.field).toLowerCase();
    const second = getSabbathTableValue(b, sortState.field).toLowerCase();
    if (first === second) return 0;
    const result = first < second ? -1 : 1;
    return sortState.ascending ? result : -result;
  });

  body.innerHTML = filteredRows.map(row => `
    <tr>
      ${columns.map(([key]) => key === 'date'
    ? `<td><span class="td-date-badge">${escapeHtml(formatDateIndo(getSabbathTableValue(row, key)))}</span></td>`
    : `<td class="td-officer${key === 'diskusi_gabungan' ? ' sabbath-discussion-cell' : ''}">${escapeHtml(getSabbathTableValue(row, key))}</td>`
  ).join('')}
      <td class="th-actions"><div class="td-actions-wrap">
        <button class="btn-table-edit" onclick="openSabbathTableEditModal('${tableKey}', '${escapeHtml(row.id)}')" title="Edit Data">Edit</button>
        <button class="btn-table-delete" onclick="deleteSabbathTableEntry('${tableKey}', '${escapeHtml(row.id)}')" title="Hapus Data">Hapus</button>
      </div></td>
    </tr>
  `).join('');
}

/** Nilai sel untuk tabel SS/Khotbah. Kolom "diskusi_gabungan" menggabungkan Orang Muda & Orang Tua; nilai kosong tampil "-". */
function getSabbathTableValue(row, key) {
  if (key === "diskusi_gabungan") {
    return `Orang Muda: ${row.diskusi_orang_muda || '-'}\nOrang Tua: ${row.diskusi_orang_tua || '-'}`;
  }
  return String(row[key] ?? '-');
}

/** Konfigurasi tabel SS/Khotbah: nama tabel Supabase, daftar baris, dan kolom. */
function getSabbathTableConfig(tableKey) {
  return tableKey === 'ss'
    ? { table: 'Tabel SS', rows: ssScheduleList, columns: ssTableColumns }
    : { table: 'Tabel Khotbah', rows: khotbahScheduleList, columns: khotbahTableColumns };
}

// ------------------------------------------
// Import CSV (Pianis, SS, Khotbah)
// ------------------------------------------

/** State wizard Import CSV (null saat modal tertutup): { tableKey, file, rows, preview, saving }. */
let csvImportState = null;

/**
 * Konfigurasi import CSV per tabel (pos / ss / khotbah): tabel tujuan, judul, baris yang ada, dan kolom wajib.
 * Kolom SS memisahkan diskusi Orang Muda dan Orang Tua (bukan kolom gabungan).
 */
function getCsvImportConfig(tableKey) {
  if (tableKey === "pos") {
    return {
      table: "Tabel Pianis",
      title: "Tabel Pianis",
      rows: posScheduleList,
      columns: [
        ["date", "Tanggal"],
        ["pianist", "Pianis"]
      ]
    };
  }

  if (tableKey === "ss") {
    return {
      table: "Tabel SS",
      title: "Tabel Sekolah Sabat",
      rows: ssScheduleList,
      columns: [
        ["date", "Tanggal"],
        ["pemimpin_acara", "Pemimpin Acara"],
        ["lagu_buka", "Lagu Buka"],
        ["ayat_inti_doa_buka", "Ayat Inti - Doa Buka"],
        ["mission", "Berita Mission"],
        ["diskusi_orang_muda", "Diskusi Orang Muda"],
        ["diskusi_orang_tua", "Diskusi Orang Tua"],
        ["lagu_pujian", "Lagu Pujian"],
        ["pp", "Promosi Pelayanan Perorangan"],
        ["lagu_tutup", "Lagu Tutup"],
        ["diakon_es", "Diakon & Diakones"],
        ["cerita_anak", "Cerita Anak"]
      ]
    };
  }

  if (tableKey === "khotbah") {
    return {
      table: "Tabel Khotbah",
      title: "Tabel Khotbah",
      rows: khotbahScheduleList,
      columns: [
        ["date", "Tanggal"],
        ["mc_ayat_bersahutan", "MC & Ayat Bersahutan"],
        ["lagu_buka", "Lagu Buka"],
        ["doa_syafaat", "Doa Syafaat"],
        ["bacaan_persembahan", "Bacaan Persembahan"],
        ["doa_persembahan", "Doa Persembahan"],
        ["lagu_pujian", "Lagu Pujian"],
        ["ayat_inti_visi_misi", "Ayat Inti & Visi Misi"],
        ["pengkhotbah", "Pengkhotbah"],
        ["judul", "Judul"],
        ["lagu_tutup", "Lagu Tutup"],
        ["doa_tutup", "Doa Tutup"]
      ]
    };
  }

  throw new Error("Tabel impor tidak dikenal.");
}

/** Membuka modal Import CSV untuk satu tabel dan menyetel ulang wizard (tahap unggah). */
function openCsvImportModal(tableKey) {
  const config = getCsvImportConfig(tableKey);
  csvImportState = { tableKey, file: null, rows: [], preview: [] };

  document.getElementById("csv-import-title").textContent = `Import CSV - ${config.title}`;
  document.getElementById("csv-import-subtitle").textContent = `Gabungkan data ke ${config.table} berdasarkan tanggal`;
  document.getElementById("csv-import-file").value = "";
  document.getElementById("csv-import-file-name").textContent = "Belum ada file dipilih";
  document.getElementById("csv-import-error").hidden = true;
  document.getElementById("csv-import-error-preview").hidden = true;
  document.getElementById("csv-import-preview-button").disabled = true;
  document.getElementById("csv-import-upload-stage").hidden = false;
  document.getElementById("csv-import-preview-stage").hidden = true;

  const dropzone = document.getElementById("csv-import-dropzone");
  if (!dropzone.dataset.eventsReady) {
    dropzone.dataset.eventsReady = "true";
    dropzone.addEventListener("dragover", event => {
      event.preventDefault();
      dropzone.classList.add("is-dragover");
    });
    dropzone.addEventListener("dragleave", event => {
      if (!dropzone.contains(event.relatedTarget)) dropzone.classList.remove("is-dragover");
    });
    dropzone.addEventListener("drop", event => {
      event.preventDefault();
      dropzone.classList.remove("is-dragover");
      handleCsvImportFile(event.dataTransfer.files[0]);
    });
  }

  openModal("modal-csv-import");
}

/** Menutup modal Import CSV (diabaikan saat sedang menyimpan). */
function closeCsvImportModal() {
  if (csvImportState?.saving) return;
  closeModal("modal-csv-import");
  csvImportState = null;
}

/** Memvalidasi file CSV (ekstensi .csv, maks. 5 MB) lalu mengaktifkan tombol pratinjau. */
function handleCsvImportFile(file) {
  const errorElement = document.getElementById("csv-import-error");
  const nextButton = document.getElementById("csv-import-preview-button");
  document.getElementById("csv-import-file").value = "";
  errorElement.hidden = true;
  nextButton.disabled = true;
  if (csvImportState) csvImportState.file = null;
  document.getElementById("csv-import-file-name").textContent = file?.name || "Belum ada file dipilih";
  if (!file) return;

  if (!/\.csv$/i.test(file.name)) {
    errorElement.textContent = "Pilih file dengan format .csv.";
    errorElement.hidden = false;
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    errorElement.textContent = "Ukuran file CSV maksimal 5 MB.";
    errorElement.hidden = false;
    return;
  }

  csvImportState.file = file;
  csvImportState.rows = [];
  csvImportState.preview = [];
  document.getElementById("csv-import-file-name").textContent = file.name;
  nextButton.disabled = false;
}

/** Mengunduh template CSV (hanya header kolom) untuk tabel yang sedang diimpor. */
function downloadCsvImportTemplate() {
  if (!csvImportState) return;
  const config = getCsvImportConfig(csvImportState.tableKey);
  const headers = config.columns.map(([key]) => key);
  const csv = `\uFEFF${headers.join(",")}\r\n`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${csvImportState.tableKey}-template.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Parser CSV sederhana: mendukung BOM, direktif `sep=`, deteksi pemisah (, ; tab), tanda kutip ganda, dan baris kosong.
 * @returns {string[][]} Baris dan kolom. Melempar Error bila tanda kutip tidak tertutup.
 */
function parseCsvText(text) {
  let content = text.replace(/^\uFEFF/, "");
  let delimiter = ",";
  const separatorDirective = /^sep=(,|;|\t)\r?\n/i.exec(content);
  if (separatorDirective) {
    delimiter = separatorDirective[1];
    content = content.slice(separatorDirective[0].length);
  } else {
    const firstLine = content.split(/\r?\n/, 1)[0];
    const delimiterCounts = [",", ";", "\t"].map(char => {
      let count = 0;
      let quoted = false;
      for (let index = 0; index < firstLine.length; index += 1) {
        if (firstLine[index] === '"') {
          if (quoted && firstLine[index + 1] === '"') index += 1;
          else quoted = !quoted;
        } else if (!quoted && firstLine[index] === char) {
          count += 1;
        }
      }
      return { char, count };
    }).sort((a, b) => b.count - a.count);
    if (delimiterCounts[0].count > 0) delimiter = delimiterCounts[0].char;
  }

  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    if (quoted) {
      if (char === '"' && content[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field.length === 0) {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && content[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some(value => value.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (quoted) throw new Error("Ada tanda kutip CSV yang belum ditutup.");
  row.push(field);
  if (row.some(value => value.trim() !== "")) rows.push(row);
  return rows;
}

/** Memvalidasi isi CSV (header, jumlah kolom, format tanggal YYYY-MM-DD, tanggal ganda) lalu membandingkannya dengan data yang ada untuk pratinjau (baru / berbeda / sama). */
async function prepareCsvImportPreview() {
  const state = csvImportState;
  if (!state?.file) return;
  const errorElement = document.getElementById("csv-import-error");
  errorElement.hidden = true;

  try {
    const config = getCsvImportConfig(state.tableKey);
    const parsedRows = parseCsvText(await state.file.text());
    if (csvImportState !== state) return;
    if (parsedRows.length < 2) throw new Error("File CSV belum berisi baris data.");

    const headers = parsedRows[0].map(header => header.trim().toLowerCase());
    if (new Set(headers).size !== headers.length) throw new Error("Ada nama kolom yang duplikat di header CSV.");
    const knownColumns = new Set(config.columns.map(([key]) => key));
    const unknownHeaders = headers.filter(header => !knownColumns.has(header));
    const missingHeaders = config.columns
      .map(([key]) => key)
      .filter(key => !headers.includes(key));
    if (unknownHeaders.length || missingHeaders.length) {
      const issues = [];
      if (missingHeaders.length) issues.push(`Kolom wajib tidak ditemukan: ${missingHeaders.join(", ")}.`);
      if (unknownHeaders.length) issues.push(`Kolom tidak dikenal: ${unknownHeaders.join(", ")}.`);
      throw new Error(issues.join(" "));
    }

    const rows = parsedRows.slice(1).map((values, index) => {
      if (values.length !== headers.length) {
        throw new Error(`Jumlah kolom pada baris ${index + 2} tidak sesuai dengan header.`);
      }
      return Object.fromEntries(headers.map((header, columnIndex) => [header, values[columnIndex].trim()]));
    });
    const seenDates = new Set();
    rows.forEach((row, index) => {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(row.date);
      if (!match) throw new Error(`Tanggal pada baris ${index + 2} harus berformat YYYY-MM-DD.`);
      const date = new Date(`${row.date}T00:00:00`);
      if (Number.isNaN(date.getTime())
        || date.getFullYear() !== Number(match[1])
        || date.getMonth() + 1 !== Number(match[2])
        || date.getDate() !== Number(match[3])) {
        throw new Error(`Tanggal pada baris ${index + 2} tidak valid.`);
      }
      if (seenDates.has(row.date)) throw new Error(`Tanggal ${row.date} muncul lebih dari sekali di file CSV.`);
      seenDates.add(row.date);
    });

    const existingByDate = new Map(config.rows.map(row => [row.date, row]));
    const preview = rows.map(row => {
      const existing = existingByDate.get(row.date) || null;
      const changedColumns = existing
        ? config.columns.filter(([key]) => String(existing[key] ?? "").trim() !== row[key])
        : [];
      return {
        row,
        existing,
        status: !existing ? "new" : changedColumns.length ? "update" : "same",
        changedColumns,
        saved: false
      };
    });

    state.rows = rows;
    state.preview = preview;
    document.getElementById("csv-import-upload-stage").hidden = true;
    document.getElementById("csv-import-preview-stage").hidden = false;
    renderCsvImportPreview(config);
  } catch (error) {
    if (csvImportState !== state) return;
    errorElement.textContent = error.message;
    errorElement.hidden = false;
  }
}

/** Menampilkan ringkasan dan tabel pratinjau perbedaan hasil prepareCsvImportPreview(). */
function renderCsvImportPreview(config = getCsvImportConfig(csvImportState.tableKey)) {
  const preview = csvImportState.preview;
  const added = preview.filter(item => item.status === "new").length;
  const changed = preview.filter(item => item.status === "update").length;
  const unchanged = preview.filter(item => item.status === "same").length;
  document.getElementById("csv-import-summary").innerHTML = `
    <span>${preview.length} baris CSV</span>
    <span>${added} data baru</span>
    <span>${changed} akan diperbarui</span>
    <span>${unchanged} tidak berubah</span>
  `;
  document.getElementById("csv-import-preview-body").innerHTML = preview.map(item => {
    const date = escapeHtml(formatDateIndo(item.row.date));
    const statusLabel = item.status === "new" ? "Data baru"
      : item.status === "update" ? "Berbeda"
        : "Tidak berubah";
    const values = config.columns.filter(([key]) => key !== "date").map(([key, label]) => `
      <div>${item.changedColumns.some(([changedKey]) => changedKey === key) ? '<span class="csv-import-diff-dot" aria-label="Berbeda"></span>' : ""}
        <strong>${escapeHtml(label)}:</strong> ${escapeHtml(item.row[key] || "-")}
      </div>
    `).join("");
    const differences = item.status === "new"
      ? "Tanggal belum ada di tabel."
      : item.changedColumns.length
        ? item.changedColumns.map(([key, label]) => `
            <div><span class="csv-import-diff-dot" aria-label="Berbeda"></span>
              ${escapeHtml(label)}: ${escapeHtml(item.existing[key] || "-")} &rarr; ${escapeHtml(item.row[key] || "-")}
            </div>
          `).join("")
        : '<span class="csv-import-unchanged">Tidak ada perbedaan.</span>';
    return `<tr>
      <td>${date}</td>
      <td class="csv-import-status">${statusLabel}</td>
      <td class="csv-import-values">${values}</td>
      <td class="csv-import-diff">${differences}</td>
    </tr>`;
  }).join("");

  const saveButton = document.getElementById("csv-import-save-button");
  saveButton.disabled = preview.every(item => item.status === "same");
  saveButton.innerHTML = preview.every(item => item.status === "same")
    ? "Tidak Ada Perubahan"
    : '<i class="fa-solid fa-floppy-disk"></i> Simpan Perubahan';
}

/** Kembali dari tahap pratinjau ke tahap unggah file. */
function backToCsvImportUpload() {
  document.getElementById("csv-import-preview-stage").hidden = true;
  document.getElementById("csv-import-upload-stage").hidden = false;
}

/** Menyimpan baris baru/berubah satu per satu (insert atau update berdasarkan tanggal), melaporkan kegagalan per baris, lalu menyegarkan data. */
async function saveCsvImport() {
  if (!csvImportState || csvImportState.saving) return;
  const config = getCsvImportConfig(csvImportState.tableKey);
  const errorElement = document.getElementById("csv-import-error-preview");
  const saveButton = document.getElementById("csv-import-save-button");
  errorElement.hidden = true;
  const pendingRows = csvImportState.preview.filter(item => item.status !== "same" && !item.saved);
  if (pendingRows.length === 0) {
    closeCsvImportModal();
    showToast("Tidak ada perubahan untuk disimpan.", "fa-solid fa-circle-check");
    return;
  }

  initSupabaseClient();
  if (!supabaseClient) {
    errorElement.textContent = "Supabase belum terhubung. Data belum disimpan.";
    errorElement.hidden = false;
    return;
  }

  csvImportState.saving = true;
  saveButton.disabled = true;
  saveButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
  const failures = [];
  let savedCount = 0;

  for (const item of pendingRows) {
    const payload = Object.fromEntries(config.columns.map(([key]) => [key, item.row[key]]));
    try {
      const query = item.existing
        ? supabaseClient.from(config.table).update(payload).eq("id", item.existing.id).select().single()
        : supabaseClient.from(config.table).insert([payload]).select().single();
      const { data, error } = await query;
      if (error) throw error;

      const savedRow = data;
      if (!savedRow) throw new Error("Supabase tidak mengembalikan data tersimpan; baris ini tidak dianggap berhasil.");
      const rowList = config.rows;
      const rowIndex = item.existing
        ? rowList.findIndex(row => String(row.id) === String(item.existing.id))
        : -1;
      if (rowIndex >= 0) rowList[rowIndex] = savedRow;
      else rowList.unshift(savedRow);

      item.existing = savedRow;
      item.saved = true;
      item.status = "same";
      item.changedColumns = [];
      savedCount += 1;
    } catch (error) {
      failures.push(`${item.row.date}: ${error.message}`);
    }
  }

  csvImportState.saving = false;
  if (csvImportState.tableKey === "pos") {
    renderPosTable();
    syncNearestPosToWorship();
  } else {
    renderSabbathDatabaseTable(csvImportState.tableKey, config.rows, getSabbathTableConfig(csvImportState.tableKey).columns);
    applySabbathDatabaseRows();
  }

  if (failures.length) {
    renderCsvImportPreview(config);
    errorElement.textContent = `${savedCount} baris berhasil disimpan, ${failures.length} gagal. ${failures[0]}`;
    errorElement.hidden = false;
    saveButton.disabled = false;
    return;
  }

  const tableKey = csvImportState.tableKey;
  closeCsvImportModal();
  if (tableKey === "pos") await fetchPosFromSupabase();
  else await fetchSabbathProgramData();
  showToast(`${savedCount} baris berhasil diimpor ke ${config.table}.`, "fa-solid fa-circle-check text-emerald");
}

/** Merender ulang tabel SS/Khotbah sesuai kata kunci pencarian. */
function filterSabbathTable(tableKey) {
  const config = getSabbathTableConfig(tableKey);
  renderSabbathDatabaseTable(tableKey, config.rows, config.columns);
}

/** Mengurutkan tabel SS/Khotbah berdasarkan kolom (klik lagi membalik arah). */
function sortSabbathTable(tableKey, field) {
  const sortState = sabbathTableSort[tableKey];
  if (sortState.field === field) {
    sortState.ascending = !sortState.ascending;
  } else {
    sortState.field = field;
    sortState.ascending = true;
  }
  filterSabbathTable(tableKey);
}

/** Mengosongkan kolom pencarian tabel SS/Khotbah. */
function clearSabbathTableSearch(tableKey) {
  const input = document.getElementById(`${tableKey}-table-search`);
  if (input) input.value = '';
  filterSabbathTable(tableKey);
}

// ------------------------------------------
// Geser seluruh jadwal ±7 hari (konfirmasi + eksekusi)
// ------------------------------------------

/** Permintaan geser jadwal yang menunggu konfirmasi: { type: "pos"|"sabbath", tableKey, direction }. */
let pendingWeekShift = null;

/**
 * Membuka modal konfirmasi geser jadwal.
 * @param {"pos"|"sabbath"} type
 * @param {number} direction +1 = majukan (−7 hari), −1 = mundurkan (+7 hari).
 */
function openWeekShiftConfirm(type, tableKey, direction) {
  const tableName = type === "pos"
    ? "Tabel Pianis"
    : getSabbathTableConfig(tableKey).table;
  const action = direction > 0 ? "Majukan" : "Mundurkan";
  const title = document.getElementById("week-shift-confirm-title");
  const description = document.getElementById("week-shift-confirm-description");
  if (!title || !description) return;

  pendingWeekShift = { type, tableKey, direction };
  title.textContent = `Konfirmasi ${action} Jadwal`;
  const offset = direction > 0 ? "-7 hari" : "+7 hari";
  const dateDirection = direction > 0 ? "ke belakang" : "ke depan";
  description.textContent = `Yakin ingin ${action.toLowerCase()} semua tanggal di ${tableName} ${dateDirection} (${offset})?`;
  openModal("modal-week-shift-confirm");
}

/** Membatalkan geser jadwal. */
function cancelWeekShift() {
  pendingWeekShift = null;
  closeModal("modal-week-shift-confirm");
}

/** Menjalankan geser jadwal yang sudah disetujui. */
function confirmWeekShift() {
  const shift = pendingWeekShift;
  if (!shift) return;

  pendingWeekShift = null;
  closeModal("modal-week-shift-confirm");
  if (shift.type === "pos") {
    shiftPosWeek(shift.direction, true);
  } else {
    shiftSabbathTableWeek(shift.tableKey, shift.direction, true);
  }
}

/** Menggeser semua tanggal di tabel SS/Khotbah sebanyak 7 hari. `confirmed=false` hanya membuka konfirmasi. */
async function shiftSabbathTableWeek(tableKey, direction, confirmed = false) {
  if (!confirmed) {
    openWeekShiftConfirm("sabbath", tableKey, direction);
    return;
  }

  const config = getSabbathTableConfig(tableKey);
  if (config.rows.length === 0) {
    showToast(`Tidak ada jadwal di ${config.table} untuk digeser.`, "fa-solid fa-triangle-exclamation text-amber");
    return;
  }
  initSupabaseClient();
  if (!supabaseClient) {
    showToast(`Gagal menggeser jadwal ${config.table}: Supabase belum terhubung.`, "fa-solid fa-triangle-exclamation text-amber");
    return;
  }

  const updatedRows = config.rows.map(row => ({ ...row, date: shiftIsoDate(row.date, -direction * 7) }));

  try {
    const results = await Promise.all(updatedRows.map(row => supabaseClient
      .from(config.table)
      .update({ date: row.date })
      .eq('id', row.id)));
    const failedResult = results.find(result => result.error);
    if (failedResult?.error) throw failedResult.error;

    config.rows.splice(0, config.rows.length, ...updatedRows);
    renderSabbathDatabaseTable(tableKey, config.rows, config.columns);
    applySabbathDatabaseRows();
    const action = direction > 0 ? "dimajukan" : "dimundurkan";
    const offset = direction > 0 ? "-7" : "+7";
    showToast(`Semua jadwal ${config.table} berhasil ${action} (${offset} hari).`, "fa-solid fa-calendar-check text-gold");
  } catch (error) {
    console.warn(`Gagal menggeser ${config.table}:`, error);
    await fetchSabbathProgramData();
    showToast(`Gagal menggeser jadwal ${config.table}: ${error.message}`, "fa-solid fa-triangle-exclamation text-amber");
  }
}

// ------------------------------------------
// Form tambah / ubah / hapus data SS & Khotbah
// ------------------------------------------

/** Daftar kolom untuk form tambah/ubah. Kolom gabungan diskusi dipecah menjadi Orang Muda dan Orang Tua. */
function getSabbathFormFields(tableKey) {
  const config = getSabbathTableConfig(tableKey);
  const fields = config.columns
    .filter(([key]) => key !== 'diskusi_gabungan')
    .map(([key, label]) => [key, label]);
  if (tableKey === 'ss') {
    const insertAt = fields.findIndex(([key]) => key === 'lagu_pujian');
    fields.splice(insertAt, 0, ['diskusi_orang_muda', 'Orang Muda']);
    fields.splice(insertAt + 1, 0, ['diskusi_orang_tua', 'Orang Tua']);
  }
  return fields;
}

/** Tanggal default form tambah: satu minggu setelah tanggal terakhir (atau Sabtu terdekat bila tabel kosong), melewati tanggal yang sudah ada. */
function getNextSabbathTableDate(rows) {
  const dates = new Set(rows.map(row => row.date).filter(Boolean));
  const latestDate = [...dates].sort().pop();
  if (!latestDate) return getUpcomingSaturdayIso();

  const nextDate = new Date(`${latestDate}T00:00:00`);
  if (Number.isNaN(nextDate.getTime())) return getUpcomingSaturdayIso();

  // Maju per minggu hingga menemukan tanggal yang belum terpakai.
  do {
    nextDate.setDate(nextDate.getDate() + 7);
  } while (dates.has(toIsoDate(nextDate)));
  return toIsoDate(nextDate);
}

/** Membuka form tambah data SS/Khotbah; tanggal diisi otomatis. */
function openSabbathTableAddModal(tableKey) {
  const title = document.getElementById('sabbath-table-add-title');
  const fieldsContainer = document.getElementById('sabbath-table-add-fields');
  const form = document.getElementById('sabbath-table-add-form');
  if (!title || !fieldsContainer || !form) return;

  const config = getSabbathTableConfig(tableKey);
  const fieldIcons = {
    date: "fa-calendar-day",
    pemimpin_acara: "fa-user",
    lagu_buka: "fa-music",
    ayat_inti_doa_buka: "fa-book-bible",
    mission: "fa-earth-asia",
    diskusi_orang_muda: "fa-people-group",
    diskusi_orang_tua: "fa-people-group",
    diskusi_gabungan: "fa-people-group",
    lagu_pujian: "fa-music",
    lagu_tutup: "fa-music",
    pp: "fa-hand-holding-heart",
    diakon_es: "fa-handshake-angle",
    cerita_anak: "fa-child-reaching",
    mc_ayat_bersahutan: "fa-microphone",
    doa_syafaat: "fa-hands-praying",
    bacaan_persembahan: "fa-book-open",
    doa_persembahan: "fa-hands-praying",
    ayat_inti_visi_misi: "fa-book-bible",
    pengkhotbah: "fa-person-chalkboard",
    judul: "fa-heading",
    doa_tutup: "fa-hands-praying"
  };
  title.textContent = `Tambah Data ${tableKey === 'ss' ? 'Sekolah Sabat' : 'Khotbah'}`;
  form.dataset.tableKey = tableKey;
  delete form.dataset.editId;
  fieldsContainer.innerHTML = getSabbathFormFields(tableKey).map(([key, label]) => `
    <div class="form-group">
      <label class="form-label" for="sabbath-field-${key}">${escapeHtml(label)}</label>
      <div class="input-with-icon">
        <i class="input-icon fa-solid ${fieldIcons[key] || 'fa-pen-to-square'}" aria-hidden="true"></i>
        <input id="sabbath-field-${key}" name="${key}" type="${key === 'date' ? 'date' : 'text'}" class="form-input-styled" ${key === 'date' ? 'required' : ''}>
      </div>
    </div>
  `).join('');
  const dateInput = form.querySelector('[name="date"]');
  if (dateInput) dateInput.value = getNextSabbathTableDate(config.rows);
  openModal('modal-sabbath-table-add');
}

/** Membuka form yang sama dalam mode edit dengan data baris terisi. */
function openSabbathTableEditModal(tableKey, id) {
  const config = getSabbathTableConfig(tableKey);
  const row = config.rows.find(item => String(item.id) === String(id));
  if (!row) return;

  openSabbathTableAddModal(tableKey);
  const form = document.getElementById('sabbath-table-add-form');
  const title = document.getElementById('sabbath-table-add-title');
  if (!form || !title) return;

  form.dataset.editId = id;
  title.textContent = `Edit Data ${tableKey === 'ss' ? 'Sekolah Sabat' : 'Khotbah'}`;
  getSabbathFormFields(tableKey).forEach(([key]) => {
    const input = form.querySelector(`[name="${key}"]`);
    if (input) input.value = row[key] || '';
  });
}

/** Menyimpan form SS/Khotbah (insert atau update) lalu merender ulang tabel dan susunan. */
async function handleSaveSabbathTableEntry(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const tableKey = form.dataset.tableKey;
  const config = getSabbathTableConfig(tableKey);
  const payload = {};

  getSabbathFormFields(tableKey).forEach(([key]) => {
    const input = form.querySelector(`[name="${key}"]`);
    payload[key] = input ? input.value.trim() : '';
  });

  initSupabaseClient();
  if (!supabaseClient) return;
  try {
    const editId = form.dataset.editId;
    const query = editId
      ? supabaseClient.from(config.table).update(payload).eq('id', editId).select()
      : supabaseClient.from(config.table).insert([payload]).select();
    const { data, error } = await query;
    if (error) throw error;
    if (data?.[0]) {
      const rowIndex = config.rows.findIndex(row => String(row.id) === String(editId));
      if (rowIndex >= 0) config.rows[rowIndex] = data[0];
      else config.rows.unshift(data[0]);
    }
    closeModal('modal-sabbath-table-add');
    renderSabbathDatabaseTable(tableKey, config.rows, config.columns);
    applySabbathDatabaseRows();
  } catch (error) {
    showToast(`Gagal menyimpan data: ${error.message}`, 'fa-solid fa-triangle-exclamation');
  }
}

/** Meminta konfirmasi sebelum menghapus satu baris SS/Khotbah. */
function deleteSabbathTableEntry(tableKey, id) {
  const config = getSabbathTableConfig(tableKey);
  const row = config.rows.find(item => String(item.id) === String(id));
  if (!row) return;

  const tableName = tableKey === "ss" ? "Tabel SS" : "Tabel Khotbah";
  const date = getSabbathTableValue(row, "date");
  openDeleteConfirmation({
    subtitle: tableName,
    message: `Hapus data${date && date !== "-" ? ` tanggal ${formatDateIndo(date)}` : ""} dari ${tableName}?`,
    description: "Data ini akan dihapus dari database server Supabase.",
    onConfirm: () => performDeleteSabbathTableEntry(tableKey, id)
  });
}

/** Menghapus baris SS/Khotbah di Supabase dan memperbarui tampilan. */
async function performDeleteSabbathTableEntry(tableKey, id) {
  const config = getSabbathTableConfig(tableKey);
  initSupabaseClient();
  if (!supabaseClient) {
    showDeleteResult(false, "Supabase belum terhubung. Data tidak dihapus.");
    return;
  }

  try {
    const { error } = await supabaseClient.from(config.table).delete().eq('id', id);
    if (error) throw error;
    const rowIndex = config.rows.findIndex(row => String(row.id) === String(id));
    if (rowIndex >= 0) config.rows.splice(rowIndex, 1);
    renderSabbathDatabaseTable(tableKey, config.rows, config.columns);
    applySabbathDatabaseRows();
    showDeleteResult(true, `Data dari ${config.table} berhasil dihapus.`);
  } catch (error) {
    showDeleteResult(false, `Data gagal dihapus: ${error.message}`);
  }
}

// ------------------------------------------
// Menerapkan data tabel & override ke Susunan Ibadah
// ------------------------------------------

/** Tanggal Sabtu terdekat dalam format ISO (YYYY-MM-DD); dipakai mencocokkan baris tabel. */
function getUpcomingSaturdayIso() {
  return toIsoDate(getUpcomingWorshipDate(6));
}

/**
 * Membaca tanggal dari teks date_display (mis. "Sabtu, 10 Oktober 2026").
 * @returns {Date|null} null bila tidak dapat dibaca.
 */
function getOverrideDate(dateDisplay) {
  const match = String(dateDisplay || "").match(/\b(\d{1,2})\s+([a-z]+)\s+(\d{4})\b/i);
  if (!match) return null;

  const monthIndex = [
    "januari", "februari", "maret", "april", "mei", "juni",
    "juli", "agustus", "september", "oktober", "november", "desember"
  ].indexOf(match[2].toLowerCase());
  if (monthIndex < 0) return null;

  const date = new Date(Number(match[3]), monthIndex, Number(match[1]));
  if (date.getFullYear() !== Number(match[3]) || date.getMonth() !== monthIndex || date.getDate() !== Number(match[1])) {
    return null;
  }
  return date;
}

/** Menghapus override bertanggal lampau dari Supabase (hanya dijalankan oleh admin yang login). */
async function removeExpiredWorshipOverrides() {
  if (!isAdminLoggedIn || !supabaseClient) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiredRows = worshipOverrideRows.filter(row => {
    if (!["sabat", "rabu", "pa"].includes(row.program_type)) return false;
    const overrideDate = getOverrideDate(row.date_display);
    return overrideDate && overrideDate < today;
  });
  if (expiredRows.length === 0) return;

  const { error } = await supabaseClient.from("Tabel Override Susunan")
    .delete()
    .in("id", expiredRows.map(row => row.id));
  if (error) {
    showToast(`Override lama gagal dibersihkan: ${error.message}`, "fa-solid fa-triangle-exclamation");
    return;
  }

  const expiredIds = new Set(expiredRows.map(row => String(row.id)));
  worshipOverrideRows = worshipOverrideRows.filter(row => !expiredIds.has(String(row.id)));
}

/** Mencari baris tabel yang tanggalnya sama dengan Sabtu terdekat. */
function getUpcomingSabbathRow(rows) {
  if (!rows || rows.length === 0) return null;
  const targetDate = getUpcomingSaturdayIso();
  return rows.find(row => row.date === targetDate) || null;
}

/** Mengisi nomor lagu dari teks tabel (mis. "LSEL No. 12" menjadi "12"); teks kosong atau mengandung "kosong" mengosongkan lagu. */
function setSabbathSong(item, value) {
  const songValue = String(value || '');
  if (!songValue || /kosong/i.test(songValue)) {
    item.songNo = '';
    item.songTitle = '';
    return;
  }

  item.songNo = songValue.replace(/^.*?No\.\s*/i, '').trim();
  item.songTitle = '';
}

/**
 * Menyusun ulang worshipData dari data terkini lalu merender kedua program.
 * Urutan prioritas: kerangka dasar -> Tabel Pianis -> Tabel SS -> Tabel Khotbah (+ lagu paten) -> override tanggal tersebut.
 * Indeks `ssItems[n]` / `khotbahItems[n]` mengikuti urutan baris di defaultWorshipData.
 */
function applySabbathDatabaseRows() {
  const ssRow = getUpcomingSabbathRow(ssScheduleList);
  const khotbahRow = getUpcomingSabbathRow(khotbahScheduleList);
  const targetSabbath = getUpcomingSaturdayIso();
  const currentPianist = posScheduleList.find(row => row.date === targetSabbath);
  const sabatOverride = worshipOverrideRows.find(row =>
    row.program_type === "sabat" && row.date_display === formatWorshipDate(new Date(`${targetSabbath}T00:00:00`))
  );
  const wednesdayDate = getUpcomingWorshipDate(3);
  const rabuOverride = worshipOverrideRows.find(row =>
    row.program_type === "rabu" && row.date_display === `${formatWorshipDate(wednesdayDate)} | 19.00 WIB`
  );

  worshipData["sabat-raya"] = JSON.parse(JSON.stringify(defaultWorshipData["sabat-raya"]));
  worshipData["rabu-malam"] = JSON.parse(JSON.stringify(defaultWorshipData["rabu-malam"]));
  const sabat = worshipData["sabat-raya"];
  sabat.generalInfo = [{ key: "Pianis", value: currentPianist?.pianist || "-" }];
  sabat.sections.forEach(section => section.items.forEach(item => {
    item.officer = "";
    item.songNo = "";
    item.songTitle = "";
    if (item.sermonTitle !== undefined) item.sermonTitle = "";
    item.subItems?.forEach(subItem => { subItem.officer = ""; });
  }));

  const ssItems = sabat.sections[0]?.items || [];
  const khotbahItems = sabat.sections[1]?.items || [];
  const hasSabbathSchedule = Boolean(sabatOverride || ssRow || khotbahRow);

  if (ssRow) {
    if (ssItems[0]) ssItems[0].officer = ssRow.pemimpin_acara || '';
    if (ssItems[1]) setSabbathSong(ssItems[1], ssRow.lagu_buka);
    if (ssItems[2]) ssItems[2].officer = ssRow.ayat_inti_doa_buka || '';
    if (ssItems[3]) ssItems[3].officer = ssRow.mission || '';
    if (ssItems[4]?.subItems) {
      ssItems[4].subItems[0].officer = ssRow.diskusi_orang_muda || '';
      ssItems[4].subItems[1].officer = ssRow.diskusi_orang_tua || '';
    }
    if (ssItems[5]) ssItems[5].officer = ssRow.lagu_pujian || '';
    if (ssItems[6]) ssItems[6].officer = ssRow.pp || '';
    if (ssItems[7]) setSabbathSong(ssItems[7], ssRow.lagu_tutup);
    if (ssItems[8]) ssItems[8].officer = ssRow.diakon_es || '';
    if (ssItems[9]) ssItems[9].officer = ssRow.cerita_anak || '';
  }

  // Lagu paten ditetapkan langsung di kode (tidak lagi diambil dari Supabase)
  if (hasSabbathSchedule) {
    if (khotbahItems[0]) setSabbathSong(khotbahItems[0], '515');    // Lagu Pengiring Partisipan Mimbar - paten
    if (khotbahItems[1]) setSabbathSong(khotbahItems[1], '1');      // Lagu Sambutan - paten
  }

  if (khotbahRow) {
    if (khotbahItems[2]) khotbahItems[2].officer = khotbahRow.mc_ayat_bersahutan || '';
    if (khotbahItems[3]) setSabbathSong(khotbahItems[3], khotbahRow.lagu_buka);
    if (khotbahItems[4]) khotbahItems[4].officer = khotbahRow.doa_syafaat || '';
    if (khotbahItems[5]) khotbahItems[5].officer = khotbahRow.bacaan_persembahan || '';
    if (khotbahItems[6]) setSabbathSong(khotbahItems[6], '260');   // Lagu Persembahan - paten
    if (khotbahItems[7]) setSabbathSong(khotbahItems[7], '21');    // Lagu Persembahan Lanjutan - paten
    if (khotbahItems[8]) khotbahItems[8].officer = khotbahRow.doa_persembahan || '';
    if (khotbahItems[9]) khotbahItems[9].officer = khotbahRow.lagu_pujian || '';
    if (khotbahItems[10]) khotbahItems[10].officer = khotbahRow.ayat_inti_visi_misi || '';
    if (khotbahItems[11]) khotbahItems[11].officer = 'Misi Kita';  // Lagu Tema - paten
    if (khotbahItems[12]) {
      khotbahItems[12].officer = khotbahRow.pengkhotbah || '';
      khotbahItems[12].sermonTitle = khotbahRow.judul || '';
    }
    if (khotbahItems[13]) setSabbathSong(khotbahItems[13], khotbahRow.lagu_tutup);
    if (khotbahItems[14]) khotbahItems[14].officer = khotbahRow.doa_tutup || '';
  }

  if (sabatOverride) {
    const overrideData = convertOverrideRow(sabatOverride);
    if (overrideData) {
      const hasPianist = overrideData.generalInfo.some(info => /pianis|pianist/i.test(info.key));
      if (!hasPianist && sabat.generalInfo.length) {
        overrideData.generalInfo.unshift(...sabat.generalInfo);
      }
      worshipData["sabat-raya"] = overrideData;
    }
  }
  if (rabuOverride) {
    const overrideData = convertOverrideRow(rabuOverride);
    if (overrideData) {
      overrideData.notes = defaultWorshipData["rabu-malam"].notes;
      worshipData["rabu-malam"] = overrideData;
    }
  }
  worshipAvailability["sabat-raya"] = true;
  worshipAvailability["rabu-malam"] = true;
  renderSubTab("sabat-raya");
  renderSubTab("rabu-malam");
}

/**
 * Membuka hasil Promise.allSettled dari satu kueri Supabase.
 * @returns {Array|null} Baris data, atau null bila kueri gagal (galat dicatat ke console).
 */
function unwrapSettledResult(result, label) {
  if (result.status === "fulfilled" && !result.value.error) return result.value.data || [];
  const message = result.status === "fulfilled" ? result.value.error.message : result.reason?.message;
  console.warn(`Supabase fetch ${label} error:`, message);
  return null;
}

/** Memuat Tabel SS, Tabel Khotbah, dan Tabel Override secara paralel, membersihkan override kedaluwarsa, lalu menerapkannya ke susunan. */
async function fetchSabbathProgramData() {
  initSupabaseClient();
  if (!supabaseClient) {
    worshipAvailability = { "sabat-raya": true, "rabu-malam": true };
    applySabbathDatabaseRows();
    return;
  }

  const [ssResult, khotbahResult, overrideResult] = await Promise.allSettled([
    supabaseClient.from("Tabel SS").select("*").order("date", { ascending: false }),
    supabaseClient.from("Tabel Khotbah").select("*").order("date", { ascending: false }),
    supabaseClient.from("Tabel Override Susunan").select("*").order("updated_at", { ascending: false })
  ]);

  const ssRows = unwrapSettledResult(ssResult, "Tabel SS");
  ssScheduleList = ssRows || [];
  renderSabbathDatabaseTable("ss", ssScheduleList, ssTableColumns, ssRows ? undefined : "Tabel SS belum dapat dimuat.");

  const khotbahRows = unwrapSettledResult(khotbahResult, "Tabel Khotbah");
  khotbahScheduleList = khotbahRows || [];
  renderSabbathDatabaseTable("khotbah", khotbahScheduleList, khotbahTableColumns, khotbahRows ? undefined : "Tabel Khotbah belum dapat dimuat.");

  worshipOverrideRows = unwrapSettledResult(overrideResult, "Tabel Override Susunan") || [];

  await removeExpiredWorshipOverrides();
  applySabbathDatabaseRows();
}

/** Mengisi Informasi Umum "Pianis" susunan Sabat dari jadwal Pianis untuk Sabtu terdekat. */
function syncNearestPosToWorship() {
  if (!posScheduleList || posScheduleList.length === 0) return;

  const targetDate = getUpcomingSaturdayIso();
  const current = posScheduleList.find(item => item.date === targetDate);
  if (current && worshipData && worshipData["sabat-raya"]) {
    worshipData["sabat-raya"].generalInfo = [
      { key: "Pianis", value: current.pianist }
    ];
    renderSubTab("sabat-raya");
  }
}

// ------------------------------------------
// Tabel Pianis (POS): render, urut, cari, geser, tambah/ubah/hapus
// ------------------------------------------

/** Merender tabel jadwal Pianis (pencarian + pengurutan + penghitung baris). */
function renderPosTable() {
  const tbody = document.getElementById("pos-table-body");
  const countDisp = document.getElementById("pos-count-displayed");
  const countTotal = document.getElementById("pos-count-total");
  if (!tbody) return;

  let filtered = posScheduleList.filter(item => {
    if (!posSearchQuery) return true;
    const q = posSearchQuery.toLowerCase();
    return (item.date && item.date.toLowerCase().includes(q)) ||
      (item.pianist && item.pianist.toLowerCase().includes(q));
  });

  filtered.sort((a, b) => {
    let valA = a[posSortField] || "";
    let valB = b[posSortField] || "";
    if (posSortField === "date") {
      valA = new Date(valA).getTime() || 0;
      valB = new Date(valB).getTime() || 0;
    } else {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }
    if (valA < valB) return posSortAsc ? -1 : 1;
    if (valA > valB) return posSortAsc ? 1 : -1;
    return 0;
  });

  if (countDisp) countDisp.textContent = filtered.length;
  if (countTotal) countTotal.textContent = posScheduleList.length;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align: center; padding: 40px 16px; color: var(--text-muted);">
          <i class="fa-solid fa-calendar-xmark" style="font-size: 1.8rem; margin-bottom: 10px; display: block; opacity: 0.5;"></i>
          Tidak ada data jadwal POS yang sesuai dengan pencarian.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(item => `
    <tr>
      <td>
        <span class="td-date-badge">${formatDateIndo(item.date)}</span>
      </td>
      <td class="td-officer">${escapeHtml(item.pianist)}</td>
      <td class="th-actions">
        <div class="td-actions-wrap">
          <button class="btn-table-edit" onclick="openEditPosModal('${item.id}')" title="Edit Jadwal">Edit</button>
          <button class="btn-table-delete" onclick="openDeletePosModal('${item.id}')" title="Hapus Jadwal">Hapus</button>
        </div>
      </td>
    </tr>
  `).join("");
}

/** Mengubah "YYYY-MM-DD" menjadi "DD-MM-YYYY" untuk tampilan; nilai lain dikembalikan apa adanya. */
function formatDateIndo(dateStr) {
  if (!dateStr) return "-";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr));
  return match ? `${match[3]}-${match[2]}-${match[1]}` : String(dateStr);
}

/** Mengurutkan tabel POS berdasarkan kolom dan memperbarui ikon panah. */
function sortPosTable(field) {
  if (posSortField === field) {
    posSortAsc = !posSortAsc;
  } else {
    posSortField = field;
    posSortAsc = (field !== "date");
  }

  const fields = ["date", "pianist"];
  fields.forEach(f => {
    const icon = document.getElementById(`sort-icon-${f}`);
    if (icon) {
      if (f === posSortField) {
        icon.className = posSortAsc
          ? "fa-solid fa-sort-up th-sort-icon text-navy"
          : "fa-solid fa-sort-down th-sort-icon text-navy";
      } else {
        icon.className = "fa-solid fa-sort th-sort-icon";
      }
    }
  });

  renderPosTable();
}

/** Menerapkan pencarian pada tabel POS. */
function filterPosTable() {
  const input = document.getElementById("pos-table-search");
  const clearBtn = document.getElementById("pos-search-clear");
  if (input) {
    posSearchQuery = input.value.trim();
    if (clearBtn) clearBtn.style.display = posSearchQuery ? "block" : "none";
  }
  renderPosTable();
}

/** Mengosongkan pencarian tabel POS. */
function clearPosSearch() {
  const input = document.getElementById("pos-table-search");
  const clearBtn = document.getElementById("pos-search-clear");
  if (input) input.value = "";
  if (clearBtn) clearBtn.style.display = "none";
  posSearchQuery = "";
  renderPosTable();
}

/** Menggeser semua tanggal Tabel Pianis sebanyak 7 hari (hanya baris ber-id UUID). */
async function shiftPosWeek(direction, confirmed = false) {
  if (!confirmed) {
    openWeekShiftConfirm("pos", null, direction);
    return;
  }

  if (posScheduleList.length === 0) {
    showToast("Tidak ada jadwal di Tabel Pianis untuk digeser.", "fa-solid fa-triangle-exclamation text-amber");
    return;
  }
  initSupabaseClient();
  if (!supabaseClient) {
    showToast("Gagal menggeser jadwal Tabel Pianis: Supabase belum terhubung.", "fa-solid fa-triangle-exclamation text-amber");
    return;
  }

  const updatedRows = posScheduleList.map(item => ({ ...item, date: shiftIsoDate(item.date, -direction * 7) }));

  try {
    const results = await Promise.all(updatedRows.map(item => {
      const isUUID = isUuid(item.id);
      if (!isUUID) {
        return Promise.resolve({ error: new Error(`ID jadwal ${item.id} tidak valid.`) });
      }
      return supabaseClient.from("Tabel Pianis").update({ date: item.date }).eq("id", item.id);
    }));
    const failedResult = results.find(result => result.error);
    if (failedResult?.error) throw failedResult.error;

    posScheduleList = updatedRows;
    syncNearestPosToWorship();
    renderPosTable();
    const action = direction > 0 ? "dimajukan" : "dimundurkan";
    const offset = direction > 0 ? "-7" : "+7";
    showToast(`Semua jadwal Tabel Pianis berhasil ${action} (${offset} hari).`, "fa-solid fa-calendar-check text-gold");
  } catch (error) {
    console.warn("Supabase shift pos error:", error);
    await fetchPosFromSupabase();
    showToast(`Gagal menggeser jadwal Tabel Pianis: ${error.message}`, "fa-solid fa-triangle-exclamation text-amber");
  }
}

/** Membuka form tambah jadwal Pianis; tanggal diisi satu minggu setelah jadwal terakhir. */
function openAddPosModal() {
  const form = document.getElementById("pos-add-form");
  if (form) form.reset();

  const dateInput = document.getElementById("pos-add-date");
  if (dateInput && posScheduleList.length > 0) {
    // Isi otomatis dengan satu minggu setelah jadwal terakhir.
    const latest = [...posScheduleList].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const nextDate = shiftIsoDate(latest.date, 7);
    if (nextDate !== latest.date) dateInput.value = nextDate;
  }

  openModal("modal-pos-add");
}

/** Menambah jadwal Pianis: langsung tampil (optimistis dengan id sementara), lalu disimpan ke Supabase. */
async function handleSaveNewPos(e) {
  e.preventDefault();
  const dateInput = document.getElementById("pos-add-date");
  const pianistInput = document.getElementById("pos-add-pianist");

  const tempId = "pos-" + Date.now();
  const newItem = {
    id: tempId,
    date: dateInput ? dateInput.value : "",
    pianist: pianistInput ? pianistInput.value.trim() : ""
  };

  posScheduleList.unshift(newItem);
  syncNearestPosToWorship();
  closeModal("modal-pos-add");
  renderPosTable();
  showToast(`Menyimpan jadwal tanggal ${newItem.date}...`, "fa-solid fa-spinner fa-spin text-gold");

  // Sinkronkan ke Supabase
  initSupabaseClient();
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from("Tabel Pianis").insert([{
        date: newItem.date,
        pianist: newItem.pianist
      }]).select();

      if (error) {
        console.error("Supabase insert pos error:", error);
        showToast(`Gagal menyimpan ke Supabase: ${error.message}`, "fa-solid fa-triangle-exclamation text-amber");
      } else if (data && data[0]) {
        newItem.id = data[0].id;
        syncNearestPosToWorship();
        renderPosTable();
        showToast(`Jadwal POS ${newItem.date} tersimpan di Supabase & Web!`, "fa-solid fa-circle-check text-emerald");
      }
    } catch (err) {
      console.error("Supabase insert pos exception:", err);
    }
  } else {
    showToast(`Jadwal POS tanggal ${newItem.date} berhasil ditambahkan!`, "fa-solid fa-circle-check text-emerald");
  }
}

/** Membuka form ubah jadwal Pianis dengan data terisi. */
function openEditPosModal(id) {
  const item = posScheduleList.find(p => String(p.id) === String(id));
  if (!item) return;

  const idInput = document.getElementById("pos-edit-id");
  const dateInput = document.getElementById("pos-edit-date");
  const pianistInput = document.getElementById("pos-edit-pianist");

  if (idInput) idInput.value = item.id;
  if (dateInput) dateInput.value = item.date;
  if (pianistInput) pianistInput.value = item.pianist;

  openModal("modal-pos-edit");
}

/** Menyimpan perubahan jadwal Pianis ke tampilan dan Supabase. */
async function handleUpdatePos(e) {
  e.preventDefault();
  const idInput = document.getElementById("pos-edit-id");
  const dateInput = document.getElementById("pos-edit-date");
  const pianistInput = document.getElementById("pos-edit-pianist");

  const targetId = idInput ? idInput.value : "";
  const index = posScheduleList.findIndex(p => String(p.id) === String(targetId));

  if (index !== -1) {
    const oldItem = { ...posScheduleList[index] };
    posScheduleList[index] = {
      id: targetId,
      date: dateInput ? dateInput.value : posScheduleList[index].date,
      pianist: pianistInput ? pianistInput.value.trim() : ""
    };

    syncNearestPosToWorship();
    closeModal("modal-pos-edit");
    renderPosTable();
    showToast(`Memperbarui jadwal tanggal ${posScheduleList[index].date}...`, "fa-solid fa-spinner fa-spin text-gold");

    // Sinkronkan ke Supabase
    initSupabaseClient();
    if (supabaseClient) {
      try {
        let query = supabaseClient.from("Tabel Pianis").update({
          date: posScheduleList[index].date,
          pianist: posScheduleList[index].pianist
        });

        const isUUID = isUuid(targetId);
        if (isUUID) {
          query = query.eq("id", targetId);
        } else {
          query = query.eq("date", oldItem.date);
        }

        const { error } = await query;
        if (error) {
          console.error("Supabase update pos error:", error);
          showToast(`Gagal menyimpan ke Supabase: ${error.message}`, "fa-solid fa-triangle-exclamation text-amber");
        } else {
          showToast(`Jadwal POS ${posScheduleList[index].date} diperbarui di Supabase & Web!`, "fa-solid fa-circle-check text-emerald");
        }
      } catch (err) {
        console.error("Supabase update pos exception:", err);
      }
    }
  }
}

/** Membuka konfirmasi hapus jadwal Pianis. */
function openDeletePosModal(id) {
  const item = posScheduleList.find(p => String(p.id) === String(id));
  if (!item) return;

  const idInput = document.getElementById("pos-delete-id");
  const dateText = document.getElementById("pos-delete-date-text");

  if (idInput) idInput.value = item.id;
  if (dateText) dateText.textContent = item.date;

  openModal("modal-pos-delete");
}

/** Menghapus jadwal Pianis di Supabase lalu memperbarui tampilan. */
async function confirmDeletePos() {
  const idInput = document.getElementById("pos-delete-id");
  const targetId = idInput ? idInput.value : "";
  const index = posScheduleList.findIndex(p => String(p.id) === String(targetId));
  if (index === -1) return;

  const deletedItem = posScheduleList[index];
  const deletedDate = deletedItem.date;
  closeModal("modal-pos-delete");
  initSupabaseClient();
  if (!supabaseClient) {
    showDeleteResult(false, "Supabase belum terhubung. Jadwal tidak dihapus.");
    return;
  }

  try {
    let query = supabaseClient.from("Tabel Pianis").delete();
    const isUUID = isUuid(targetId);
    if (isUUID) {
      query = query.eq("id", targetId);
    } else {
      query = query.eq("date", deletedDate);
    }

    const { error } = await query;
    if (error) throw error;

    posScheduleList.splice(index, 1);
    syncNearestPosToWorship();
    renderPosTable();
    showDeleteResult(true, `Jadwal POS tanggal ${deletedDate} berhasil dihapus.`);
  } catch (error) {
    console.error("Supabase delete pos exception:", error);
    showDeleteResult(false, `Gagal menghapus jadwal dari Supabase: ${error.message}`);
  }
}

// ==========================================
// 17. DIREKTORI JEMAAT & PENGURUS
// Kontak dimuat dari Tabel Direktori; admin mengelola lewat tabel, publik melihat lewat kartu.
// ==========================================

/** Kontak direktori hasil fetchDirectoryFromSupabase(): [{ id, category, name, role, phone, show_in_prayer, avatarIcon }]. */
let directoryList = [];
/** Kolom pengurutan tabel direktori admin. */
let dirSortField = "category";
/** Arah pengurutan tabel direktori (true = menaik). */
let dirSortAsc = true;
/** Kata kunci pencarian tabel direktori admin. */
let dirSearchQuery = "";
/** Filter kategori tabel direktori admin ("" = semua). */
let dirCategoryFilter = "";

/** Menyegarkan tampilan publik yang bergantung pada directoryList: grid direktori & modal doa. */
function refreshDirectoryViews() {
  renderPublicDirectory();
  renderPrayerModal();
}

/** Data lama memakai kategori "majelis_anggota"; seluruh kode kini memakai "majelis_dept". */
function normalizeDirectoryCategory(category) {
  return category === "majelis_anggota" ? "majelis_dept" : category;
}

/** Memilih ikon Font Awesome avatar berdasarkan kata kunci pada jabatan; jika tak cocok, memakai ikon kategori. */
function getDirectoryAvatarIcon(category, role) {
  const normalizedCategory = normalizeDirectoryCategory(category);
  const normalizedRole = String(role || "").toLowerCase();
  const roleIconRules = [
    { keywords: ["sekolah sabat", "sabbath school", "departemen ss", "dept ss", "ss/pp", "ss/pa"], icon: "fa-book-open" },
    { keywords: ["pelayanan anak", "departemen pa", "pemimpin departemen pa"], icon: "fa-people-group" },
    { keywords: ["pianis", "musik", "paduan suara", "vokalis", "pelayanan lagu", "organis"], icon: "fa-music" },
    { keywords: ["sekretaris", "administrasi"], icon: "fa-file-signature" },
    { keywords: ["bendahara", "keuangan", "kasir"], icon: "fa-vault" },
    { keywords: ["kesehatan", "health"], icon: "fa-heart-pulse" },
    { keywords: ["bakti wanita", "wanita", "bwa"], icon: "fa-person-dress" },
    { keywords: ["komunikasi", "teknologi informasi", " it"], icon: "fa-laptop-code" },
    { keywords: ["public campus", "pcm", "kampus"], icon: "fa-graduation-cap" },
    { keywords: ["adventurer", "penjelajah"], icon: "fa-compass" },
    { keywords: ["pembangunan", "pengadaan", "renovasi", "rumah ibadah"], icon: "fa-hammer" },
    { keywords: ["pemuda advent", "pemuda"], icon: "fa-people-group" },
    { keywords: ["penginjilan", "evangelisasi", "misionaris"], icon: "fa-bullhorn" },
    { keywords: ["diaken", "diakones", "doa", "kerohanian"], icon: "fa-hands-praying" },
    { keywords: ["pendeta", "gembala"], icon: "fa-crown" }
  ];
  const matchingRule = roleIconRules.find(rule =>
    rule.keywords.some(keyword => normalizedRole.includes(keyword))
  );
  if (matchingRule) return matchingRule.icon;

  const categoryIcons = {
    gembala: "fa-crown",
    officers: "fa-user-shield",
    majelis_dept: "fa-users"
  };
  return categoryIcons[normalizedCategory] || "fa-user-shield";
}

/** true bila kontak berkategori "gembala" (Pendeta). */
function isPastorContact(item) {
  return item.category === "gembala";
}

/** Kemiripan dua teks (0–1) berdasar jarak Levenshtein; dipakai untuk mengenali jabatan yang salah ketik. */
function getOfficerRoleSimilarity(first, second) {
  const previousRow = Array.from({ length: second.length + 1 }, (_, index) => index);

  for (let firstIndex = 1; firstIndex <= first.length; firstIndex++) {
    const currentRow = [firstIndex];
    for (let secondIndex = 1; secondIndex <= second.length; secondIndex++) {
      const substitutionCost = first[firstIndex - 1] === second[secondIndex - 1] ? 0 : 1;
      currentRow[secondIndex] = Math.min(
        currentRow[secondIndex - 1] + 1,
        previousRow[secondIndex] + 1,
        previousRow[secondIndex - 1] + substitutionCost
      );
    }
    previousRow.splice(0, previousRow.length, ...currentRow);
  }

  const longestLength = Math.max(first.length, second.length);
  return longestLength === 0 ? 1 : 1 - previousRow[second.length] / longestLength;
}

/**
 * Urutan tampil Officers: Ketua Jemaat 1, Ketua Jemaat 2, Sekretaris, Bendahara, Asisten Bendahara.
 * Pencocokan toleran (angka Romawi/kata, salah ketik kecil). @returns {number} 0–4, atau Infinity bila tidak cocok (diurutkan terakhir).
 */
function getOfficerRoleOrder(role) {
  const normalizedRole = String(role || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(?:satu|pertama|i)\b/g, "1")
    .replace(/\b(?:dua|kedua|ii)\b/g, "2")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const roleWords = normalizedRole.split(/\s+/).filter(Boolean);
  const expectedRoles = [
    "ketua jemaat 1",
    "ketua jemaat 2",
    "sekretaris",
    "bendahara",
    "asisten bendahara"
  ];

  const similarities = expectedRoles.map(expectedRole => {
    const expectedWords = expectedRole.split(" ");
    const minWindowSize = Math.max(1, expectedWords.length - 1);
    const maxWindowSize = Math.min(roleWords.length, expectedWords.length + 1);
    let bestSimilarity = 0;

    for (let windowSize = minWindowSize; windowSize <= maxWindowSize; windowSize++) {
      for (let start = 0; start <= roleWords.length - windowSize; start++) {
        const rolePhrase = roleWords.slice(start, start + windowSize).join(" ");
        bestSimilarity = Math.max(bestSimilarity, getOfficerRoleSimilarity(rolePhrase, expectedRole));
      }
    }

    return bestSimilarity;
  });

  let bestOrder = 0;
  for (let order = 1; order < similarities.length; order++) {
    if (similarities[order] > similarities[bestOrder]) bestOrder = order;
  }

  if (similarities[bestOrder] < 0.72) return Number.POSITIVE_INFINITY;
  if (bestOrder < 2 && Math.abs(similarities[0] - similarities[1]) < 0.05) {
    return Number.POSITIVE_INFINITY;
  }
  return bestOrder;
}

/**
 * Jumlah kontak non-Pendeta yang tampil di Permohonan Doa.
 * @param {*} [excludeId] Id yang diabaikan (saat mengedit kontak itu sendiri).
 */
function countSelectedPrayerContacts(excludeId = null) {
  return directoryList.filter(item =>
    !isPastorContact(item) &&
    item.show_in_prayer === true &&
    (excludeId === null || String(item.id) !== String(excludeId))
  ).length;
}

/** Memuat Tabel Direktori, menormalkan kategori, lalu merender tabel admin, direktori publik, dan modal doa. */
async function fetchDirectoryFromSupabase() {
  initSupabaseClient();
  if (!supabaseClient) return;

  try {
    const { data, error } = await supabaseClient
      .from("Tabel Direktori")
      .select("*");

    if (error) {
      console.warn("Supabase fetch directory error:", error.message);
      renderDirectoryStatus("Direktori belum dapat dimuat dari Supabase.");
      return;
    }

    if (data && data.length > 0) {
      directoryList = data.map(row => {
        const category = normalizeDirectoryCategory(row.category);
        return {
          id: row.id,
          category,
          name: row.name,
          role: row.role,
          phone: row.phone || "",
          show_in_prayer: category === "gembala" || row.show_in_prayer === true,
          avatarIcon: getDirectoryAvatarIcon(category, row.role)
        };
      });
      refreshDirectoryViews();
      renderDirectoryTable();
    } else {
      renderDirectoryStatus("Belum ada data direktori yang tersedia.");
    }
  } catch (err) {
    console.warn("Error fetching directory from Supabase:", err);
    renderDirectoryStatus("Direktori belum dapat dimuat dari Supabase.");
  }
}

/** Menampilkan pesan status (mis. galat memuat) di direktori publik selama data belum ada. */
function renderDirectoryStatus(message) {
  const container = document.getElementById("directory-content");
  if (!container || directoryList.length > 0) return;

  container.innerHTML = `
    <div class="directory-loading" style="text-align: center; padding: 48px 16px; color: var(--text-muted);">
      <i class="fa-solid fa-circle-exclamation" style="font-size: 2rem; margin-bottom: 14px; display: block; color: var(--accent-gold);"></i>
      <span style="font-size: 0.95rem; font-weight: 500;">${escapeHtml(message)}</span>
    </div>
  `;
}

/** HTML badge kategori untuk tabel admin. */
function getCategoryBadge(cat) {
  switch (cat) {
    case "gembala":
      return '<span class="badge-cat badge-gembala"><i class="fa-solid fa-crown"></i> Pendeta</span>';
    case "officers":
      return '<span class="badge-cat badge-officers"><i class="fa-solid fa-user-shield"></i> Officers</span>';
    case "majelis_dept":
    case "majelis_anggota":
      return '<span class="badge-cat badge-majelis-dept"><i class="fa-solid fa-users"></i> Majelis Dept</span>';
    default:
      return `<span class="badge-cat">${escapeHtml(cat)}</span>`;
  }
}

/** Menormalkan nomor telepon untuk tautan wa.me (hanya angka; awalan 0 menjadi 62). */
function cleanPhoneForWa(phone) {
  if (!phone) return "";
  let clean = phone.replace(/[^0-9]/g, "");
  if (clean.startsWith("0")) {
    clean = "62" + clean.substring(1);
  }
  return clean;
}

/** Merender tabel direktori admin (filter kategori + pencarian + pengurutan, toggle kontak doa, tombol Edit/Hapus). */
function renderDirectoryTable() {
  const tbody = document.getElementById("directory-table-body");
  const countDisp = document.getElementById("dir-count-displayed");
  const countTotal = document.getElementById("dir-count-total");
  if (!tbody) return;

  const catFilterSelect = document.getElementById("directory-category-filter");
  if (catFilterSelect) dirCategoryFilter = catFilterSelect.value;

  let filtered = directoryList.filter(item => {
    const itemCat = normalizeDirectoryCategory(item.category);
    if (dirCategoryFilter && itemCat !== dirCategoryFilter) return false;
    if (!dirSearchQuery) return true;
    const q = dirSearchQuery.toLowerCase();
    return (item.name && item.name.toLowerCase().includes(q)) ||
      (item.role && item.role.toLowerCase().includes(q)) ||
      (item.phone && item.phone.toLowerCase().includes(q)) ||
      (itemCat && itemCat.toLowerCase().includes(q));
  });

  filtered.sort((a, b) => {
    let valA = (a[dirSortField] || "").toLowerCase();
    let valB = (b[dirSortField] || "").toLowerCase();
    if (valA < valB) return dirSortAsc ? -1 : 1;
    if (valA > valB) return dirSortAsc ? 1 : -1;
    return 0;
  });

  if (countDisp) countDisp.textContent = filtered.length;
  if (countTotal) countTotal.textContent = directoryList.length;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px 16px; color: var(--text-muted);">
          <i class="fa-solid fa-address-book" style="font-size: 1.8rem; margin-bottom: 10px; display: block; opacity: 0.5;"></i>
          Tidak ada data kontak direktori yang sesuai.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    const isPastor = isPastorContact(item);
    const isChecked = isPastor || item.show_in_prayer === true;
    const isDisabled = isPastor || (!isChecked && countSelectedPrayerContacts() >= MAX_PRAYER_CONTACTS);
    return `
    <tr>
      <td>${getCategoryBadge(item.category)}</td>
      <td style="font-weight: 700; color: var(--text-main);">${escapeHtml(item.name)}</td>
      <td class="td-officer">${escapeHtml(item.role)}</td>
      <td>
        ${item.phone
          ? `<a href="https://wa.me/${cleanPhoneForWa(item.phone)}" target="_blank" rel="noopener" style="color: #059669; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; font-family: monospace; font-size: 0.88rem;"><i class="fa-brands fa-whatsapp"></i> ${escapeHtml(item.phone)}</a>`
          : '<span style="color:var(--text-muted);">-</span>'}
      </td>
      <td style="text-align:center;">
        <label class="toggle-switch toggle-switch-sm" title="${isPastor ? 'Pendeta selalu tampil di layanan doa' : isDisabled ? 'Maks. 2 kontak doa sudah tercapai' : 'Tampilkan di layanan doa beranda'}">
          <input type="checkbox" ${isChecked ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}
            onchange="togglePrayerContact('${item.id}', this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </td>
      <td class="th-actions"><div class="td-actions-wrap">
        <button class="btn-table-edit" onclick="openEditDirectoryModal('${item.id}')" title="Edit Kontak">Edit</button>
        <button class="btn-table-delete" onclick="openDeleteDirectoryModal('${item.id}')" title="Hapus Kontak">Hapus</button>
      </div></td>
    </tr>`;
  }).join("");
}

/** Mengurutkan tabel direktori admin berdasarkan kolom dan memperbarui ikon panah. */
function sortDirectoryTable(field) {
  if (dirSortField === field) {
    dirSortAsc = !dirSortAsc;
  } else {
    dirSortField = field;
    dirSortAsc = true;
  }

  const fields = ["category", "name", "role", "phone"];
  fields.forEach(f => {
    const icon = document.getElementById(`sort-icon-dir-${f}`);
    if (icon) {
      icon.className = (f === dirSortField)
        ? (dirSortAsc ? "fa-solid fa-sort-up th-sort-icon text-navy" : "fa-solid fa-sort-down th-sort-icon text-navy")
        : "fa-solid fa-sort th-sort-icon";
    }
  });
  renderDirectoryTable();
}

/** Menerapkan pencarian pada tabel direktori admin. */
function filterDirectoryTable() {
  const input = document.getElementById("directory-table-search");
  const clearBtn = document.getElementById("directory-search-clear");
  if (input) {
    dirSearchQuery = input.value.trim();
    if (clearBtn) clearBtn.style.display = dirSearchQuery ? "block" : "none";
  }
  renderDirectoryTable();
}

/** Mengosongkan pencarian tabel direktori admin. */
function clearDirectorySearch() {
  const input = document.getElementById("directory-table-search");
  const clearBtn = document.getElementById("directory-search-clear");
  if (input) input.value = "";
  if (clearBtn) clearBtn.style.display = "none";
  dirSearchQuery = "";
  renderDirectoryTable();
}

/** Membuka form tambah kontak dengan status toggle kontak doa yang sesuai. */
function openAddDirectoryModal() {
  const form = document.getElementById("directory-add-form");
  if (form) form.reset();
  const addCategory = document.getElementById("dir-add-category");
  handleDirectoryCategoryChange("add", addCategory);
  openModal("modal-directory-add");
}

/** Mengganti ikon pada pilihan kategori sesuai nilai yang dipilih. */
function updateDirectoryCategoryIcon(select) {
  const icon = select.parentElement.querySelector(".category-field-icon");
  if (!icon) return;

  const iconByCategory = {
    gembala: "fa-crown",
    officers: "fa-user-shield",
    majelis_dept: "fa-users"
  };
  icon.className = `input-icon category-field-icon fa-solid ${iconByCategory[select.value] || "fa-address-card"}`;
}

/**
 * Saat kategori diubah: Pendeta otomatis tampil di doa (toggle terkunci); lainnya mengikuti batas MAX_PRAYER_CONTACTS.
 * @param {"add"|"edit"} mode Form yang sedang dipakai.
 */
function handleDirectoryCategoryChange(mode, select) {
  updateDirectoryCategoryIcon(select);
  const checkbox = document.getElementById(`dir-${mode}-show-in-prayer`);
  const message = document.getElementById(`dir-${mode}-prayer-limit-msg`);
  if (!checkbox) return;

  const isPastor = select.value === "gembala";
  const editId = mode === "edit" ? document.getElementById("dir-edit-id")?.value : null;
  if (isPastor) {
    checkbox.checked = true;
    checkbox.disabled = true;
    checkbox.dataset.autoCheckedForPastor = "true";
    if (message) message.style.display = "none";
    return;
  }

  if (checkbox.dataset.autoCheckedForPastor === "true") checkbox.checked = false;
  checkbox.dataset.autoCheckedForPastor = "false";
  checkbox.disabled = !checkbox.checked && countSelectedPrayerContacts(editId) >= MAX_PRAYER_CONTACTS;
  if (message) {
    message.style.display = checkbox.disabled ? "block" : "none";
    if (checkbox.disabled) message.textContent = PRAYER_LIMIT_MESSAGE;
  }
}

/** Menambah kontak: validasi batas kontak doa, tampil langsung (id sementara), lalu simpan ke Supabase. */
async function handleSaveNewDirectory(e) {
  e.preventDefault();
  const cat = document.getElementById("dir-add-category").value;
  const name = document.getElementById("dir-add-name").value.trim();
  const role = document.getElementById("dir-add-role").value.trim();
  const phone = document.getElementById("dir-add-phone").value.trim();

  const avatarIcon = getDirectoryAvatarIcon(cat, role);

  const tempId = "dir-" + Date.now();
  const showInPrayer = cat === "gembala" || document.getElementById("dir-add-show-in-prayer")?.checked === true;
  const newItem = { id: tempId, category: cat, name, role, phone, show_in_prayer: showInPrayer, avatarIcon };

  // Tegakkan batas kontak doa
  if (showInPrayer && cat !== "gembala") {
    if (countSelectedPrayerContacts() >= MAX_PRAYER_CONTACTS) {
      showToast("Maks. 2 kontak doa. Nonaktifkan salah satu dulu.", "fa-solid fa-triangle-exclamation");
      return;
    }
  }

  directoryList.push(newItem);
  refreshDirectoryViews();
  closeModal("modal-directory-add");
  renderDirectoryTable();
  showToast(`Menyimpan kontak ${name}...`, "fa-solid fa-spinner fa-spin text-gold");

  initSupabaseClient();
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from("Tabel Direktori").insert([{
        category: cat, name, role, phone: phone || null, avatar_icon: avatarIcon, show_in_prayer: newItem.show_in_prayer
      }]).select();

      if (error) {
        showToast(`Gagal menyimpan ke Supabase: ${error.message}`, "fa-solid fa-triangle-exclamation text-amber");
      } else if (data && data[0]) {
        newItem.id = data[0].id;
        refreshDirectoryViews();
        renderDirectoryTable();
        showToast(`Kontak ${name} (${role}) tersimpan di Supabase!`, "fa-solid fa-circle-check text-emerald");
      }
    } catch (err) {
      console.error("Supabase insert directory exception:", err);
    }
  }
}

/** Membuka form ubah kontak dengan data dan status toggle doa terisi. */
function openEditDirectoryModal(id) {
  const item = directoryList.find(d => String(d.id) === String(id));
  if (!item) return;

  document.getElementById("dir-edit-id").value = item.id;
  document.getElementById("dir-edit-category").value = normalizeDirectoryCategory(item.category);
  handleDirectoryCategoryChange("edit", document.getElementById("dir-edit-category"));
  document.getElementById("dir-edit-name").value = item.name;
  document.getElementById("dir-edit-role").value = item.role;
  document.getElementById("dir-edit-phone").value = item.phone || "";
  // Atur toggle kontak doa
  const editToggle = document.getElementById("dir-edit-show-in-prayer");
  const editMsg = document.getElementById("dir-edit-prayer-limit-msg");
  const isPastor = isPastorContact(item);
  const prayerCount = countSelectedPrayerContacts(id);
  if (editToggle) {
    editToggle.checked = isPastor || item.show_in_prayer === true;
    editToggle.disabled = isPastor || (!editToggle.checked && prayerCount >= MAX_PRAYER_CONTACTS);
    editToggle.dataset.autoCheckedForPastor = String(isPastor);
  }
  if (editMsg) {
    if (!isPastor && !item.show_in_prayer && prayerCount >= MAX_PRAYER_CONTACTS) {
      editMsg.textContent = PRAYER_LIMIT_MESSAGE;
      editMsg.style.display = "block";
    } else {
      editMsg.style.display = "none";
    }
  }
  openModal("modal-directory-edit");
}

/** Menyimpan perubahan kontak ke tampilan dan Supabase (menegakkan batas kontak doa). */
async function handleUpdateDirectory(e) {
  e.preventDefault();
  const id = document.getElementById("dir-edit-id").value;
  const cat = document.getElementById("dir-edit-category").value;
  const name = document.getElementById("dir-edit-name").value.trim();
  const role = document.getElementById("dir-edit-role").value.trim();
  const phone = document.getElementById("dir-edit-phone").value.trim();

  const index = directoryList.findIndex(d => String(d.id) === String(id));
  if (index !== -1) {
    const oldItem = { ...directoryList[index] };
    const avatarIcon = getDirectoryAvatarIcon(cat, role);
    const showInPrayer = cat === "gembala" || document.getElementById("dir-edit-show-in-prayer")?.checked === true;

    // Tegakkan batas kontak doa (tidak menghitung kontak ini sendiri)
    if (showInPrayer && cat !== "gembala" && (oldItem.category === "gembala" || !oldItem.show_in_prayer)) {
      if (countSelectedPrayerContacts(id) >= MAX_PRAYER_CONTACTS) {
        showToast("Maks. 2 kontak doa. Nonaktifkan salah satu dulu.", "fa-solid fa-triangle-exclamation");
        return;
      }
    }

    directoryList[index] = { ...directoryList[index], category: cat, name, role, phone, show_in_prayer: showInPrayer, avatarIcon };
    refreshDirectoryViews();
    closeModal("modal-directory-edit");
    renderDirectoryTable();

    initSupabaseClient();
    if (supabaseClient) {
      try {
        let query = supabaseClient.from("Tabel Direktori").update({ category: cat, name, role, phone: phone || null, avatar_icon: avatarIcon, show_in_prayer: showInPrayer });
        const isUUID = isUuid(id);
        const { error } = await (isUUID ? query.eq("id", id) : query.eq("name", oldItem.name));

        if (error) {
          showToast(`Gagal menyimpan ke Supabase: ${error.message}`, "fa-solid fa-triangle-exclamation text-amber");
        } else {
          showToast(`Kontak ${name} berhasil diperbarui di Supabase!`, "fa-solid fa-circle-check text-emerald");
        }
      } catch (err) {
        console.error("Supabase update directory exception:", err);
      }
    }
  }
}

/** Membuka konfirmasi hapus kontak. */
function openDeleteDirectoryModal(id) {
  const item = directoryList.find(d => String(d.id) === String(id));
  if (!item) return;
  document.getElementById("dir-delete-id").value = item.id;
  document.getElementById("dir-delete-name-text").textContent = `${item.name} (${item.role})`;
  openModal("modal-directory-delete");
}

/** Menghapus kontak di Supabase lalu memperbarui tampilan. */
async function confirmDeleteDirectory() {
  const id = document.getElementById("dir-delete-id").value;
  const index = directoryList.findIndex(d => String(d.id) === String(id));
  if (index === -1) return;

  const deletedItem = directoryList[index];
  closeModal("modal-directory-delete");
  initSupabaseClient();
  if (!supabaseClient) {
    showDeleteResult(false, "Supabase belum terhubung. Kontak tidak dihapus.");
    return;
  }

  try {
    let query = supabaseClient.from("Tabel Direktori").delete();
    const isUUID = isUuid(id);
    const { error } = await (isUUID ? query.eq("id", id) : query.eq("name", deletedItem.name));
    if (error) throw error;

    directoryList.splice(index, 1);
    refreshDirectoryViews();
    renderDirectoryTable();
    showDeleteResult(true, `Kontak ${deletedItem.name} berhasil dihapus.`);
  } catch (error) {
    console.error("Supabase delete directory exception:", error);
    showDeleteResult(false, `Gagal menghapus kontak dari Supabase: ${error.message}`);
  }
}

// ------------------------------------------
// Direktori publik (tab Direktori)
// ------------------------------------------

/** Merender direktori publik: kartu per kategori (Pendeta, Officers terurut jabatan, Majelis & Departemen). */
function renderPublicDirectory() {
  const container = document.getElementById("directory-content");
  if (!container) return;

  if (!directoryList || directoryList.length === 0) {
    container.innerHTML = `
      <div class="directory-loading" style="text-align: center; padding: 48px 16px; color: var(--text-muted);">
        <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 14px; display: block; color: var(--primary-navy);"></i>
        <span style="font-size: 0.95rem; font-weight: 500;">Memuat data direktori dari database Supabase...</span>
      </div>
    `;
    return;
  }

  const categories = [
    { key: "gembala", title: '<i class="fa-solid fa-crown text-gold"></i> Pendeta / Gembala Jemaat' },
    { key: "officers", title: '<i class="fa-solid fa-user-gear text-navy"></i> Officers Jemaat' },
    { key: "majelis_dept", title: '<i class="fa-solid fa-users-line text-gold"></i> Majelis & Pengurus Departemen' }
  ];

  container.innerHTML = categories.map((cat, idx) => {
    const items = directoryList.filter(d => normalizeDirectoryCategory(d.category) === cat.key);
    if (cat.key === "officers") {
      items.sort((a, b) => {
        const orderA = getOfficerRoleOrder(a.role);
        const orderB = getOfficerRoleOrder(b.role);
        return orderA === orderB ? 0 : orderA - orderB;
      });
    }
    if (items.length === 0) return "";
    return `
      <div class="directory-section-title ${idx > 0 ? 'mt-4' : ''}">${cat.title}</div>
      <div class="directory-grid">${items.map(item => `
        <div class="directory-card dir-item">
          <div class="directory-info">
            <div class="directory-avatar"><i class="fa-solid ${getDirectoryAvatarIcon(item.category, item.role)}"></i></div>
            <div class="directory-details">
              <h5 class="dir-name">${escapeHtml(item.name)}</h5>
              <p class="dir-role">${escapeHtml(item.role)}</p>
            </div>
          </div>
        </div>`).join("")}
      </div>`;
  }).join("");
}

/** Menyaring kartu direktori publik berdasarkan nama atau jabatan. */
function filterDirectory() {
  const input = document.getElementById("directory-search-input");
  if (!input) return;
  const filter = input.value.toLowerCase().trim();
  const items = document.querySelectorAll("#directory-content .dir-item");

  items.forEach(item => {
    const nameEl = item.querySelector(".dir-name");
    const roleEl = item.querySelector(".dir-role");
    const nameText = nameEl ? nameEl.textContent.toLowerCase() : "";
    const roleText = roleEl ? roleEl.textContent.toLowerCase() : "";

    if (!filter || nameText.includes(filter) || roleText.includes(filter)) {
      item.style.display = "flex";
    } else {
      item.style.display = "none";
    }
  });
}

// ==========================================
// 18. PERMOHONAN DOA (MODAL & KONTAK WHATSAPP)
// Menampilkan Pendeta (selalu) + maks. MAX_PRAYER_CONTACTS kontak pilihan admin.
// ==========================================

/**
 * HTML tombol WhatsApp untuk satu kontak, dengan pesan permohonan doa terisi otomatis.
 * @param {object} item Kontak direktori.
 * @param {string} [label] Judul tombol (default: jabatan).
 */
function buildPrayerWaButton(item, label) {
  const phoneClean = cleanPhoneForWa(item.phone);
  const waMsg = encodeURIComponent("Syalom, saya ingin mengajukan permohonan doa kepada jemaat GMAHK Taman Gethsemane.");
  const phoneDisplay = item.phone ? item.phone : "-";
  const href = phoneClean
    ? `https://wa.me/${phoneClean}?text=${waMsg}`
    : "#";
  return `
    <a href="${escapeHtml(href)}" ${phoneClean ? 'target="_blank" rel="noopener"' : ''} class="btn-contact-channel wa" ${!phoneClean ? 'style="opacity:0.6; pointer-events:none; cursor:default;"' : ''}>
      <i class="fa-brands fa-whatsapp"></i>
      <div>
        <strong>${escapeHtml(label || item.role)}</strong>
        <span>${escapeHtml(item.name)} ${phoneDisplay !== '-' ? '· ' + phoneDisplay : '(No HP tidak tersedia)'}</span>
      </div>
    </a>`;
}

/** Merender isi modal Permohonan Doa dari directoryList: Pendeta selalu di atas, lalu maks. MAX_PRAYER_CONTACTS kontak terpilih (urut jabatan). */
function renderPrayerModal() {
  const pastorEl = document.getElementById("prayer-pastor-contact");
  const extraEl = document.getElementById("prayer-extra-contacts");
  const noContactEl = document.getElementById("prayer-no-contact");
  if (!pastorEl || !extraEl || !noContactEl) return;

  // Pendeta (selalu tampil pertama)
  const pastor = directoryList.find(isPastorContact);
  // Kontak pilihan terpisah dari Pendeta yang selalu tampil.
  const prayerContacts = directoryList
    .filter(d => !isPastorContact(d) && d.show_in_prayer === true)
    .sort((a, b) => {
      const orderA = getOfficerRoleOrder(a.role);
      const orderB = getOfficerRoleOrder(b.role);
      return orderA === orderB ? 0 : orderA - orderB;
    })
    .slice(0, MAX_PRAYER_CONTACTS);

  let hasAny = false;

  if (pastor) {
    pastorEl.innerHTML = buildPrayerWaButton(pastor, `WhatsApp Pendeta — ${pastor.role}`);
    pastorEl.style.display = "";
    hasAny = true;
  } else {
    pastorEl.innerHTML = "";
    pastorEl.style.display = "none";
  }

  if (prayerContacts.length > 0) {
    extraEl.innerHTML = prayerContacts.map(c => buildPrayerWaButton(c, `WhatsApp Kontak Doa — ${c.role}`)).join("");
    extraEl.style.display = "";
    hasAny = true;
  } else {
    extraEl.innerHTML = "";
    extraEl.style.display = "none";
  }

  noContactEl.style.display = hasAny ? "none" : "";
}

/** Handler toggle di tabel admin: mengatur tampil/tidaknya kontak di Permohonan Doa (Pendeta selalu tampil; batas MAX_PRAYER_CONTACTS ditegakkan) dan menyinkronkan ke Supabase. */
async function togglePrayerContact(id, checked) {
  const index = directoryList.findIndex(d => String(d.id) === String(id));
  if (index === -1) return;
  if (isPastorContact(directoryList[index])) {
    directoryList[index].show_in_prayer = true;
    refreshDirectoryViews();
    renderDirectoryTable();
    return;
  }

  if (checked && countSelectedPrayerContacts(id) >= MAX_PRAYER_CONTACTS) {
    showToast("Maks. 2 kontak doa sudah tercapai. Nonaktifkan salah satu dulu.", "fa-solid fa-triangle-exclamation");
    renderDirectoryTable(); // re-render to reset checkbox
    return;
  }

  directoryList[index].show_in_prayer = checked;
  refreshDirectoryViews();
  renderDirectoryTable();

  initSupabaseClient();
  if (supabaseClient) {
    try {
      const isUUID = isUuid(id);
      const query = supabaseClient.from("Tabel Direktori").update({ show_in_prayer: checked });
      const { error } = await (isUUID ? query.eq("id", id) : query.eq("name", directoryList[index].name));
      if (error) {
        showToast(`Gagal sync ke Supabase: ${error.message}`, "fa-solid fa-triangle-exclamation text-amber");
      } else {
        showToast(checked
          ? `${directoryList[index].name} ditambahkan ke kontak doa.`
          : `${directoryList[index].name} dinonaktifkan dari kontak doa.`,
          "fa-solid fa-circle-check text-emerald"
        );
      }
    } catch (err) {
      console.error("Supabase toggle prayer contact exception:", err);
    }
  }
}

/**
 * Handler toggle pada form tambah/ubah kontak: menolak bila batas kontak doa tercapai dan menampilkan peringatan.
 * @param {"add"|"edit"} mode
 */
function handlePrayerToggleChange(mode, checkbox) {
  const msgEl = document.getElementById(`dir-${mode}-prayer-limit-msg`);
  const editId = mode === "edit" ? document.getElementById("dir-edit-id")?.value : null;
  const categoryId = mode === "edit" ? "dir-edit-category" : "dir-add-category";
  if (document.getElementById(categoryId)?.value === "gembala") {
    checkbox.checked = true;
    checkbox.disabled = true;
    return;
  }
  if (!checkbox.checked) {
    checkbox.disabled = countSelectedPrayerContacts(editId) >= MAX_PRAYER_CONTACTS;
    if (msgEl) msgEl.style.display = "none";
    return;
  }
  const prayerCount = countSelectedPrayerContacts(editId);
  if (prayerCount >= MAX_PRAYER_CONTACTS) {
    checkbox.checked = false;
    if (msgEl) {
      msgEl.textContent = PRAYER_LIMIT_MESSAGE;
      msgEl.style.display = "block";
    }
  } else {
    if (msgEl) msgEl.style.display = "none";
  }
}


// ==========================================
// 19. PENGUMUMAN BERANDA
// ==========================================

/** Memuat pengumuman terbaru dari tabel "Pengumuman" ke Beranda dan kolom editor admin. */
async function fetchPengumuman() {
  if (!supabaseClient) return;
  const teksEl = document.getElementById("teks-pengumuman");
  
  try {
    const { data, error } = await supabaseClient
      .from('Pengumuman')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (data && data.length > 0) {
      if (teksEl) teksEl.innerText = data[0].content;
      const inputEl = document.getElementById("input-pengumuman");
      if (inputEl) inputEl.value = data[0].content;
    } else {
      if (teksEl) teksEl.innerText = "Belum ada pengumuman saat ini.";
    }
  } catch (err) {
    console.error("Error fetching pengumuman:", err);
    if (teksEl) teksEl.innerText = "Gagal memuat pengumuman.";
  }
}

/** Menyimpan pengumuman baru (insert baris baru; yang tampil selalu yang terbaru). */
async function simpanPengumuman() {
  if (!supabaseClient) {
    showToast("Gagal: Koneksi database terputus", "fa-solid fa-triangle-exclamation");
    return;
  }
  
  const inputEl = document.getElementById("input-pengumuman");
  if (!inputEl) return;
  const content = inputEl.value.trim();
  
  if (!content) {
    showToast("Gagal: Pengumuman tidak boleh kosong", "fa-solid fa-triangle-exclamation");
    return;
  }

  const btn = document.getElementById("btn-simpan-pengumuman");
  if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
  
  try {
    const { error } = await supabaseClient
      .from('Pengumuman')
      .insert([{ content: content }]);

    if (error) throw error;
    
    showToast("Pengumuman berhasil disimpan!", "fa-solid fa-circle-check");
    closeModal("modal-edit-pengumuman");
    fetchPengumuman(); // Refresh data di layar
  } catch (err) {
    console.error("Error saving pengumuman:", err);
    showToast("Gagal menyimpan pengumuman.", "fa-solid fa-triangle-exclamation");
  } finally {
    if (btn) btn.innerHTML = '<i class="fa-solid fa-save"></i> Simpan ke Supabase';
  }
}
