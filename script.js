/**
 * GMAHK TAMAN GETHSEMANE - Interactive Application Logic
 * Format: Full-Screen Web App
 */

// ==========================================
// 1. DATA STRUCTURES & STATE
// ==========================================

// Gallery Data for Lightbox Modal
const galleryData = [
  {
    src: "https://images.unsplash.com/photo-1548625361-18569c76251b?auto=format&fit=crop&w=1200&q=80",
    title: "Gedung Gereja Perdana (1992)",
    desc: "Suasana peletakan batu pertama dan pembangunan awal tempat ibadah GMAHK Taman Gethsemane."
  },
  {
    src: "https://images.unsplash.com/photo-1510563800743-aed236490d08?auto=format&fit=crop&w=1200&q=80",
    title: "Kebaktian Sabat Pertama",
    desc: "Persekutuan suci jemaat mula-mula dengan penuh sukacita dan kehangatan persaudaraan."
  },
  {
    src: "https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=1200&q=80",
    title: "Tim Paduan Suara Jemaat (2010)",
    desc: "Pelayanan pujian dan musik rohani yang memperindah ibadah Sabat."
  },
  {
    src: "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&w=1200&q=80",
    title: "Kegiatan Bakti Sosial Masyarakat",
    desc: "Wujud kepedulian jemaat kepada sesama masyarakat Taman Gethsemane melalui pembagian sembako & pengobatan gratis."
  }
];

// Sample Hymnal / Lagu Zion Collection
const hymnalSongs = [
  { num: 1, title: "Di Hadapan Hadirat-Mu (LSEL 1)" },
  { num: 3, title: "Suci, Suci, Suci! Tuhan Maha Kuasa" },
  { num: 12, title: "Hari Sabat yang Kudus" },
  { num: 24, title: "Pujilah Tuhan, Sang Raja" },
  { num: 45, title: "Kasih Allah Lebih Besar" },
  { num: 88, title: "Hadirat-Mu Membawa Damai" },
  { num: 110, title: "Batu Zaman yang Terbelah" },
  { num: 145, title: "Di Bawah Kepak Sayap-Nya" },
  { num: 180, title: "Yesus Kawan yang Sejati" },
  { num: 215, title: "Bekerja Selagi Hari Siang" },
  { num: 240, title: "Tuhan Beserta Engkau Sampai Bertemu Lagi" },
  { num: 260, title: "Bawa Persembahanmu (LSEL 260)" },
  { num: 515, title: "Tuhan Ada Dalam Bait Allah (LSEL 515)" },
  { num: 520, title: "Kami Datang Dalam Doa (LSEL 520)" },
  { num: 523, title: "Tuhan Dengar Doa Kami (LSEL 523)" }
];

let currentLightboxIndex = 0;
let userRatingScore = 0;

