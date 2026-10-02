/**
 * GMAHK TAMAN GETHSEMANE - Interactive Application Logic
 * Format: Full-Screen Web App
 */

// ==========================================
// 1. DATA STRUCTURES & STATE
// ==========================================

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

let currentLightboxIndex = 0;
let userRatingScore = 0;

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
  const savedTheme = localStorage.getItem("gmahk_theme") || "light";
  setTheme(savedTheme);

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
  localStorage.setItem("gmahk_theme", theme);
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

  // Save active tab ID to localStorage
  localStorage.setItem("gmahk_active_tab", navTabId);

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

  // Restore initial tab on page load or refresh
  const initialHash = window.location.hash.replace("#", "").toLowerCase();
  const tabFromHash = hashToTabMap[initialHash] || (initialHash.startsWith("galeri-") ? "tab-gallery-viewer" : null);
  const savedTab = localStorage.getItem("gmahk_active_tab");

  if (tabFromHash) {
    if (tabFromHash === "tab-gallery-viewer") renderGalleryViewerFromHash(initialHash);
    switchTab(tabFromHash, false);
  } else if (savedTab && savedTab !== "tab-gallery-viewer" && document.getElementById(savedTab)) {
    switchTab(savedTab, true);
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
// 7. INTERACTIVE STAR RATING & LOCALSTORAGE
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

      saveUserRating(ratingObj);
      renderUserRatingView(ratingObj);
      showToast("Penilaian Anda berhasil disimpan! Terima kasih.");
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

function saveUserRating(ratingObj) {
  localStorage.setItem("gmahk_my_rating", JSON.stringify(ratingObj));

  let allRatings = JSON.parse(localStorage.getItem("gmahk_all_ratings") || "[]");
  allRatings.unshift(ratingObj);
  allRatings = allRatings.slice(0, 5);
  localStorage.setItem("gmahk_all_ratings", JSON.stringify(allRatings));

  renderCommunityReviews();
}

function loadSavedRatings() {
  const myRatingStr = localStorage.getItem("gmahk_my_rating");
  if (myRatingStr) {
    try {
      const ratingObj = JSON.parse(myRatingStr);
      userRatingScore = ratingObj.score;
      highlightStars(userRatingScore, "active");
      renderUserRatingView(ratingObj);
    } catch (e) {
      console.error(e);
    }
  }

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

  const defaultReviews = [
    { name: "Ibu Maria", score: 5, comment: "Susunan ibadah sangat rapi dan khotbah memberkati keluarga kami." },
    { name: "Bpk. David", score: 5, comment: "Fitur aplikasi sangat memudahkan melihat warta Sabat dari smartphone." }
  ];

  let allRatings = JSON.parse(localStorage.getItem("gmahk_all_ratings") || "[]");
  if (allRatings.length === 0) {
    allRatings = defaultReviews;
  }

  container.innerHTML = allRatings.map(r => `
    <div class="review-item">
      <div class="review-user">
        <span>${r.name}</span>
        <span class="review-stars">${'★'.repeat(r.score)}</span>
      </div>
      <div class="review-text">"${r.comment}"</div>
    </div>
  `).join('');
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
    modal.classList.add("active");
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("active");
  }
}

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay")) {
    e.target.classList.remove("active");
  }
});

function initGlobalKeyboard() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const activeModals = document.querySelectorAll(".modal-overlay.active");
      activeModals.forEach(m => m.classList.remove("active"));
    }
  });
}

