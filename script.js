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
  initCountdown();
  initRatingSystem();
  initProgramTabs();
  initHymnal();
  initGlobalKeyboard();
  initWorshipSubTabs();
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
      const current = document.documentElement.getAttribute("data-theme");
      const nextTheme = current === "dark" ? "light" : "dark";
      setTheme(nextTheme);
    });
  }

}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("gmahk_theme", theme);
  const themeBtn = document.getElementById("btn-theme-toggle");
  if (themeBtn) {
    themeBtn.innerHTML = theme === "dark" 
      ? '<i class="fa-solid fa-sun text-gold"></i>' 
      : '<i class="fa-solid fa-moon"></i>';
  }
}

// ==========================================
// 5. TAB NAVIGATION LOGIC (SPA FEEL)
// ==========================================
function switchTab(tabId) {
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

  // Scroll main body to top smoothly
  const appBody = document.querySelector(".app-body");
  if (appBody) {
    appBody.scrollTo({ top: 0, behavior: "smooth" });
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
          { time: "09:00", name: "MC & Yel Yel Sekolah Sabat", officer: "Sdra. Misaell", type: "text" },
          { time: "09:10", name: "Lagu Buka Sekolah Sabat", officer: "", type: "song", songBook: "LSEL No.", songNo: "", songTitle: "" },
          { time: "09:15", name: "Ayat Inti SS & Doa Buka", officer: "Ibu Dyah", type: "text" },
          { time: "09:20", name: "Bacaan Berita Mission", officer: "Ibu Ummi", type: "text" },
          { time: "09:30", name: "Ringkasan Sekolah Sabat Dewasa", officer: "Bpk. Frans", type: "text", highlight: true },
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
          { time: "11:15", name: "Pembacaan Ayat Inti", officer: "Bpk. Irfan", type: "text" },
          { time: "11:18", name: "Lagu Tema", officer: "MISI KITA", type: "text" },
          { time: "11:20", name: "Khotbah / Renungan Firman Tuhan", officer: "Bpk. Agus", type: "text", highlight: true },
          { time: "11:50", name: "Lagu Tutup Kebaktian", officer: "", type: "song", songBook: "LSEL No.", songNo: "", songTitle: "" },
          { time: "11:55", name: "Doa TUTUP dan Doa BERKAT", officer: "Pdt. Benny Lumbantobing", type: "text" },
          { time: "11:58", name: "Lagu Sambutan Doa Tutup & Berkat", officer: "", type: "song", songBook: "LSEL No.", songNo: "523", songTitle: "Tuhan Dengar Doa Kami" }
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

let worshipData = JSON.parse(localStorage.getItem("gmahk_worship_data") || "null") || JSON.parse(JSON.stringify(defaultWorshipData));
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

  const isEditing = subtabEditState[key];

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
        ${isEditing ? `
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
        `}
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
            <div class="liturgy-item ${item.highlight ? 'highlight' : ''}">
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
                    ` : `
                      <input type="text" class="edit-pill-input" value="${escapeHtml(item.officer || '')}"
                        oninput="updateOfficer('${key}', ${secIdx}, ${itemIdx}, this.value)">
                    `
                  ) : (
                    item.type === 'song' ? `
                      <span class="lit-officer">${formatSongDisplay(item)}</span>
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

function handleAdminLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById("admin-email").value;
  closeModal("modal-admin-login");
  showToast(`Selamat datang Admin (${email})! Modul siap dihubungkan ke Supabase.`, "fa-solid fa-user-shield text-gold");
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