// ==========================================
// 2. INITIALIZATION ON DOM LOAD
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initRouter();
  initCountdown();
  initRatingSystem();
  initProgramTabs();
  initHymnal();
  initGlobalKeyboard();
  initWorshipSubTabs();
  initAdminState();
  renderPublicDirectory();
});

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
  "tab-donate": "persembahan"
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
  "donate": "tab-donate"
};

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

  const targetNavBtn = document.getElementById(`nav-${tabId}`);
  if (targetNavBtn) {
    targetNavBtn.classList.add("active");
  }

  // Save active tab ID to localStorage
  localStorage.setItem("gmahk_active_tab", tabId);

  // Update URL Hash and Browser History
  const hash = tabToHashMap[tabId] || "beranda";
  if (updateHistory) {
    if (window.location.hash !== `#${hash}`) {
      window.history.pushState({ tabId: tabId }, "", `#${hash}`);
    }
  }

  // Scroll main body to top smoothly
  const appBody = document.querySelector(".app-body");
  if (appBody) {
    appBody.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function initRouter() {
  // Listen for browser Back / Forward buttons and mobile back gestures
  window.addEventListener("popstate", (e) => {
    if (e.state && e.state.tabId) {
      switchTab(e.state.tabId, false);
    } else {
      const hash = window.location.hash.replace("#", "").toLowerCase();
      const tabId = hashToTabMap[hash] || "tab-home";
      switchTab(tabId, false);
    }
  });

  window.addEventListener("hashchange", () => {
    const hash = window.location.hash.replace("#", "").toLowerCase();
    const tabId = hashToTabMap[hash];
    if (tabId) {
      switchTab(tabId, false);
    }
  });

  // Restore initial tab on page load or refresh
  const initialHash = window.location.hash.replace("#", "").toLowerCase();
  const tabFromHash = hashToTabMap[initialHash];
  const savedTab = localStorage.getItem("gmahk_active_tab");

  if (tabFromHash) {
    switchTab(tabFromHash, false);
  } else if (savedTab && document.getElementById(savedTab)) {
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
      target.setHours(8, 30, 0, 0);
      if (now > target) {
        daysUntilSaturday = 7;
      }
    }

    target.setDate(now.getDate() + daysUntilSaturday);
    target.setHours(8, 30, 0, 0);

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
    star.addEventListener("mouseover", function() {
      const val = parseInt(this.getAttribute("data-value"));
      highlightStars(val, "hover");
    });

    star.addEventListener("mouseout", function() {
      highlightStars(userRatingScore, "active");
    });

    star.addEventListener("click", function() {
      userRatingScore = parseInt(this.getAttribute("data-value"));
      highlightStars(userRatingScore, "active");
      const labels = ["", "Kurang", "Cukup", "Baik", "Sangat Baik", "Luar Biasa & Diberkati!"];
      if (scoreLabel) scoreLabel.textContent = `Nilai: ${userRatingScore}/5 (${labels[userRatingScore]})`;
    });
  });

  if (ratingForm) {
    ratingForm.addEventListener("submit", function(e) {
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
    btn.addEventListener("click", function() {
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
        <span class="hymnal-num">Lagu Zion No. ${s.num}</span>
        <div class="hymnal-title">${s.title}</div>
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
    s.num.toString().includes(query) || s.title.toLowerCase().includes(query)
  );
  renderHymnalList(filtered);
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

function openLightbox(index) {
  if (index < 0 || index >= galleryData.length) return;
  currentLightboxIndex = index;

  const item = galleryData[currentLightboxIndex];
  const modal = document.getElementById("lightbox-modal");
  const img = document.getElementById("lightbox-img");
  const title = document.getElementById("lightbox-title");
  const desc = document.getElementById("lightbox-desc");

  if (img) img.src = item.src;
  if (title) title.textContent = item.title;
  if (desc) desc.textContent = item.desc;

  if (modal) modal.classList.add("active");
}

function closeLightbox() {
  const modal = document.getElementById("lightbox-modal");
  if (modal) modal.classList.remove("active");
}

function navigateLightbox(direction) {
  let newIndex = currentLightboxIndex + direction;
  if (newIndex < 0) newIndex = galleryData.length - 1;
  if (newIndex >= galleryData.length) newIndex = 0;
  openLightbox(newIndex);
}

function initGlobalKeyboard() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeLightbox();
      const activeModals = document.querySelectorAll(".modal-overlay.active");
      activeModals.forEach(m => m.classList.remove("active"));
    } else if (e.key === "ArrowLeft") {
      const modal = document.getElementById("lightbox-modal");
      if (modal && modal.classList.contains("active")) navigateLightbox(-1);
    } else if (e.key === "ArrowRight") {
      const modal = document.getElementById("lightbox-modal");
      if (modal && modal.classList.contains("active")) navigateLightbox(1);
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
const WORSHIP_DATA_VERSION = "2.3";

const defaultWorshipData = {
  "sabat-raya": {
    title: "Ibadah Sabat Raya",
    subtitle: "Sabtu, 15 Agustus 2026",
    dateNum: "15",
    dateMonth: "AGT",
    generalInfo: [
      { key: "Pianist", value: "Sdra. Meakhel" },
      { key: "Operator", value: "Sdra. Fabian" },
      { key: "Soundman", value: "Sdra. Fahrell" }
    ],
    sections: [
      {
        title: "II. Ibadah Sekolah Sabat (09:00 – 10:30)",
        items: [
          { time: "09:00", name: "Pemimpin Acara", officer: "Sdra. Misaell", type: "text" },
          { time: "09:10", name: "Lagu Buka Sekolah Sabat", officer: "", type: "song", songBook: "LSEL No.", songNo: "", songTitle: "" },
          { time: "09:15", name: "Ayat Inti SS & Doa Buka", officer: "Ibu Dyah", type: "text" },
          { time: "09:20", name: "Bacaan Berita Mission", officer: "Ibu Ummi", type: "text" },
          { 
            time: "09:30", 
            name: "Diskusi Sekolah Sabat", 
            type: "group", 
            highlight: true,
            subItems: [
              { label: "Orang Muda", officer: "Sdra. Rolando" },
              { label: "Orang Tua", officer: "Bpk. Frans" }
            ] 
          },
          { time: "09:55", name: "Lagu Pujian", officer: "-", type: "text" },
          { time: "10:00", name: "Promosi Pelayanan Perorangan", officer: "Bpk. Micky K", type: "text" },
          { time: "10:10", name: "Lagu Tutup Sekolah Sabat", officer: "", type: "song", songBook: "LSEL No.", songNo: "", songTitle: "" },
          { time: "10:15", name: "Doa Tutup Sekolah Sabat", officer: "Bpk. Micky K", type: "text" },
          { time: "10:20", name: "Pengumuman Jemaat", officer: "Tua-Tua / Officers Jemaat", type: "text" },
          { time: "10:25", name: "Cerita Alkitab Anak-Anak", officer: "-", type: "text" }
        ]
      },
      {
        title: "III. Ibadah Khotbah (10:30 – 12:00)",
        items: [
          { time: "10:30", name: "Diakon & Diakones Bertugas", officer: "Sdra. Ricky & Sdra. Jimmy", type: "text" },
          { time: "10:35", name: "Pemimpin Lagu", officer: "Ibu Dyah", type: "text" },
          { time: "10:38", name: "Lagu Pengiring Partisipan Mimbar", officer: "", type: "song", songBook: "LSEL No.", songNo: "515", songTitle: "Tuhan Ada Dalam Bait Allah" },
          { time: "10:40", name: "Lagu Sambutan", officer: "", type: "song", songBook: "LSEL No.", songNo: "1", songTitle: "Di Hadapan Hadirat-Mu" },
          { time: "10:43", name: "Doa Buka", officer: "Bpk. Agus", type: "text" },
          { time: "10:46", name: "Pembacaan Ayat Bersahutan", officer: "Sdra. Rolando", type: "text" },
          { time: "10:50", name: "Lagu Buka Kebaktian", officer: "", type: "song", songBook: "LSEL No.", songNo: "", songTitle: "" },
          { time: "10:55", name: "Lagu Pengantar Doa Syafaat", officer: "", type: "song", songBook: "LSEL No.", songNo: "520", songTitle: "Kami Datang Dalam Doa" },
          { time: "10:58", name: "Doa Syafaat Bersama", officer: "Sdra. Rolando", type: "text" },
          { time: "11:05", name: "Bacaan Persembahan & Persepuluhan", officer: "Bpk. Irfan", type: "text" },
          { time: "11:08", name: "Lagu Persembahan", officer: "", type: "song", songBook: "LSEL No.", songNo: "260", songTitle: "Bawa Persembahanmu" },
          { time: "11:12", name: "Doa Persembahan", officer: "Bpk. Irfan", type: "text" },
          { time: "11:15", name: "Pembacaan Ayat Inti & Visi Misi", officer: "Bpk. Irfan", type: "text" },
          { time: "11:18", name: "Lagu Tema", officer: "MISI KITA", type: "text" },
          { time: "11:20", name: "Khotbah / Renungan Firman Tuhan", officer: "Bpk. Agus", type: "text", highlight: true },
          { time: "11:50", name: "Lagu Tutup Kebaktian", officer: "", type: "song", songBook: "LSEL No.", songNo: "", songTitle: "" },
          { time: "11:55", name: "Doa Tutup", officer: "Pdt. Benny Lumbantobing", type: "text" },
          { time: "11:58", name: "Lagu Sambutan Doa Tutup", officer: "", type: "song", songBook: "LSEL No.", songNo: "523", songTitle: "Tuhan Dengar Doa Kami" }
        ]
      }
    ]
  },
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
  "rabu-malam": {
    title: "Persekutuan Doa Rabu Malam",
    subtitle: "Rabu, 19 Agustus 2026",
    dateNum: "19",
    dateMonth: "AGT",
    generalInfo: [
      { key: "Host / Moderator", value: "Sdra. Ricky" }
    ],
    sections: [
      {
        title: "Susunan Acara Persekutuan Doa",
        items: [
          { time: "1", name: "Host", officer: "-", type: "text" },
          { time: "2", name: "MC & Doa Buka", officer: "-", type: "text" },
          { time: "3", name: "Kesaksian", officer: "-", type: "text" },
          { time: "4", name: "Lagu Pujian", officer: "Host", type: "text" },
          { time: "5", name: "Doa Syafaat", officer: "-", type: "text" },
          { time: "6", name: "Firman Tuhan", officer: "-", type: "text", highlight: true },
          { time: "7", name: "Doa Tutup", officer: "-", type: "text" },
          { time: "8", name: "Ucapan Terima Kasih & Pengumuman", officer: "Ketua Jemaat", type: "text" }
        ]
      }
    ]
  }
};

function loadWorshipData() {
  const savedVersion = localStorage.getItem("gmahk_worship_version");
  if (savedVersion !== WORSHIP_DATA_VERSION) {
    localStorage.setItem("gmahk_worship_version", WORSHIP_DATA_VERSION);
    localStorage.setItem("gmahk_worship_data", JSON.stringify(defaultWorshipData));
    return JSON.parse(JSON.stringify(defaultWorshipData));
  }
  const saved = localStorage.getItem("gmahk_worship_data");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.warn("Parse worship data error:", e);
    }
  }
  return JSON.parse(JSON.stringify(defaultWorshipData));
}

let worshipData = loadWorshipData();
let subtabEditState = {
  "sabat-raya": false,
  "pa": false,
  "rabu-malam": false
};

function saveWorshipDataToStorage() {
  localStorage.setItem("gmahk_worship_data", JSON.stringify(worshipData));
}

function initWorshipSubTabs() {
  renderSubTab("sabat-raya");
  renderSubTab("pa");
  renderSubTab("rabu-malam");
}

function renderSubTab(key) {
  const container = document.getElementById(`subtab-container-${key}`);
  if (!container) return;

  const data = worshipData[key];
  if (!data) return;

  const isEditing = isAdminLoggedIn && subtabEditState[key];

  let html = `
    <div class="subtab-header-card">
      <div class="subtab-header-left">
        <div class="subtab-header-titles">
          <h3>${data.title}</h3>
          <div class="subtab-date-pill">
            <i class="fa-solid fa-calendar-day text-gold"></i>
            <span>${data.subtitle}</span>
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
                  <h5>${item.name}</h5>
                </div>
                <div class="lit-right">
                  ${isEditing ? (
                    item.type === 'song' ? `
                      <div class="edit-song-group">
                        <span class="song-icon"><i class="fa-solid fa-music text-gold"></i></span>
                        <input type="text" class="song-no-pill" placeholder="No." value="${escapeHtml(item.songNo || '')}"
                          oninput="updateSongNo('${key}', ${secIdx}, ${itemIdx}, this.value)">
                        <input type="text" class="song-title-pill" placeholder="Judul Lagu..." value="${escapeHtml(item.songTitle || '')}"
                          oninput="updateSongTitle('${key}', ${secIdx}, ${itemIdx}, this.value)">
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
                      <input type="text" class="edit-pill-input" value="${escapeHtml(item.officer || '')}"
                        oninput="updateOfficer('${key}', ${secIdx}, ${itemIdx}, this.value)">
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
                      <span class="lit-officer">${escapeHtml(item.officer || '-')}</span>
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

  container.innerHTML = html;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatSongDisplay(item) {
  if (!item.songNo && !item.songTitle) return '-';
  const book = item.songBook || 'LSEL No.';
  let res = `${book} ${item.songNo || ''}`;
  if (item.songTitle) {
    res += `: - "${item.songTitle}"`;
  }
  return res;
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



function openEditSubTabModal(programName) {
  const keyMap = { "Sabat Raya": "sabat-raya", "Pemuda Advent": "pa", "Rabu Malam": "rabu-malam" };
  const key = keyMap[programName] || "sabat-raya";
  toggleEditSubTab(key);
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

let isAdminLoggedIn = localStorage.getItem("is_admin_logged_in") === "true";

function initAdminState() {
  updateAdminUIState();
  syncNearestPosToWorship();
  fetchDirectoryFromSupabase();
  fetchPosFromSupabase();
}

function updateAdminUIState() {
  const btnAdmin = document.getElementById("btn-admin-login");
  const btnText = document.getElementById("admin-btn-text");
  const btnIcon = document.getElementById("admin-btn-icon");
  
  if (!isAdminLoggedIn) {
    subtabEditState = {
      "sabat-raya": false,
      "pa": false,
      "rabu-malam": false
    };
  }

  // Refresh worship subtabs so edit buttons toggle dynamically
  renderSubTab("sabat-raya");
  renderSubTab("pa");
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
  
  // Default to POS table tab
  switchAdminDbTab("pos");
  renderPosTable();
  fetchDirectoryFromSupabase();
  fetchPosFromSupabase();
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
    supabaseClient.auth.signOut().catch(() => {});
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
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        showLoginFailure(error.message || "Gagal masuk Supabase. Periksa Email & Password.");
        return;
      }

      if (data && data.user) {
        showLoginSuccess(data.user.email);
        return;
      }
    } catch (err) {
      showLoginFailure("Gagal menghubungi Supabase: " + err.message);
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
  }
}

// ==========================================
// 14. TABEL POS (PIANIST, OPERATOR, SOUNDMAN) ENGINE
// ==========================================
const defaultPosSchedule = [
  { id: "pos-1", date: "2026-09-26", pianist: "Sdra. Meakhel", operator: "Sdra. Fabian", soundman: "Sdra. Fahrell" },
  { id: "pos-2", date: "2026-09-19", pianist: "Sdra. Fabian", operator: "Sdra. Misaell", soundman: "Sdra. Meakhel" },
  { id: "pos-3", date: "2026-09-12", pianist: "Sdra. Meakhel", operator: "Sdra. Fahrell", soundman: "Sdra. Misaell" },
  { id: "pos-4", date: "2026-09-05", pianist: "Sdra. Fabian", operator: "Sdra. Meakhel", soundman: "Sdra. Fahrell" },
  { id: "pos-5", date: "2026-08-29", pianist: "Sdra. Meakhel", operator: "Sdra. Misaell", soundman: "Sdra. Fabian" },
  { id: "pos-6", date: "2026-08-22", pianist: "Sdra. Fabian", operator: "Sdra. Fahrell", soundman: "Sdra. Misaell" },
  { id: "pos-7", date: "2026-08-15", pianist: "Sdra. Meakhel", operator: "Sdra. Fabian", soundman: "Sdra. Fahrell" },
  { id: "pos-8", date: "2026-08-08", pianist: "Sdra. Fabian", operator: "Sdra. Misaell", soundman: "Sdra. Meakhel" },
  { id: "pos-9", date: "2026-08-01", pianist: "Sdra. Meakhel", operator: "Sdra. Fahrell", soundman: "Sdra. Fabian" },
  { id: "pos-10", date: "2026-07-25", pianist: "Sdra. Fabian", operator: "Sdra. Meakhel", soundman: "Sdra. Misaell" },
  { id: "pos-11", date: "2026-07-18", pianist: "Sdra. Meakhel", operator: "Sdra. Misaell", soundman: "Sdra. Fahrell" },
  { id: "pos-12", date: "2026-07-11", pianist: "Sdra. Fabian", operator: "Sdra. Fahrell", soundman: "Sdra. Meakhel" },
  { id: "pos-13", date: "2026-07-04", pianist: "Sdra. Meakhel", operator: "Sdra. Fabian", soundman: "Sdra. Misaell" }
];

let posScheduleList = loadPosSchedule();
let posSortField = "date";
let posSortAsc = false; // Descending by default
let posSearchQuery = "";

function loadPosSchedule() {
  const saved = localStorage.getItem("gmahk_pos_schedule");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.warn("Failed to parse local POS schedule:", e);
    }
  }
  return [...defaultPosSchedule];
}

function savePosSchedule() {
  localStorage.setItem("gmahk_pos_schedule", JSON.stringify(posScheduleList));
  syncNearestPosToWorship();
}

async function fetchPosFromSupabase() {
  if (!supabaseClient) initSupabaseClient();
  if (!supabaseClient) return;

  try {
    const { data, error } = await supabaseClient
      .from("pos_schedule")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      console.warn("Supabase fetch pos_schedule error:", error.message);
      return;
    }

    if (data && data.length > 0) {
      posScheduleList = data.map(row => ({
        id: row.id,
        date: row.date,
        pianist: row.pianist,
        operator: row.operator,
        soundman: row.soundman
      }));
      savePosSchedule();
      renderPosTable();
    }
  } catch (err) {
    console.warn("Error fetching pos_schedule from Supabase:", err);
  }
}