// ==========================================
// 11. PRAYER FORM & UTILITIES
// ==========================================
function handlePrayerSubmit(e) {
  e.preventDefault();
  const name = document.getElementById("prayer-name").value;
  closeModal("modal-prayer");
  showToast(`Terima kasih Sdr/i ${name}, permohonan doa Anda telah dikirimkan ke Tim Majelis Doa.`);
  document.getElementById("prayer-form").reset();
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
const WORSHIP_DATA_VERSION = "2.8";

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
          { time: "7", name: "Lagu Tutup", officer: "", type: "song", songBook: "LSEL No.", songNo: "", songTitle: "" },
          { time: "8", name: "Promosi Pelayanan Perorangan", officer: "Ibu Tabita", type: "text" },
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
    title: "Ibadah Permintaan Doa",
    subtitle: "Rabu, 23 September 2026 | 19.00 WIB",
    dateNum: "23",
    dateMonth: "SEP",
    generalInfo: [
      { key: "Pianis", value: "Sdri. Rachel" }
    ],
    sections: [
      {
        title: "Susunan Acara Ibadah Permintaan Doa",
        items: [
          { time: "1", name: "Protokol & Doa Buka", officer: "Sdr. Alden", type: "text" },
          { time: "2", name: "Lagu Buka", officer: "", type: "song", songBook: "LSEL No.", songNo: "", songTitle: "" },
          { time: "3", name: "Kesaksian-Kesaksian", officer: "Jemaat", type: "text" },
          { time: "4", name: "Yang Didoakan", officer: "Keluarga Ibu Fenny", type: "text" },
          { time: "5", name: "Renungan", officer: "Bpk. Warno (Minggu Sembahyang Pathfinder)", type: "text", highlight: true },
          { time: "6", name: "Doa Syafaat", officer: "Ibu Yayuk", type: "text" },
          { time: "7", name: "Lagu Tutup", officer: "", type: "song", songBook: "LSEL No.", songNo: "", songTitle: "" },
          { time: "8", name: "Doa Tutup", officer: "Bpk. Warno", type: "text" },
          { time: "9", name: "Pengumuman", officer: "Ketua Jemaat / Officers Jemaat", type: "text" }
        ]
      }
    ],
    notes: [
      "Seluruh yang melayani wajib berpakaian rapi. Pria menggunakan kemeja, dasi, atau batik; wanita menggunakan rok di bawah lutut.",
      "Bagi yang berhalangan diharapkan mencari pengganti dan menginformasikannya supaya ibadah tetap berjalan dengan lancar."
    ]
  }
};

function loadWorshipData() {
  const savedVersion = localStorage.getItem("gmahk_worship_version");
  if (savedVersion !== WORSHIP_DATA_VERSION) {
    const saved = localStorage.getItem("gmahk_worship_data");
    if (saved) {
      try {
        const migratedData = JSON.parse(saved);
        migratedData["sabat-raya"] = JSON.parse(JSON.stringify(defaultWorshipData["sabat-raya"]));
        migratedData["rabu-malam"] = JSON.parse(JSON.stringify(defaultWorshipData["rabu-malam"]));
        const syncedData = syncWorshipEventNames(migratedData);
        localStorage.setItem("gmahk_worship_version", WORSHIP_DATA_VERSION);
        localStorage.setItem("gmahk_worship_data", JSON.stringify(syncedData));
        return syncedData;
      } catch (e) {
        console.warn("Migrate worship data error:", e);
      }
    }
    localStorage.setItem("gmahk_worship_version", WORSHIP_DATA_VERSION);
    localStorage.setItem("gmahk_worship_data", JSON.stringify(defaultWorshipData));
    return JSON.parse(JSON.stringify(defaultWorshipData));
  }
  const saved = localStorage.getItem("gmahk_worship_data");
  if (saved) {
    try {
      const syncedData = syncWorshipEventNames(JSON.parse(saved));
      localStorage.setItem("gmahk_worship_data", JSON.stringify(syncedData));
      return syncedData;
    } catch (e) {
      console.warn("Parse worship data error:", e);
    }
  }
  return JSON.parse(JSON.stringify(defaultWorshipData));
}

