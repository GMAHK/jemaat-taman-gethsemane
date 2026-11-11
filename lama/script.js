/**
 * GMAHK TAMAN GETHSEMANE — Logika Aplikasi (Single Page App)
 *
 * Satu berkas JavaScript murni (tanpa build step) agar mudah di-host di GitHub Pages.
 * Dimuat setelah Supabase JS SDK (CDN) dan setelah markup di index.html.
 *
 * Isi berkas dibagi menjadi bagian bernomor (cari "// N." untuk melompat):
 *   0. Konfigurasi & konstanta   (Supabase)
 *   1. State global
 *   2. Inisialisasi saat DOM siap
 *   3+. Fitur: tema, router/tab, countdown, rating, himne, modal & utilitas,
 *       susunan ibadah, galeri kegiatan, autentikasi admin, tabel admin,
 *       direktori jemaat, permohonan doa, pengumuman.
 */

// ==========================================
// 0. KONFIGURASI & KONSTANTA
// ==========================================

/**
 * Kredensial Supabase. Kunci di bawah adalah kunci *publishable* (aman dipublikasikan);
 * akses tulis tetap dibatasi oleh Row Level Security di database.
 */
const SUPABASE_URL = "https://jgrarsmzaqcviurladpm.supabase.co";
const SUPABASE_KEY = "sb_publishable_Vp2_Hx0mpyreTrfFQW-14g_NTxNBABy";

// ==========================================
// 1. STATE GLOBAL
// ==========================================

/** Klien Supabase; dibuat oleh initSupabaseClient() (null bila SDK gagal dimuat). */
let supabaseClient = null;

// Gallery Data for Lightbox Modal
let galleryEvents = [];
let galleryEventsLoadError = "";
let currentGalleryEventId = null;
let galleryOrderMode = false;
let galleryOrderDraft = [];

// Catalogs are loaded from Supabase; empty tables stay empty in the UI.
let lselSongs = [];
let aysSongs = [];
let hymnalSongs = [];

let userRatingScore = 0;
let communityRatings = [];

// ==========================================
// 2. INITIALIZATION ON DOM LOAD
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
  initGlobalKeyboard();
  initAdminState();
  renderPublicDirectory();
});

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
// 4. THEME & VIEWPORT TOGGLE
// ==========================================
function initTheme() {
  setTheme("light");

  const themeBtn = document.getElementById("btn-theme-toggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      toggleTheme();
    });
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const nextTheme = current === "dark" ? "light" : "dark";
  setTheme(nextTheme);
}

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
// 5. TAB NAVIGATION & HASH ROUTER (SPA HISTORY & BACK BUTTON SUPPORT)
// ==========================================
const tabToHashMap = {
  "tab-home": "beranda",
  "tab-history": "sejarah",
  "tab-worship": "ibadah",
  "tab-directory": "direktori",
  "tab-donate": "persembahan",
  "tab-gallery-viewer": "galeri"
};

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

function getTabIdFromHash(hash) {
  if (hashToTabMap[hash]) return hashToTabMap[hash];
  return hash.startsWith("galeri-") ? "tab-gallery-viewer" : "tab-home";
}

function renderGalleryViewerFromHash(hash) {
  if (!hash.startsWith("galeri-")) return;
  currentGalleryEventId = hash.slice("galeri-".length);
  renderGalleryViewer(currentGalleryEventId);
}

function switchTab(tabId, updateHistory = true) {
  // Hide all tabs
  const tabs = document.querySelectorAll(".tab-content");
  tabs.forEach(tab => tab.classList.remove("active"));

  // Show target tab
  const targetTab = document.getElementById(tabId);
  if (targetTab) {
    targetTab.classList.add("active");
  }

  // Update bottom navigation active state
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach(item => item.classList.remove("active"));

  const navTabId = tabId === "tab-gallery-viewer" ? "tab-home" : tabId;
  const targetNavBtn = document.getElementById(`nav-${navTabId}`);
  if (targetNavBtn) {
    targetNavBtn.classList.add("active");
  }

  // Update URL Hash and Browser History
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

  // Scroll main body to top smoothly
  const appBody = document.querySelector(".app-body");
  if (appBody) {
    appBody.scrollTo({ top: 0, behavior: "smooth" });
  }
}

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

  // Listen for browser Back / Forward buttons and mobile back gestures
  window.addEventListener("popstate", applyHashRoute);
  window.addEventListener("hashchange", applyHashRoute);

  // Start at the route in the URL, or at the home tab.
  const initialHash = window.location.hash.replace("#", "").toLowerCase();
  const tabFromHash = hashToTabMap[initialHash] || (initialHash.startsWith("galeri-") ? "tab-gallery-viewer" : null);

  if (tabFromHash) {
    if (tabFromHash === "tab-gallery-viewer") renderGalleryViewerFromHash(initialHash);
    switchTab(tabFromHash, false);
  } else {
    switchTab("tab-home", true);
  }
}

// ==========================================
// 6. COUNTDOWN TIMER TO SABBATH
// ==========================================
function initCountdown() {
  function updateTimer() {
    const now = new Date();
    const target = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sun, 6 = Sat
    let daysUntilSaturday = (6 - dayOfWeek + 7) % 7;

    if (dayOfWeek === 6) {
      target.setHours(9, 0, 0, 0);
      if (now > target) {
        daysUntilSaturday = 7;
      }
    }

    target.setDate(now.getDate() + daysUntilSaturday);
    target.setHours(9, 0, 0, 0);

    const diff = target - now;

    if (diff <= 0) {
      document.getElementById("cd-days").textContent = "00";
      document.getElementById("cd-hours").textContent = "00";
      document.getElementById("cd-mins").textContent = "00";
      document.getElementById("cd-secs").textContent = "00";
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const elDays = document.getElementById("cd-days");
    const elHours = document.getElementById("cd-hours");
    const elMins = document.getElementById("cd-mins");
    const elSecs = document.getElementById("cd-secs");

    if (elDays) elDays.textContent = String(days).padStart(2, '0');
    if (elHours) elHours.textContent = String(hours).padStart(2, '0');
    if (elMins) elMins.textContent = String(minutes).padStart(2, '0');
    if (elSecs) elSecs.textContent = String(seconds).padStart(2, '0');
  }

  updateTimer();
  setInterval(updateTimer, 1000);
}

// ==========================================
// 7. INTERACTIVE STAR RATING
// ==========================================
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

  loadSavedRatings();
}

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