function syncNearestPosToWorship() {
  if (!posScheduleList || posScheduleList.length === 0) return;
  
  const sorted = [...posScheduleList].sort((a, b) => new Date(b.date) - new Date(a.date));
  const current = sorted[0];
  if (current && worshipData && worshipData["sabat-raya"]) {
    worshipData["sabat-raya"].generalInfo = [
      { key: "Pianist", value: current.pianist },
      { key: "Operator", value: current.operator },
      { key: "Soundman", value: current.soundman }
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
           (item.pianist && item.pianist.toLowerCase().includes(q)) ||
           (item.operator && item.operator.toLowerCase().includes(q)) ||
           (item.soundman && item.soundman.toLowerCase().includes(q));
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
      <td class="td-officer">${escapeHtml(item.operator)}</td>
      <td class="td-officer">${escapeHtml(item.soundman)}</td>
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
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function sortPosTable(field) {
  if (posSortField === field) {
    posSortAsc = !posSortAsc;
  } else {
    posSortField = field;
    posSortAsc = (field !== "date");
  }

  const fields = ["date", "pianist", "operator", "soundman"];
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
          await supabaseClient.from("pos_schedule").update({ date: item.date }).eq("id", item.id);
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
  const operatorInput = document.getElementById("pos-add-operator");
  const soundmanInput = document.getElementById("pos-add-soundman");

  const tempId = "pos-" + Date.now();
  const newItem = {
    id: tempId,
    date: dateInput ? dateInput.value : "",
    pianist: pianistInput ? pianistInput.value.trim() : "",
    operator: operatorInput ? operatorInput.value.trim() : "",
    soundman: soundmanInput ? soundmanInput.value.trim() : ""
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
      const { data, error } = await supabaseClient.from("pos_schedule").insert([{
        date: newItem.date,
        pianist: newItem.pianist,
        operator: newItem.operator,
        soundman: newItem.soundman
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
  const operatorInput = document.getElementById("pos-edit-operator");
  const soundmanInput = document.getElementById("pos-edit-soundman");

  if (idInput) idInput.value = item.id;
  if (dateInput) dateInput.value = item.date;
  if (pianistInput) pianistInput.value = item.pianist;
  if (operatorInput) operatorInput.value = item.operator;
  if (soundmanInput) soundmanInput.value = item.soundman;

  openModal("modal-pos-edit");
}

async function handleUpdatePos(e) {
  e.preventDefault();
  const idInput = document.getElementById("pos-edit-id");
  const dateInput = document.getElementById("pos-edit-date");
  const pianistInput = document.getElementById("pos-edit-pianist");
  const operatorInput = document.getElementById("pos-edit-operator");
  const soundmanInput = document.getElementById("pos-edit-soundman");

  const targetId = idInput ? idInput.value : "";
  const index = posScheduleList.findIndex(p => String(p.id) === String(targetId));

  if (index !== -1) {
    const oldItem = { ...posScheduleList[index] };
    posScheduleList[index] = {
      id: targetId,
      date: dateInput ? dateInput.value : posScheduleList[index].date,
      pianist: pianistInput ? pianistInput.value.trim() : "",
      operator: operatorInput ? operatorInput.value.trim() : "",
      soundman: soundmanInput ? soundmanInput.value.trim() : ""
    };

    savePosSchedule();
    closeModal("modal-pos-edit");
    renderPosTable();
    showToast(`Memperbarui jadwal tanggal ${posScheduleList[index].date}...`, "fa-solid fa-spinner fa-spin text-gold");

    // Sync to Supabase
    if (!supabaseClient) initSupabaseClient();
    if (supabaseClient) {
      try {
        let query = supabaseClient.from("pos_schedule").update({
          date: posScheduleList[index].date,
          pianist: posScheduleList[index].pianist,
          operator: posScheduleList[index].operator,
          soundman: posScheduleList[index].soundman
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
        let query = supabaseClient.from("pos_schedule").delete();
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

function handleSubTabEditSubmit(e) {
  e.preventDefault();
  const progName = document.getElementById("edit-program-name").value;
  closeModal("modal-edit-subtab");
  showToast(`Perubahan susunan ${progName} berhasil disimpan! Siap sync ke Supabase.`, "fa-solid fa-floppy-disk text-gold");
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

async function fetchDirectoryFromSupabase() {
  if (!supabaseClient) initSupabaseClient();
  if (!supabaseClient) return;

  try {
    const { data, error } = await supabaseClient
      .from("directory")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("Supabase fetch directory error:", error.message);
      return;
    }

    if (data && data.length > 0) {
      directoryList = data.map(row => ({
        id: row.id,
        category: (row.category === "majelis_anggota" ? "majelis_dept" : row.category),
        name: row.name,
        role: row.role,
        phone: row.phone,
        avatarIcon: row.avatar_icon || "fa-user-shield"
      }));
      saveDirectoryData();
      renderDirectoryTable();
    }
  } catch (err) {
    console.warn("Error fetching directory from Supabase:", err);
  }
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

async function handleSaveNewDirectory(e) {
  e.preventDefault();
  const cat = document.getElementById("dir-add-category").value;
  const name = document.getElementById("dir-add-name").value.trim();
  const role = document.getElementById("dir-add-role").value.trim();
  const phone = document.getElementById("dir-add-phone").value.trim();

  let avatarIcon = "fa-user-shield";
  if (cat === "gembala") avatarIcon = "fa-user-tie";
  else if (role.toLowerCase().includes("sekretaris")) avatarIcon = "fa-file-signature";
  else if (role.toLowerCase().includes("bendahara")) avatarIcon = "fa-vault";
  else if (role.toLowerCase().includes("musik")) avatarIcon = "fa-music";

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
      const { data, error } = await supabaseClient.from("directory").insert([{
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
    directoryList[index] = { ...directoryList[index], category: cat, name, role, phone };
    saveDirectoryData();
    closeModal("modal-directory-edit");
    renderDirectoryTable();

    if (!supabaseClient) initSupabaseClient();
    if (supabaseClient) {
      try {
        let query = supabaseClient.from("directory").update({ category: cat, name, role, phone });
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
        let query = supabaseClient.from("directory").delete();
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
            <div class="directory-avatar"><i class="fa-solid ${item.avatarIcon || 'fa-user-shield'}"></i></div>
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