function syncWorshipEventNames(savedData) {
  const syncedData = JSON.parse(JSON.stringify(savedData));

  Object.keys(defaultWorshipData).forEach(key => {
    const defaultProgram = defaultWorshipData[key];
    const savedProgram = syncedData[key];
    if (!savedProgram || !savedProgram.sections) return;

    defaultProgram.sections.forEach((defaultSection, secIdx) => {
      const savedSection = savedProgram.sections[secIdx];
      if (!savedSection || !savedSection.items) return;

      savedSection.title = defaultSection.title;
      defaultSection.items.forEach((defaultItem, itemIdx) => {
        if (savedSection.items[itemIdx]) {
          savedSection.items[itemIdx].name = defaultItem.name;
        }
      });
    });
  });

  return syncedData;
}

let worshipData = loadWorshipData();
let subtabEditState = {
  "sabat-raya": false,
  "rabu-malam": false
};

function saveWorshipDataToStorage() {
  localStorage.setItem("gmahk_worship_data", JSON.stringify(worshipData));
}

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
                  <span class="gen-metric-value">${escapeHtml(info.value)}</span>
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

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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
  saveWorshipDataToStorage();
  renderSubTab(key);
}

function toggleEditSubTab(key) {
  subtabEditState[key] = !subtabEditState[key];
  renderSubTab(key);
  if (subtabEditState[key]) {
    showToast("Mode Edit Aktif! Ubah nama/lagu langsung di baris susunan.", "fa-solid fa-pen-to-square text-gold");
  } else {
    saveWorshipDataToStorage();
    showToast("Perubahan susunan berhasil disimpan!", "fa-solid fa-circle-check text-gold");
  }
}

function resetSubTabData(key) {
  worshipData[key] = JSON.parse(JSON.stringify(defaultWorshipData[key]));
  saveWorshipDataToStorage();
  renderSubTab(key);
  showToast("Data susunan berhasil di-reset ke semula!", "fa-solid fa-rotate-left text-gold");
}

function updateGenInfo(key, idx, val) {
  if (worshipData[key] && worshipData[key].generalInfo[idx]) {
    worshipData[key].generalInfo[idx].value = val;
    saveWorshipDataToStorage();
  }
}

function updateOfficer(key, secIdx, itemIdx, val) {
  if (worshipData[key] && worshipData[key].sections[secIdx] && worshipData[key].sections[secIdx].items[itemIdx]) {
    worshipData[key].sections[secIdx].items[itemIdx].officer = val;
    saveWorshipDataToStorage();
  }
}

function updateSermonTitle(key, secIdx, itemIdx, val) {
  if (worshipData[key] && worshipData[key].sections[secIdx] && worshipData[key].sections[secIdx].items[itemIdx]) {
    worshipData[key].sections[secIdx].items[itemIdx].sermonTitle = val;
    saveWorshipDataToStorage();
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
    saveWorshipDataToStorage();
  }
}

function updateSongNo(key, secIdx, itemIdx, val) {
  if (worshipData[key] && worshipData[key].sections[secIdx] && worshipData[key].sections[secIdx].items[itemIdx]) {
    worshipData[key].sections[secIdx].items[itemIdx].songNo = val;
    saveWorshipDataToStorage();
  }
}

function updateSongTitle(key, secIdx, itemIdx, val) {
  if (worshipData[key] && worshipData[key].sections[secIdx] && worshipData[key].sections[secIdx].items[itemIdx]) {
    worshipData[key].sections[secIdx].items[itemIdx].songTitle = val;
    saveWorshipDataToStorage();
  }
}



// ==========================================
// 13. SUPABASE INTEGRATION, ADMIN AUTH & DATABASE VIEW ENGINE
// ==========================================
const SUPABASE_URL = "https://jgrarsmzaqcviurladpm.supabase.co";
const SUPABASE_KEY = "sb_publishable_Vp2_Hx0mpyreTrfFQW-14g_NTxNBABy";
let supabaseClient = null;

