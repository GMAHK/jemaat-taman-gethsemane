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
  { num: 1, title: "Hormat Bagi Allah Baba" },
  { num: 3, title: "Suci, Suci, Suci! Tuhan Maha Kuasa" },
  { num: 12, title: "Hari Sabat yang Kudus" },
  { num: 24, title: "Pujilah Tuhan, Sang Raja" },
  { num: 45, title: "Kasih Allah Lebih Besar" },
  { num: 88, title: "Hadirat-Mu Membawa Damai" },
  { num: 110, title: "Batu Zaman yang Terbelah" },
  { num: 145, title: "Di Bawah Kepak Sayap-Nya" },
  { num: 180, title: "Yesus Kawan yang Sejati" },
  { num: 215, title: "Bekerja Selagi Hari Siang" },
  { num: 240, title: "Tuhan Beserta Engkau Sampai Bertemu Lagi" }
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

  const viewBtn = document.getElementById("btn-view-toggle");
  const appWrapper = document.getElementById("app-wrapper");
  if (viewBtn && appWrapper) {
    viewBtn.addEventListener("click", () => {
      appWrapper.classList.toggle("compact-mobile");
      const isCompact = appWrapper.classList.contains("compact-mobile");
      viewBtn.innerHTML = isCompact 
        ? '<i class="fa-solid fa-expand"></i>' 
        : '<i class="fa-solid fa-mobile-screen-button"></i>';
      showToast(isCompact ? "Tampilan Frame Mobile Aktif" : "Tampilan Layar Penuh (Full Screen) Aktif");
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