async function saveUserRating(ratingObj) {
  if (!supabaseClient) initSupabaseClient();
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

function loadSavedRatings() {
  fetchCommunityRatings();
}

async function fetchCommunityRatings() {
  if (!supabaseClient) initSupabaseClient();
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

function renderUserRatingView(ratingObj) {
  const form = document.getElementById("rating-form");
  const successBox = document.getElementById("rating-success-message");
  const details = document.getElementById("saved-rating-details");

  if (form) form.classList.add("hidden");
  if (successBox) successBox.classList.remove("hidden");
  if (details) {
    details.innerHTML = `Rating: <strong>${'★'.repeat(ratingObj.score)}</strong> oleh <em>${ratingObj.name}</em><br>"${ratingObj.comment}"`;
  }
}

function renderCommunityReviews() {
  const container = document.getElementById("reviews-list");
  if (!container) return;

  container.innerHTML = communityRatings.length ? communityRatings.map(r => `
    <div class="review-item">
      <div class="review-user">
        <span>${r.name}</span>
        <span class="review-stars">${'★'.repeat(r.score)}</span>
      </div>
      <div class="review-text">"${r.comment}"</div>
    </div>
  `).join('') : '<p class="reviews-empty">Belum ada ulasan.</p>';
}

// ==========================================
// 8. WORSHIP PROGRAM TAB ACCORDION LOGIC
// ==========================================
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
// 9. HYMNAL SONG SEARCH LOGIC
// ==========================================
function initHymnal() {
  renderHymnalList(hymnalSongs);
  fetchHymnalData();
}

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
      <button class="btn-copy" onclick="showToast('Nomor Lagu ${s.num} disalin')">
        <i class="fa-solid fa-bookmark"></i>
      </button>
    </div>
  `).join('');
}

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

async function fetchHymnalData() {
  if (!supabaseClient) initSupabaseClient();
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
// 10. MODAL CONTROLS & LIGHTBOX
// ==========================================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    if (modalId === "modal-prayer") renderPrayerModal();
    modal.classList.add("active");
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("active");
  }
}

let pendingDeleteAction = null;

function openDeleteConfirmation({ subtitle, message, description, onConfirm }) {
  document.getElementById("delete-confirm-subtitle").textContent = subtitle;
  document.getElementById("delete-confirm-message").textContent = message;
  document.getElementById("delete-confirm-description").textContent = description;
  pendingDeleteAction = onConfirm;
  openModal("modal-delete-confirm");
}

function cancelDeleteConfirmation() {
  pendingDeleteAction = null;
  closeModal("modal-delete-confirm");
}

async function confirmDeleteAction() {
  const onConfirm = pendingDeleteAction;
  pendingDeleteAction = null;
  closeModal("modal-delete-confirm");
  if (onConfirm) await onConfirm();
}

function showDeleteResult(success, description) {
  showToast(
    success ? `Data Berhasil Dihapus. ${description}` : `Permintaan Gagal: ${description}`,
    success ? "fa-solid fa-circle-check text-emerald" : "fa-solid fa-triangle-exclamation text-amber"
  );
}

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay")) {
    if (e.target.id === "modal-csv-import") {
      if (csvImportState?.saving) return;
      csvImportState = null;
    }
    e.target.classList.remove("active");
    if (e.target.id === "modal-delete-confirm") pendingDeleteAction = null;
  }
});

function initGlobalKeyboard() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const activeModals = document.querySelectorAll(".modal-overlay.active");
      if (document.getElementById("modal-delete-confirm")?.classList.contains("active")) {
        pendingDeleteAction = null;
      }
      activeModals.forEach(modal => {
        if (modal.id === "modal-csv-import") {
          if (csvImportState?.saving) return;
          csvImportState = null;
        }
        modal.classList.remove("active");
      });
    }
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

function copyToClipboard(text, label) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(`${label} (${text}) berhasil disalin!`);
  }).catch(() => {
    showToast(`Gagal menyalin. Silakan salin manual: ${text}`);
  });
}

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
// 12. WORSHIP DATA ENGINE & INLINE EDITOR
// ==========================================
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

let worshipData = JSON.parse(JSON.stringify(defaultWorshipData));
let worshipAvailability = { "sabat-raya": "loading", "rabu-malam": "loading" };
let worshipOverrideRows = [];
let pendingWorshipResetKey = null;
let subtabEditState = {
  "sabat-raya": false,
  "rabu-malam": false
};

function initWorshipSubTabs() {
  renderSubTab("sabat-raya");
  renderSubTab("rabu-malam");
}

function getUpcomingWorshipDate(targetDay) {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysUntilTarget = (targetDay - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + daysUntilTarget);
  return date;
}

function formatWorshipDate(date) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

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

function getDynamicWorshipTitle(key, fallbackTitle) {
  if (key !== "sabat-raya") return fallbackTitle;

  const upcomingSaturday = getUpcomingWorshipDate(6);
  const sabbathNumber = getSabbathNumberInQuarter(upcomingSaturday);
  return `Susunan Ibadah Kebaktian Sabat Ke-${sabbathNumber}`;
}

function getDynamicWorshipSubtitle(key) {
  if (key === "rabu-malam") {
    return `${formatWorshipDate(getUpcomingWorshipDate(3))} | 19.00 WIB`;
  }

  const dateText = formatWorshipDate(getUpcomingWorshipDate(6));
  return dateText;
}

function getOverrideProgramType(key) {
  return key === "sabat-raya" ? "sabat" : key === "rabu-malam" ? "rabu" : "pa";
}

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
  const existing = worshipOverrideRows.find(row => row.program_type === programType && row.date_display === dateDisplay);

  if (!supabaseClient) initSupabaseClient();
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
                <span class="gen-metric-title">${info.key}</span>
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
          <h4>${sec.title}</h4>
        </div>
        <div class="liturgy-list">
          ${sec.items.map((item, itemIdx) => `
            <div class="liturgy-item ${item.highlight ? 'highlight' : ''} ${item.type === 'group' || item.subItems ? 'liturgy-group-item' : ''}">
              <span class="lit-time">${item.time}</span>
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

function formatSongDisplay(item) {
  if (!item.songNo && !item.songTitle) return '-';
  const book = item.songBook || 'LSEL No.';
  const catalog = /AYS/i.test(book) ? aysSongs : lselSongs;
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

function getSongCatalogForBook(songBook) {
  return /AYS/i.test(songBook || '') ? aysSongs : lselSongs;
}

function showSongSuggestions(input, key, secIdx, itemIdx) {
  const songGroup = input.closest('.edit-song-group');
  const suggestions = songGroup && songGroup.querySelector('.song-suggestions');
  if (!suggestions) return;

  const item = worshipData[key]?.sections[secIdx]?.items[itemIdx];
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

function hideSongSuggestions(input) {
  const songGroup = input.closest('.edit-song-group');
  const suggestions = songGroup && songGroup.querySelector('.song-suggestions');
  if (suggestions) suggestions.classList.remove('show');
}

function selectSongSuggestion(button) {
  const { key, sec, item, songNo, songTitle } = button.dataset;
  if (!worshipData[key]?.sections[sec]?.items[item]) return;

  worshipData[key].sections[sec].items[item].songNo = songNo;
  worshipData[key].sections[sec].items[item].songTitle = songTitle;
  renderSubTab(key);
}

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

function cancelResetSubTab() {
  pendingWorshipResetKey = null;
  closeModal("modal-worship-reset-confirm");
}

async function confirmResetSubTab() {
  const key = pendingWorshipResetKey;
  if (!key) return;
  const programType = getOverrideProgramType(key);
  const dateDisplay = getDynamicWorshipSubtitle(key);
  if (!supabaseClient) initSupabaseClient();
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

function updateGenInfo(key, idx, val) {
  if (worshipData[key] && worshipData[key].generalInfo[idx]) {
    worshipData[key].generalInfo[idx].value = val;
  }
}

function updateOfficer(key, secIdx, itemIdx, val) {
  if (worshipData[key] && worshipData[key].sections[secIdx] && worshipData[key].sections[secIdx].items[itemIdx]) {
    worshipData[key].sections[secIdx].items[itemIdx].officer = val;
  }
}

function updateSermonTitle(key, secIdx, itemIdx, val) {
  if (worshipData[key] && worshipData[key].sections[secIdx] && worshipData[key].sections[secIdx].items[itemIdx]) {
    worshipData[key].sections[secIdx].items[itemIdx].sermonTitle = val;
  }
}

function updateSubGroupOfficer(key, secIdx, itemIdx, subIdx, val) {
  if (
    worshipData[key] &&
    worshipData[key].sections[secIdx] &&
    worshipData[key].sections[secIdx].items[itemIdx] &&
    worshipData[key].sections[secIdx].items[itemIdx].subItems &&
    worshipData[key].sections[secIdx].items[itemIdx].subItems[subIdx]
  ) {
    worshipData[key].sections[secIdx].items[itemIdx].subItems[subIdx].officer = val;
  }
}

function updateSongNo(key, secIdx, itemIdx, val) {
  if (worshipData[key] && worshipData[key].sections[secIdx] && worshipData[key].sections[secIdx].items[itemIdx]) {
    worshipData[key].sections[secIdx].items[itemIdx].songNo = val;
  }
}

function updateSongTitle(key, secIdx, itemIdx, val) {
  if (worshipData[key] && worshipData[key].sections[secIdx] && worshipData[key].sections[secIdx].items[itemIdx]) {
    worshipData[key].sections[secIdx].items[itemIdx].songTitle = val;
  }
}



// ==========================================
// 13. SUPABASE INTEGRATION, ADMIN AUTH & DATABASE VIEW ENGINE
// ==========================================
function initSupabaseClient() {
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

// Initial client creation attempt
initSupabaseClient();

async function fetchGalleryEvents() {
  if (!supabaseClient) initSupabaseClient();
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
    galleryEvents = (data || []).slice(0, 3);
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

function renderGalleryAdminPanel() {
  const list = document.getElementById("gallery-admin-list");
  const status = document.getElementById("gallery-admin-status");
  const addButton = document.getElementById("btn-add-gallery-event");
  const orderButton = document.getElementById("btn-gallery-order");
  const cancelOrderButton = document.getElementById("btn-cancel-gallery-order");
  const saveOrderButton = document.getElementById("btn-save-gallery-order");
  if (!list) return;

  const isAtCapacity = galleryEvents.length >= 3;
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
        : `${galleryEvents.length} dari 3 event digunakan.`;
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

function getGoogleSlidesPresentationInfo(slidesUrl) {
  try {
    const url = new URL(slidesUrl);
    if (url.protocol !== "https:" || url.hostname !== "docs.google.com" || url.username || url.password || (url.port && url.port !== "443")) return "";
    const match = url.pathname.match(/^\/presentation\/d\/(e\/)?([^/]+)/);
    if (!match) return "";

    return { id: encodeURIComponent(match[2]), published: Boolean(match[1]) };
  } catch {
    return null;
  }
}

function getGoogleSlidesEmbedUrl(slidesUrl) {
  const presentation = getGoogleSlidesPresentationInfo(slidesUrl);
  if (!presentation) return "";
  const publishedPath = presentation.published ? "e/" : "";
  return `https://docs.google.com/presentation/d/${publishedPath}${presentation.id}/embed?start=false&loop=false&delayms=3000`;
}

function getGoogleSlidesThumbnailUrl(slidesUrl) {
  const presentation = getGoogleSlidesPresentationInfo(slidesUrl);
  if (!presentation) return "";
  if (presentation.published) {
    return `https://docs.google.com/presentation/d/e/${presentation.id}/export/png`;
  }
  return `https://drive.google.com/thumbnail?id=${presentation.id}&sz=w1200`;
}

function getGoogleSlidesThumbnailFallbackUrl(slidesUrl) {
  const presentation = getGoogleSlidesPresentationInfo(slidesUrl);
  if (!presentation || presentation.published) return "";
  return `https://docs.google.com/presentation/d/${presentation.id}/export/png`;
}

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

function openGalleryEvent(eventId) {
  if (!galleryEvents.some(event => String(event.id) === String(eventId))) return;
  currentGalleryEventId = String(eventId);
  renderGalleryViewer(currentGalleryEventId);
  switchTab("tab-gallery-viewer");
}

function closeGalleryEvent() {
  currentGalleryEventId = null;
  window.history.replaceState({ tabId: "tab-home" }, "", "#beranda");
  switchTab("tab-home", false);
}

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

function cancelGalleryOrder() {
  galleryOrderMode = false;
  galleryOrderDraft = [];
  renderGalleryAdminPanel();
}

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
    // Trik Pemungkas: Kita TIDAK mengubah 'slot' atau 'id' sama sekali!
    // Kita menukar 'title', 'subtitle', dan 'slides_url' dari row yang lama 
    // agar sesuai dengan urutan yang baru. Ini menghindari bentrok Unique maupun Check Constraint!
    
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
    : [1, 2, 3].find(candidate => !usedSlots.has(candidate));
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

let isAdminLoggedIn = false;

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

async function restoreAdminSession() {
  if (!supabaseClient) initSupabaseClient();
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

  // Refresh worship subtabs so edit buttons toggle dynamically
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

// ------------------------------------------
// ADMIN VIEW NAVIGATION (TWO-WAY TRANSITIONS)
// ------------------------------------------
function openAdminDatabaseView() {
  const appShell = document.getElementById("app-shell");
  const dbView = document.getElementById("admin-database-view");
  if (appShell) appShell.style.display = "none";
  if (dbView) dbView.style.display = "flex";

  // Default to the first database tab
  switchAdminDbTab("directory");
  fetchDirectoryFromSupabase();
  fetchPosFromSupabase();
  fetchSabbathProgramData();
  fetchGalleryEvents();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeAdminDatabaseView() {
  const appShell = document.getElementById("app-shell");
  const dbView = document.getElementById("admin-database-view");
  if (dbView) dbView.style.display = "none";
  if (appShell) appShell.style.display = "flex";

  updateAdminUIState();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function handleAdminNavClick() {
  if (isAdminLoggedIn) {
    // Langsung masuk ke tampilan Database View Dashboard
    openAdminDatabaseView();
  } else {
    // Populate Supabase URL input if exists
    const urlInput = document.getElementById("supabase-url-input");
    if (urlInput && SUPABASE_URL) {
      urlInput.value = SUPABASE_URL;
    }
    openModal("modal-admin-login");
  }
}

function confirmLogoutAdmin() {
  closeModal("modal-logout-confirm");
  logoutAdmin();
}

function logoutAdmin() {
  isAdminLoggedIn = false;

  // Sign out from Supabase Auth session if active
  if (supabaseClient && supabaseClient.auth) {
    supabaseClient.auth.signOut().catch(() => { });
  }

  closeAdminDatabaseView();
  updateAdminUIState();
  showToast("Anda telah keluar dari Mode Admin.", "fa-solid fa-right-from-bracket text-gold");
}

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

async function handleAdminLoginSubmit(e) {
  e.preventDefault();
  const emailInput = document.getElementById("admin-email");
  const passwordInput = document.getElementById("admin-password");
  const urlInput = document.getElementById("supabase-url-input");
  const errorBanner = document.getElementById("admin-login-error");
  const errorText = document.getElementById("admin-error-text");
  const successBanner = document.getElementById("admin-login-success");
  const submitBtn = document.getElementById("btn-submit-admin-login");
  const modalCard = document.querySelector("#modal-admin-login .modal-card");

  const email = emailInput ? emailInput.value.trim() : "";
  const password = passwordInput ? passwordInput.value : "";

  // Reset UI Banners
  if (errorBanner) errorBanner.style.display = "none";
  if (successBanner) successBanner.style.display = "none";

  // Show loading spinner
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Menghubungkan Supabase...</span>`;
  }

  const client = initSupabaseClient();

  if (client) {
    // Direct Supabase Authentication Call
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

      // Direct Transition to Database View after login
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

// ------------------------------------------
// DATABASE VIEW SIDEBAR TAB SWITCHER
// ------------------------------------------
function switchAdminDbTab(tabKey) {
  // Update sidebar buttons
  const tabBtns = document.querySelectorAll(".sidebar-tab-btn");
  tabBtns.forEach(btn => {
    if (btn.getAttribute("data-dbtab") === tabKey) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Update panels
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
// 14. TABEL PIANIS ENGINE
// ==========================================
let posScheduleList = [];
let posSortField = "date";
let posSortAsc = false; // Descending by default
let posSearchQuery = "";

function savePosSchedule() {
  syncNearestPosToWorship();
}

async function fetchPosFromSupabase() {
  if (!supabaseClient) initSupabaseClient();
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
      savePosSchedule();
      renderPosTable();
    }
  } catch (err) {
    console.warn("Error fetching Tabel Pianis from Supabase:", err);
  }
}

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

let ssScheduleList = [];
let khotbahScheduleList = [];
const sabbathTableSort = {
  ss: { field: 'date', ascending: false },
  khotbah: { field: 'date', ascending: false }
};

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

function getSabbathTableValue(row, key) {
  if (key === "diskusi_gabungan") {
    return `Orang Muda: ${row.diskusi_orang_muda || '-'}\nOrang Tua: ${row.diskusi_orang_tua || '-'}`;
  }
  return String(row[key] ?? '-');
}

function getSabbathTableConfig(tableKey) {
  return tableKey === 'ss'
    ? { table: 'Tabel SS', rows: ssScheduleList, columns: ssTableColumns }
    : { table: 'Tabel Khotbah', rows: khotbahScheduleList, columns: khotbahTableColumns };
}

let csvImportState = null;

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

function closeCsvImportModal() {
  if (csvImportState?.saving) return;
  closeModal("modal-csv-import");
  csvImportState = null;
}

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

function backToCsvImportUpload() {
  document.getElementById("csv-import-preview-stage").hidden = true;
  document.getElementById("csv-import-upload-stage").hidden = false;
}

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

  if (!supabaseClient) initSupabaseClient();
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
    savePosSchedule();
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

function filterSabbathTable(tableKey) {
  const config = getSabbathTableConfig(tableKey);
  renderSabbathDatabaseTable(tableKey, config.rows, config.columns);
}

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

function clearSabbathTableSearch(tableKey) {
  const input = document.getElementById(`${tableKey}-table-search`);
  if (input) input.value = '';
  filterSabbathTable(tableKey);
}

let pendingWeekShift = null;

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

function cancelWeekShift() {
  pendingWeekShift = null;
  closeModal("modal-week-shift-confirm");
}

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
  if (!supabaseClient) initSupabaseClient();
  if (!supabaseClient) {
    showToast(`Gagal menggeser jadwal ${config.table}: Supabase belum terhubung.`, "fa-solid fa-triangle-exclamation text-amber");
    return;
  }

  const updatedRows = config.rows.map(row => ({ ...row }));

  updatedRows.forEach(row => {
    const date = new Date(`${row.date}T00:00:00`);
    if (!Number.isNaN(date.getTime())) {
      date.setDate(date.getDate() - direction * 7);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      row.date = `${year}-${month}-${day}`;
    }
  });

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

function getNextSabbathTableDate(rows) {
  const dates = new Set(rows.map(row => row.date).filter(Boolean));
  const latestDate = [...dates].sort().pop();
  const nextDate = latestDate
    ? new Date(`${latestDate}T00:00:00`)
    : new Date(`${getUpcomingSaturdayIso()}T00:00:00`);

  if (Number.isNaN(nextDate.getTime())) return getUpcomingSaturdayIso();
  if (latestDate) nextDate.setDate(nextDate.getDate() + 7);

  while (dates.has([
    nextDate.getFullYear(),
    String(nextDate.getMonth() + 1).padStart(2, "0"),
    String(nextDate.getDate()).padStart(2, "0")
  ].join("-"))) {
    nextDate.setDate(nextDate.getDate() + 7);
  }

  return [
    nextDate.getFullYear(),
    String(nextDate.getMonth() + 1).padStart(2, "0"),
    String(nextDate.getDate()).padStart(2, "0")
  ].join("-");
}

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

  if (!supabaseClient) initSupabaseClient();
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

async function performDeleteSabbathTableEntry(tableKey, id) {
  const config = getSabbathTableConfig(tableKey);
  if (!supabaseClient) initSupabaseClient();
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

function getUpcomingSaturdayIso() {
  const date = getUpcomingWorshipDate(6);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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

function getUpcomingSabbathRow(rows) {
  if (!rows || rows.length === 0) return null;
  const targetDate = getUpcomingSaturdayIso();
  return rows.find(row => row.date === targetDate) || null;
}

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

  // Hardcode lagu-lagu paten (tidak lagi diambil dari Supabase)
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

async function fetchSabbathProgramData() {
  if (!supabaseClient) initSupabaseClient();
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

  if (ssResult.status === "fulfilled" && !ssResult.value.error) {
    ssScheduleList = ssResult.value.data || [];
    renderSabbathDatabaseTable('ss', ssScheduleList, ssTableColumns);
  } else {
    const message = ssResult.status === "fulfilled"
      ? ssResult.value.error.message
      : ssResult.reason?.message;
    console.warn("Supabase fetch Tabel SS error:", message);
    ssScheduleList = [];
    renderSabbathDatabaseTable('ss', [], ssTableColumns, "Tabel SS belum dapat dimuat.");
  }

  if (khotbahResult.status === "fulfilled" && !khotbahResult.value.error) {
    khotbahScheduleList = khotbahResult.value.data || [];
    renderSabbathDatabaseTable('khotbah', khotbahScheduleList, khotbahTableColumns);
  } else {
    const message = khotbahResult.status === "fulfilled"
      ? khotbahResult.value.error.message
      : khotbahResult.reason?.message;
    console.warn("Supabase fetch Tabel Khotbah error:", message);
    khotbahScheduleList = [];
    renderSabbathDatabaseTable('khotbah', [], khotbahTableColumns, "Tabel Khotbah belum dapat dimuat.");
  }

  if (overrideResult.status === "fulfilled" && !overrideResult.value.error) {
    worshipOverrideRows = overrideResult.value.data || [];
  } else {
    const message = overrideResult.status === "fulfilled"
      ? overrideResult.value.error.message
      : overrideResult.reason?.message;
    console.warn("Supabase fetch Tabel Override Susunan error:", message);
    worshipOverrideRows = [];
  }

  await removeExpiredWorshipOverrides();
  applySabbathDatabaseRows();
}

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
        <td colspan="5" style="text-align: center; padding: 40px 16px; color: var(--text-muted);">
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

function formatDateIndo(dateStr) {
  if (!dateStr) return "-";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr));
  return match ? `${match[3]}-${match[2]}-${match[1]}` : String(dateStr);
}

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
          ? "fa-solid fa-sort-up th-sort-icon text-burgundy"
          : "fa-solid fa-sort-down th-sort-icon text-burgundy";
      } else {
        icon.className = "fa-solid fa-sort th-sort-icon";
      }
    }
  });

  renderPosTable();
}

function filterPosTable() {
  const input = document.getElementById("pos-table-search");
  const clearBtn = document.getElementById("pos-search-clear");
  if (input) {
    posSearchQuery = input.value.trim();
    if (clearBtn) clearBtn.style.display = posSearchQuery ? "block" : "none";
  }
  renderPosTable();
}

function clearPosSearch() {
  const input = document.getElementById("pos-table-search");
  const clearBtn = document.getElementById("pos-search-clear");
  if (input) input.value = "";
  if (clearBtn) clearBtn.style.display = "none";
  posSearchQuery = "";
  renderPosTable();
}

async function shiftPosWeek(direction, confirmed = false) {
  if (!confirmed) {
    openWeekShiftConfirm("pos", null, direction);
    return;
  }

  if (posScheduleList.length === 0) {
    showToast("Tidak ada jadwal di Tabel Pianis untuk digeser.", "fa-solid fa-triangle-exclamation text-amber");
    return;
  }
  if (!supabaseClient) initSupabaseClient();
  if (!supabaseClient) {
    showToast("Gagal menggeser jadwal Tabel Pianis: Supabase belum terhubung.", "fa-solid fa-triangle-exclamation text-amber");
    return;
  }

  const updatedRows = posScheduleList.map(item => {
    const date = new Date(`${item.date}T00:00:00`);
    if (!Number.isNaN(date.getTime())) {
      date.setDate(date.getDate() - direction * 7);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return { ...item, date: `${year}-${month}-${day}` };
    }
    return { ...item };
  });

  try {
    const results = await Promise.all(updatedRows.map(item => {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id);
      if (!isUUID) {
        return Promise.resolve({ error: new Error(`ID jadwal ${item.id} tidak valid.`) });
      }
      return supabaseClient.from("Tabel Pianis").update({ date: item.date }).eq("id", item.id);
    }));
    const failedResult = results.find(result => result.error);
    if (failedResult?.error) throw failedResult.error;

    posScheduleList = updatedRows;
    savePosSchedule();
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

function openAddPosModal() {
  const form = document.getElementById("pos-add-form");
  if (form) form.reset();

  const dateInput = document.getElementById("pos-add-date");
  if (dateInput && posScheduleList.length > 0) {
    const sorted = [...posScheduleList].sort((a, b) => new Date(b.date) - new Date(a.date));
    const latestDate = new Date(sorted[0].date);
    if (!isNaN(latestDate.getTime())) {
      latestDate.setDate(latestDate.getDate() + 7);
      const yyyy = latestDate.getFullYear();
      const mm = String(latestDate.getMonth() + 1).padStart(2, "0");
      const dd = String(latestDate.getDate()).padStart(2, "0");
      dateInput.value = `${yyyy}-${mm}-${dd}`;
    }
  }

  openModal("modal-pos-add");
}

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
  savePosSchedule();
  closeModal("modal-pos-add");
  renderPosTable();
  showToast(`Menyimpan jadwal tanggal ${newItem.date}...`, "fa-solid fa-spinner fa-spin text-gold");

  // Sync to Supabase
  if (!supabaseClient) initSupabaseClient();
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
        savePosSchedule();
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

    savePosSchedule();
    closeModal("modal-pos-edit");
    renderPosTable();
    showToast(`Memperbarui jadwal tanggal ${posScheduleList[index].date}...`, "fa-solid fa-spinner fa-spin text-gold");

    // Sync to Supabase
    if (!supabaseClient) initSupabaseClient();
    if (supabaseClient) {
      try {
        let query = supabaseClient.from("Tabel Pianis").update({
          date: posScheduleList[index].date,
          pianist: posScheduleList[index].pianist
        });

        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
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

function openDeletePosModal(id) {
  const item = posScheduleList.find(p => String(p.id) === String(id));
  if (!item) return;

  const idInput = document.getElementById("pos-delete-id");
  const dateText = document.getElementById("pos-delete-date-text");

  if (idInput) idInput.value = item.id;
  if (dateText) dateText.textContent = item.date;

  openModal("modal-pos-delete");
}

async function confirmDeletePos() {
  const idInput = document.getElementById("pos-delete-id");
  const targetId = idInput ? idInput.value : "";
  const index = posScheduleList.findIndex(p => String(p.id) === String(targetId));
  if (index === -1) return;

  const deletedItem = posScheduleList[index];
  const deletedDate = deletedItem.date;
  closeModal("modal-pos-delete");
  if (!supabaseClient) initSupabaseClient();
  if (!supabaseClient) {
    showDeleteResult(false, "Supabase belum terhubung. Jadwal tidak dihapus.");
    return;
  }

  try {
    let query = supabaseClient.from("Tabel Pianis").delete();
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
    if (isUUID) {
      query = query.eq("id", targetId);
    } else {
      query = query.eq("date", deletedDate);
    }

    const { error } = await query;
    if (error) throw error;

    posScheduleList.splice(index, 1);
    savePosSchedule();
    renderPosTable();
    showDeleteResult(true, `Jadwal POS tanggal ${deletedDate} berhasil dihapus.`);
  } catch (error) {
    console.error("Supabase delete pos exception:", error);
    showDeleteResult(false, `Gagal menghapus jadwal dari Supabase: ${error.message}`);
  }
}

// ==========================================
// 15. TABEL DIREKTORI JEMAAT & PENGURUS ENGINE (DINAMIS SUPABASE)
// ==========================================
// Data kontak sepenuhnya diambil secara aman & dinamis dari server Supabase.
let directoryList = [];
let dirSortField = "category";
let dirSortAsc = true;
let dirSearchQuery = "";
let dirCategoryFilter = "";

function saveDirectoryData() {
  renderPublicDirectory();
  renderPrayerModal();
}

function getDirectoryAvatarIcon(category, role) {
  const normalizedCategory = category === "majelis_anggota" ? "majelis_dept" : category;
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

function isPastorContact(item) {
  return item.category === "gembala";
}

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

function countSelectedPrayerContacts(excludeId = null) {
  return directoryList.filter(item =>
    !isPastorContact(item) &&
    item.show_in_prayer === true &&
    (excludeId === null || String(item.id) !== String(excludeId))
  ).length;
}

async function fetchDirectoryFromSupabase() {
  if (!supabaseClient) initSupabaseClient();
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
        const category = row.category === "majelis_anggota" ? "majelis_dept" : row.category;
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
      saveDirectoryData();
      renderDirectoryTable();
      renderPrayerModal();
    } else {
      renderDirectoryStatus("Belum ada data direktori yang tersedia.");
    }
  } catch (err) {
    console.warn("Error fetching directory from Supabase:", err);
    renderDirectoryStatus("Direktori belum dapat dimuat dari Supabase.");
  }
}

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

function cleanPhoneForWa(phone) {
  if (!phone) return "";
  let clean = phone.replace(/[^0-9]/g, "");
  if (clean.startsWith("0")) {
    clean = "62" + clean.substring(1);
  }
  return clean;
}

function renderDirectoryTable() {
  const tbody = document.getElementById("directory-table-body");
  const countDisp = document.getElementById("dir-count-displayed");
  const countTotal = document.getElementById("dir-count-total");
  if (!tbody) return;

  const catFilterSelect = document.getElementById("directory-category-filter");
  if (catFilterSelect) dirCategoryFilter = catFilterSelect.value;

  let filtered = directoryList.filter(item => {
    const itemCat = item.category === "majelis_anggota" ? "majelis_dept" : item.category;
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
    const isDisabled = isPastor || (!isChecked && countSelectedPrayerContacts() >= 2);
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
        ? (dirSortAsc ? "fa-solid fa-sort-up th-sort-icon text-burgundy" : "fa-solid fa-sort-down th-sort-icon text-burgundy")
        : "fa-solid fa-sort th-sort-icon";
    }
  });
  renderDirectoryTable();
}

function filterDirectoryTable() {
  const input = document.getElementById("directory-table-search");
  const clearBtn = document.getElementById("directory-search-clear");
  if (input) {
    dirSearchQuery = input.value.trim();
    if (clearBtn) clearBtn.style.display = dirSearchQuery ? "block" : "none";
  }
  renderDirectoryTable();
}

function clearDirectorySearch() {
  const input = document.getElementById("directory-table-search");
  const clearBtn = document.getElementById("directory-search-clear");
  if (input) input.value = "";
  if (clearBtn) clearBtn.style.display = "none";
  dirSearchQuery = "";
  renderDirectoryTable();
}

function openAddDirectoryModal() {
  const form = document.getElementById("directory-add-form");
  if (form) form.reset();
  const addCategory = document.getElementById("dir-add-category");
  handleDirectoryCategoryChange("add", addCategory);
  const addToggle = document.getElementById("dir-add-show-in-prayer");
  const addMsg = document.getElementById("dir-add-prayer-limit-msg");
  const isPastor = document.getElementById("dir-add-category")?.value === "gembala";
  if (addToggle) {
    addToggle.checked = isPastor;
    addToggle.disabled = isPastor || countSelectedPrayerContacts() >= 2;
    addToggle.dataset.autoCheckedForPastor = String(isPastor);
  }
  if (addMsg) {
    if (!isPastor && countSelectedPrayerContacts() >= 2) {
      addMsg.textContent = "Sudah ada 2 kontak doa. Nonaktifkan salah satu terlebih dahulu.";
      addMsg.style.display = "block";
    } else {
      addMsg.style.display = "none";
    }
  }
  openModal("modal-directory-add");
}

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
  checkbox.disabled = !checkbox.checked && countSelectedPrayerContacts(editId) >= 2;
  if (message) {
    message.style.display = checkbox.disabled ? "block" : "none";
    if (checkbox.disabled) message.textContent = "Sudah ada 2 kontak doa. Nonaktifkan salah satu terlebih dahulu.";
  }
}

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

  // Enforce max 2 prayer contacts
  if (showInPrayer && cat !== "gembala") {
    if (countSelectedPrayerContacts() >= 2) {
      showToast("Maks. 2 kontak doa. Nonaktifkan salah satu dulu.", "fa-solid fa-triangle-exclamation");
      return;
    }
  }

  directoryList.push(newItem);
  saveDirectoryData();
  renderPrayerModal();
  closeModal("modal-directory-add");
  renderDirectoryTable();
  showToast(`Menyimpan kontak ${name}...`, "fa-solid fa-spinner fa-spin text-gold");

  if (!supabaseClient) initSupabaseClient();
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from("Tabel Direktori").insert([{
        category: cat, name, role, phone: phone || null, avatar_icon: avatarIcon, show_in_prayer: newItem.show_in_prayer
      }]).select();

      if (error) {
        showToast(`Gagal menyimpan ke Supabase: ${error.message}`, "fa-solid fa-triangle-exclamation text-amber");
      } else if (data && data[0]) {
        newItem.id = data[0].id;
        saveDirectoryData();
        renderDirectoryTable();
        renderPrayerModal();
        showToast(`Kontak ${name} (${role}) tersimpan di Supabase!`, "fa-solid fa-circle-check text-emerald");
      }
    } catch (err) {
      console.error("Supabase insert directory exception:", err);
    }
  }
}

function openEditDirectoryModal(id) {
  const item = directoryList.find(d => String(d.id) === String(id));
  if (!item) return;

  document.getElementById("dir-edit-id").value = item.id;
  document.getElementById("dir-edit-category").value = (item.category === "majelis_anggota" ? "majelis_dept" : item.category);
  handleDirectoryCategoryChange("edit", document.getElementById("dir-edit-category"));
  document.getElementById("dir-edit-name").value = item.name;
  document.getElementById("dir-edit-role").value = item.role;
  document.getElementById("dir-edit-phone").value = item.phone || "";
  // Set prayer toggle
  const editToggle = document.getElementById("dir-edit-show-in-prayer");
  const editMsg = document.getElementById("dir-edit-prayer-limit-msg");
  const isPastor = isPastorContact(item);
  const prayerCount = countSelectedPrayerContacts(id);
  if (editToggle) {
    editToggle.checked = isPastor || item.show_in_prayer === true;
    editToggle.disabled = isPastor || (!editToggle.checked && prayerCount >= 2);
    editToggle.dataset.autoCheckedForPastor = String(isPastor);
  }
  if (editMsg) {
    if (!isPastor && !item.show_in_prayer && prayerCount >= 2) {
      editMsg.textContent = "Sudah ada 2 kontak doa. Nonaktifkan salah satu terlebih dahulu.";
      editMsg.style.display = "block";
    } else {
      editMsg.style.display = "none";
    }
  }
  openModal("modal-directory-edit");
}

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

    // Enforce max 2 prayer contacts (excluding this item)
    if (showInPrayer && cat !== "gembala" && (oldItem.category === "gembala" || !oldItem.show_in_prayer)) {
      if (countSelectedPrayerContacts(id) >= 2) {
        showToast("Maks. 2 kontak doa. Nonaktifkan salah satu dulu.", "fa-solid fa-triangle-exclamation");
        return;
      }
    }

    directoryList[index] = { ...directoryList[index], category: cat, name, role, phone, show_in_prayer: showInPrayer, avatarIcon };
    saveDirectoryData();
    closeModal("modal-directory-edit");
    renderDirectoryTable();
    renderPrayerModal();

    if (!supabaseClient) initSupabaseClient();
    if (supabaseClient) {
      try {
        let query = supabaseClient.from("Tabel Direktori").update({ category: cat, name, role, phone: phone || null, avatar_icon: avatarIcon, show_in_prayer: showInPrayer });
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
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

function openDeleteDirectoryModal(id) {
  const item = directoryList.find(d => String(d.id) === String(id));
  if (!item) return;
  document.getElementById("dir-delete-id").value = item.id;
  document.getElementById("dir-delete-name-text").textContent = `${item.name} (${item.role})`;
  openModal("modal-directory-delete");
}

async function confirmDeleteDirectory() {
  const id = document.getElementById("dir-delete-id").value;
  const index = directoryList.findIndex(d => String(d.id) === String(id));
  if (index === -1) return;

  const deletedItem = directoryList[index];
  closeModal("modal-directory-delete");
  if (!supabaseClient) initSupabaseClient();
  if (!supabaseClient) {
    showDeleteResult(false, "Supabase belum terhubung. Kontak tidak dihapus.");
    return;
  }

  try {
    let query = supabaseClient.from("Tabel Direktori").delete();
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const { error } = await (isUUID ? query.eq("id", id) : query.eq("name", deletedItem.name));
    if (error) throw error;

    directoryList.splice(index, 1);
    saveDirectoryData();
    renderDirectoryTable();
    showDeleteResult(true, `Kontak ${deletedItem.name} berhasil dihapus.`);
  } catch (error) {
    console.error("Supabase delete directory exception:", error);
    showDeleteResult(false, `Gagal menghapus kontak dari Supabase: ${error.message}`);
  }
}

function renderPublicDirectory() {
  const container = document.getElementById("directory-content");
  if (!container) return;

  if (!directoryList || directoryList.length === 0) {
    container.innerHTML = `
      <div class="directory-loading" style="text-align: center; padding: 48px 16px; color: var(--text-muted);">
        <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 14px; display: block; color: var(--primary-burgundy);"></i>
        <span style="font-size: 0.95rem; font-weight: 500;">Memuat data direktori dari database Supabase...</span>
      </div>
    `;
    return;
  }

  const categories = [
    { key: "gembala", title: '<i class="fa-solid fa-crown text-gold"></i> Pendeta / Gembala Jemaat' },
    { key: "officers", title: '<i class="fa-solid fa-user-gear text-burgundy"></i> Officers Jemaat' },
    { key: "majelis_dept", title: '<i class="fa-solid fa-users-line text-gold"></i> Majelis & Pengurus Departemen' }
  ];

  container.innerHTML = categories.map((cat, idx) => {
    const items = directoryList.filter(d => (d.category === "majelis_anggota" ? "majelis_dept" : d.category) === cat.key);
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
// PRAYER MODAL & CONTACT TOGGLE HELPERS
// ==========================================

/**
 * Build a WA button HTML string for a directory contact.
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

/**
 * Re-render the prayer modal content dynamically from directoryList.
 * - Pastor (category=gembala) always shown first
 * - Up to 2 contacts with show_in_prayer = true shown below
 */
function renderPrayerModal() {
  const pastorEl = document.getElementById("prayer-pastor-contact");
  const extraEl = document.getElementById("prayer-extra-contacts");
  const noContactEl = document.getElementById("prayer-no-contact");
  if (!pastorEl || !extraEl || !noContactEl) return;

  // Get pastor(s)
  const pastor = directoryList.find(isPastorContact);
  // The two optional contacts are separate from the always-visible pastor.
  const prayerContacts = directoryList
    .filter(d => !isPastorContact(d) && d.show_in_prayer === true)
    .sort((a, b) => {
      const orderA = getOfficerRoleOrder(a.role);
      const orderB = getOfficerRoleOrder(b.role);
      return orderA === orderB ? 0 : orderA - orderB;
    })
    .slice(0, 2);

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

/**
 * Toggle show_in_prayer for a directory item directly from the admin table toggle.
 */
async function togglePrayerContact(id, checked) {
  const index = directoryList.findIndex(d => String(d.id) === String(id));
  if (index === -1) return;
  if (isPastorContact(directoryList[index])) {
    directoryList[index].show_in_prayer = true;
    saveDirectoryData();
    renderDirectoryTable();
    renderPrayerModal();
    return;
  }

  if (checked && countSelectedPrayerContacts(id) >= 2) {
    showToast("Maks. 2 kontak doa sudah tercapai. Nonaktifkan salah satu dulu.", "fa-solid fa-triangle-exclamation");
    renderDirectoryTable(); // re-render to reset checkbox
    return;
  }

  directoryList[index].show_in_prayer = checked;
  saveDirectoryData();
  renderDirectoryTable();
  renderPrayerModal();

  if (!supabaseClient) initSupabaseClient();
  if (supabaseClient) {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
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
 * Handle the prayer toggle in the add/edit modal to show limit warning.
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
    checkbox.disabled = countSelectedPrayerContacts(editId) >= 2;
    if (msgEl) msgEl.style.display = "none";
    return;
  }
  const prayerCount = countSelectedPrayerContacts(editId);
  if (prayerCount >= 2) {
    checkbox.checked = false;
    if (msgEl) {
      msgEl.textContent = "Sudah ada 2 kontak doa. Nonaktifkan salah satu terlebih dahulu.";
      msgEl.style.display = "block";
    }
  } else {
    if (msgEl) msgEl.style.display = "none";
  }
}


// ==========================================
// 15. PENGUMUMAN (SUPABASE)
// ==========================================
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