function initSupabaseClient() {
  if (window.supabase && SUPABASE_URL) {
    try {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
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
        <span class="gallery-event-action">Lihat presentasi <i class="fa-solid fa-arrow-right"></i></span>
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

function moveGalleryEventOrder(eventId, direction) {
  const index = galleryOrderDraft.findIndex(event => String(event.id) === String(eventId));
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || targetIndex >= galleryOrderDraft.length) return;

  [galleryOrderDraft[index], galleryOrderDraft[targetIndex]] = [galleryOrderDraft[targetIndex], galleryOrderDraft[index]];
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
  if (!item || !window.confirm(`Hapus event "${item.title}" dari galeri?`)) return;

  const { error } = await supabaseClient.from("Kegiatan Jemaat").delete().eq("id", eventId);
  if (error) {
    showToast(`Event gagal dihapus: ${error.message}`, "fa-solid fa-triangle-exclamation");
    return;
  }

  await fetchGalleryEvents();
  showToast("Event dokumentasi dihapus.", "fa-solid fa-trash-can");
}

let isAdminLoggedIn = localStorage.getItem("is_admin_logged_in") === "true";

function initAdminState() {
  updateAdminUIState();
  syncNearestPosToWorship();
  fetchDirectoryFromSupabase();
  fetchPosFromSupabase();
  fetchSabbathProgramData();
  fetchPengumuman();
  fetchGalleryEvents();
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
  localStorage.removeItem("is_admin_logged_in");

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
  const customUrl = urlInput ? urlInput.value.trim() : "";

  if (customUrl) {
    saveSupabaseUrl(customUrl);
  }

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

  // Fallback: Built-in credentials if Supabase URL is not set or client fails to initialize
  const validAdminAccounts = [
    { email: "admin@gmahkgethsemane.org", pass: "AdminGethsemane2026!" },
    { email: "admin@gmail.com", pass: "Admin123!" },
    { email: "admin@gmahk.org", pass: "Admin123!" }
  ];

  const matchedAccount = validAdminAccounts.find(
    acc => acc.email.toLowerCase() === email.toLowerCase() && acc.pass === password
  );

  if (matchedAccount) {
    showLoginSuccess(email);
  } else {
    showLoginFailure("Email atau password admin tidak ditemukan di Supabase Auth / Kredensial Admin.");
  }

  function showLoginSuccess(userEmail) {
    if (successBanner) successBanner.style.display = "flex";
    isAdminLoggedIn = true;
    localStorage.setItem("is_admin_logged_in", "true");
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
let posScheduleList = loadPosSchedule();
let posSortField = "date";
let posSortAsc = false; // Descending by default
let posSearchQuery = "";

function loadPosSchedule() {
  const saved = localStorage.getItem("gmahk_pianist_schedule");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter(item => !/^pos-(?:[1-9]|1[0-3])$/.test(String(item.id)));
      }
    } catch (e) {
      console.warn("Failed to parse local POS schedule:", e);
    }
  }
  return [];
}

function savePosSchedule() {
  localStorage.setItem("gmahk_pianist_schedule", JSON.stringify(posScheduleList));
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
  ["lagu_tutup", "Lagu Tutup"],
  ["pp", "PP"],
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

async function shiftSabbathTableWeek(tableKey, direction) {
  const config = getSabbathTableConfig(tableKey);
  const updatedRows = config.rows.map(row => ({ ...row }));

  updatedRows.forEach(row => {
    const date = new Date(`${row.date}T00:00:00`);
    if (!Number.isNaN(date.getTime())) {
      date.setDate(date.getDate() + direction * 7);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      row.date = `${year}-${month}-${day}`;
    }
  });

  config.rows.splice(0, config.rows.length, ...updatedRows);
  renderSabbathDatabaseTable(tableKey, config.rows, config.columns);

  if (!supabaseClient) initSupabaseClient();
  if (!supabaseClient) return;
  try {
    await Promise.all(updatedRows.map(row => supabaseClient
      .from(config.table)
      .update({ date: row.date })
      .eq('id', row.id)));
  } catch (error) {
    console.warn(`Gagal menggeser ${config.table}:`, error);
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

async function deleteSabbathTableEntry(tableKey, id) {
  if (!window.confirm('Hapus data ini dari Supabase?')) return;
  const config = getSabbathTableConfig(tableKey);
  if (!supabaseClient) initSupabaseClient();
  if (!supabaseClient) return;

  try {
    const { error } = await supabaseClient.from(config.table).delete().eq('id', id);
    if (error) throw error;
    const rowIndex = config.rows.findIndex(row => String(row.id) === String(id));
    if (rowIndex >= 0) config.rows.splice(rowIndex, 1);
    renderSabbathDatabaseTable(tableKey, config.rows, config.columns);
    applySabbathDatabaseRows();
  } catch (error) {
    showToast(`Gagal menghapus data: ${error.message}`, 'fa-solid fa-triangle-exclamation');
  }
}

function getUpcomingSaturdayIso() {
  const date = getUpcomingWorshipDate(6);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getNearestSabbathRow(rows) {
  if (!rows || rows.length === 0) return null;
  const targetDate = getUpcomingSaturdayIso();
  return rows.find(row => row.date === targetDate) || [...rows]
    .filter(row => row.date >= targetDate)
    .sort((a, b) => a.date.localeCompare(b.date))[0] || null;
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
  const sabat = worshipData["sabat-raya"];
  if (!sabat) return;

  const ssRow = getNearestSabbathRow(ssScheduleList);
  const khotbahRow = getNearestSabbathRow(khotbahScheduleList);
  const ssItems = sabat.sections[0]?.items || [];
  const khotbahItems = sabat.sections[1]?.items || [];

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
    if (ssItems[6]) setSabbathSong(ssItems[6], ssRow.lagu_tutup);
    if (ssItems[7]) ssItems[7].officer = ssRow.pp || '';
    if (ssItems[8]) ssItems[8].officer = ssRow.diakon_es || '';
    if (ssItems[9]) ssItems[9].officer = ssRow.cerita_anak || '';
  }

  // Hardcode lagu-lagu paten (tidak lagi diambil dari Supabase)
  if (khotbahItems[0]) setSabbathSong(khotbahItems[0], '515');    // Lagu Pengiring Partisipan Mimbar - paten
  if (khotbahItems[1]) setSabbathSong(khotbahItems[1], '1');      // Lagu Sambutan - paten

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

  saveWorshipDataToStorage();
  renderSubTab("sabat-raya");
}

async function fetchSabbathProgramData() {
  if (!supabaseClient) initSupabaseClient();
  if (!supabaseClient) return;

  const [ssResult, khotbahResult] = await Promise.allSettled([
    supabaseClient.from("Tabel SS").select("*").order("date", { ascending: false }),
    supabaseClient.from("Tabel Khotbah").select("*").order("date", { ascending: false })
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

  applySabbathDatabaseRows();
}

function syncNearestPosToWorship() {
  if (!posScheduleList || posScheduleList.length === 0) return;

  const targetDate = getUpcomingSaturdayIso();
  const current = posScheduleList.find(item => item.date === targetDate) || [...posScheduleList]
    .filter(item => item.date >= targetDate)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
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

async function shiftPosWeek(direction) {
  const days = direction * 7;
  posScheduleList.forEach(item => {
    if (item.date) {
      const d = new Date(item.date);
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() + days);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        item.date = `${yyyy}-${mm}-${dd}`;
      }
    }
  });

  savePosSchedule();
  renderPosTable();
  const label = direction > 0 ? "+7 Hari (Maju)" : "-7 Hari (Mundur)";
  showToast(`Semua tanggal jadwal POS digeser ${label}!`, "fa-solid fa-calendar-check text-gold");

  // Sync to Supabase in background
  if (!supabaseClient) initSupabaseClient();
  if (supabaseClient) {
    try {
      for (const item of posScheduleList) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id);
        if (isUUID) {
          await supabaseClient.from("Tabel Pianis").update({ date: item.date }).eq("id", item.id);
        }
      }
    } catch (e) {
      console.warn("Supabase shift pos error:", e);
    }
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
        showToast(`Tersimpan lokal. (Supabase info: ${error.message})`, "fa-solid fa-triangle-exclamation text-amber");
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
          showToast(`Tersimpan lokal. (Supabase info: ${error.message})`, "fa-solid fa-triangle-exclamation text-amber");
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
  if (index !== -1) {
    const deletedItem = posScheduleList[index];
    const deletedDate = deletedItem.date;
    posScheduleList.splice(index, 1);
    savePosSchedule();
    closeModal("modal-pos-delete");
    renderPosTable();
    showToast(`Menghapus jadwal tanggal ${deletedDate}...`, "fa-solid fa-spinner fa-spin text-gold");

    // Sync to Supabase
    if (!supabaseClient) initSupabaseClient();
    if (supabaseClient) {
      try {
        let query = supabaseClient.from("Tabel Pianis").delete();
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
        if (isUUID) {
          query = query.eq("id", targetId);
        } else {
          query = query.eq("date", deletedDate);
        }

        const { error } = await query;
        if (error) {
          console.error("Supabase delete pos error:", error);
          showToast(`Terhapus lokal. (Supabase info: ${error.message})`, "fa-solid fa-triangle-exclamation text-amber");
        } else {
          showToast(`Jadwal POS ${deletedDate} berhasil dihapus dari Supabase & Web!`, "fa-solid fa-trash-can text-gold");
        }
      } catch (err) {
        console.error("Supabase delete pos exception:", err);
      }
    }
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

    if (nameText.includes(filter) || roleText.includes(filter)) {
      item.style.display = "flex";
    } else {
      item.style.display = "none";
    }
  });
}

// ==========================================
// 15. TABEL DIREKTORI JEMAAT & PENGURUS ENGINE (DINAMIS SUPABASE)
// ==========================================
// Data kontak sepenuhnya diambil secara aman & dinamis dari server Supabase
const defaultDirectoryList = [];

let directoryList = loadDirectoryData();
let dirSortField = "category";
let dirSortAsc = true;
let dirSearchQuery = "";
let dirCategoryFilter = "";

function loadDirectoryData() {
  const saved = localStorage.getItem("gmahk_directory_data");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Auto migrate any old majelis_anggota category to majelis_dept
        parsed.forEach(item => {
          if (item.category === "majelis_anggota") item.category = "majelis_dept";
        });
        return parsed;
      }
    } catch (e) {
      console.warn("Failed to parse local directory data:", e);
    }
  }
  return [];
}

function saveDirectoryData() {
  localStorage.setItem("gmahk_directory_data", JSON.stringify(directoryList));
  renderPublicDirectory();
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
          phone: row.phone,
          avatarIcon: getDirectoryAvatarIcon(category, row.role)
        };
      });
      saveDirectoryData();
      renderDirectoryTable();
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
        <td colspan="5" style="text-align: center; padding: 40px 16px; color: var(--text-muted);">
          <i class="fa-solid fa-address-book" style="font-size: 1.8rem; margin-bottom: 10px; display: block; opacity: 0.5;"></i>
          Tidak ada data kontak direktori yang sesuai.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(item => `
    <tr>
      <td>${getCategoryBadge(item.category)}</td>
      <td style="font-weight: 700; color: var(--text-main);">${escapeHtml(item.name)}</td>
      <td class="td-officer">${escapeHtml(item.role)}</td>
      <td>
        <a href="https://wa.me/${cleanPhoneForWa(item.phone)}" target="_blank" rel="noopener" style="color: #059669; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; font-family: monospace; font-size: 0.88rem;">
          <i class="fa-brands fa-whatsapp"></i> ${escapeHtml(item.phone)}
        </a>
      </td>
      <td class="th-actions">
        <div class="td-actions-wrap">
          <button class="btn-table-edit" onclick="openEditDirectoryModal('${item.id}')" title="Edit Kontak">Edit</button>
          <button class="btn-table-delete" onclick="openDeleteDirectoryModal('${item.id}')" title="Hapus Kontak">Hapus</button>
        </div>
      </td>
    </tr>
  `).join("");
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

async function handleSaveNewDirectory(e) {
  e.preventDefault();
  const cat = document.getElementById("dir-add-category").value;
  const name = document.getElementById("dir-add-name").value.trim();
  const role = document.getElementById("dir-add-role").value.trim();
  const phone = document.getElementById("dir-add-phone").value.trim();

  const avatarIcon = getDirectoryAvatarIcon(cat, role);

  const tempId = "dir-" + Date.now();
  const newItem = { id: tempId, category: cat, name, role, phone, avatarIcon };

  directoryList.push(newItem);
  saveDirectoryData();
  closeModal("modal-directory-add");
  renderDirectoryTable();
  showToast(`Menyimpan kontak ${name}...`, "fa-solid fa-spinner fa-spin text-gold");

  if (!supabaseClient) initSupabaseClient();
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from("Tabel Direktori").insert([{
        category: cat, name, role, phone, avatar_icon: avatarIcon
      }]).select();

      if (error) {
        showToast(`Tersimpan lokal. (Supabase info: ${error.message})`, "fa-solid fa-triangle-exclamation text-amber");
      } else if (data && data[0]) {
        newItem.id = data[0].id;
        saveDirectoryData();
        renderDirectoryTable();
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
  updateDirectoryCategoryIcon(document.getElementById("dir-edit-category"));
  document.getElementById("dir-edit-name").value = item.name;
  document.getElementById("dir-edit-role").value = item.role;
  document.getElementById("dir-edit-phone").value = item.phone;
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
    directoryList[index] = { ...directoryList[index], category: cat, name, role, phone, avatarIcon };
    saveDirectoryData();
    closeModal("modal-directory-edit");
    renderDirectoryTable();

    if (!supabaseClient) initSupabaseClient();
    if (supabaseClient) {
      try {
        let query = supabaseClient.from("Tabel Direktori").update({ category: cat, name, role, phone, avatar_icon: avatarIcon });
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        const { error } = await (isUUID ? query.eq("id", id) : query.eq("name", oldItem.name));

        if (error) {
          showToast(`Tersimpan lokal. (Supabase error: ${error.message})`, "fa-solid fa-triangle-exclamation text-amber");
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
  if (index !== -1) {
    const deletedItem = directoryList[index];
    directoryList.splice(index, 1);
    saveDirectoryData();
    closeModal("modal-directory-delete");
    renderDirectoryTable();

    if (!supabaseClient) initSupabaseClient();
    if (supabaseClient) {
      try {
        let query = supabaseClient.from("Tabel Direktori").delete();
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        const { error } = await (isUUID ? query.eq("id", id) : query.eq("name", deletedItem.name));

        if (error) {
          showToast(`Gagal hapus di Supabase: ${error.message}`, "fa-solid fa-triangle-exclamation text-amber");
        } else {
          showToast(`Kontak ${deletedItem.name} berhasil dihapus!`, "fa-solid fa-trash-can text-gold");
        }
      } catch (err) {
        console.error("Supabase delete directory exception:", err);
      }
    }
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
              <span class="directory-phone">${escapeHtml(item.phone)}</span>
            </div>
          </div>
          <a href="https://wa.me/${cleanPhoneForWa(item.phone)}" target="_blank" rel="noopener" class="btn-wa-contact"><i class="fa-brands fa-whatsapp"></i> Hubungi WA</a>
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
