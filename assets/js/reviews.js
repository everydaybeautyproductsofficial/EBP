// =============================================================
// REVIEWS.JS — EverydayBeautyProducts
// Only reviews.html loads this file.
//
// EMAIL DELIVERY: uses Web3Forms instead of EmailJS. Web3Forms has no
// "template" concept at all (so no 2-template free-plan ceiling like
// EmailJS) — you just POST whatever fields you want and it emails them
// to you, free, up to 250 submissions/month. Only the inbox tied to
// your Access Key receives it; nobody else, and the reviewer is never
// emailed anything by this. Sign-up: https://web3forms.com — enter your
// email, an Access Key is emailed to you instantly, no card needed.
//
// PHOTO HANDLING: Web3Forms' free plan does not support file uploads,
// so the photo still goes through ImgBB first (free, unlimited) to get
// a public URL, which is then sent to you as plain text inside the
// Web3Forms email — same as before.
// -------------------------------------------------------------
import { reviews } from './reviews-data.js';
import { esc } from './utils.js';

// -------------------------------------------------------------
// CONFIG — fill these in once during setup (see the how-to-add
// instructions given alongside this file).
// -------------------------------------------------------------
const REVIEW_CONFIG = {
  // Get this free at https://web3forms.com (instant, no card).
  // Only the email you sign up with will ever receive these submissions.
  web3formsAccessKey: 'f5094c98-14d5-4cfd-a5cf-2d869bdc7f27',

  // Free image hosting so a photo can be attached without a server.
  // Get a free key at https://api.imgbb.com/ (takes 1 minute, no card).
  imgbbApiKey: 'de429b2df146c903bbf5286b51db19d7',

  // OPTIONAL: also saves every review as a new row in a Google Sheet, in
  // addition to the Web3Forms email (see app-script/reviews-apps-script.gs
  // for the one-time Google Sheet + Apps Script setup). Leave as-is to skip
  // this — the site works fine without it, you'll just only get the email.
  googleSheetWebhookUrl: 'https://script.google.com/macros/s/AKfycbw5tQF3dj8NyROL_Ys7xsyblJCLlGIMVl9yKHEXM_l9n_rHS1YWQ2EupmQDwaUrPMFZ/exec'
};

// -------------------------------------------------------------
// 1. RENDER SUMMARY + GRID
// -------------------------------------------------------------
function starsHTML(rating, size = '') {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    html += i <= rating
      ? '<i class="fa-solid fa-star"></i>'
      : '<i class="fa-solid fa-star ebprev-star-empty"></i>';
  }
  return html;
}

function renderSummary() {
  const scoreEl = document.getElementById('ebprevScore');
  const starsEl = document.getElementById('ebprevSummaryStars');
  const countEl = document.getElementById('ebprevCount');
  const barsEl = document.getElementById('ebprevBars');
  if (!scoreEl) return;

  const total = reviews.length;

  if (total === 0) {
    scoreEl.textContent = '—';
    starsEl.innerHTML = starsHTML(0);
    countEl.textContent = 'No reviews yet — be the first!';
    barsEl.innerHTML = '';
    return;
  }

  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const avg = sum / total;

  scoreEl.textContent = avg.toFixed(1);
  starsEl.innerHTML = starsHTML(Math.round(avg));
  countEl.textContent = `Based on ${total} review${total === 1 ? '' : 's'}`;

  let barsHTML = '';
  for (let star = 5; star >= 1; star--) {
    const count = reviews.filter(r => r.rating === star).length;
    const pct = total ? Math.round((count / total) * 100) : 0;
    barsHTML += `
      <div class="ebprev-bar-row">
        <span>${star} ★</span>
        <div class="ebprev-bar-track"><div class="ebprev-bar-fill" style="width:${pct}%"></div></div>
        <span>${count}</span>
      </div>`;
  }
  barsEl.innerHTML = barsHTML;
}

function timeAgo(dateStr) {
  const then = new Date(dateStr);
  const days = Math.floor((Date.now() - then.getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
}

// Fixed set of 6 avatar looks a reviewer can pick in the form instead of
// uploading a real face photo — illustrated avatars from DiceBear's
// "Avataaars" style (by Pablo Stanley, free for commercial use).
// 3 short-hair styles, 3 long-hair styles, so it's visually clear
// which the reviewer picked.
// Fixed set of 6 avatar looks a reviewer can pick in the form instead of
// uploading a real face photo — illustrated avatars from DiceBear's
// "Avataaars" style (by Pablo Stanley, free for commercial use).
// IMPORTANT: only the "seed" parameter is used here (no "top" or other
// options) — this is the confirmed-working URL format; adding extra
// parameters previously broke the image request.
const AVATAR_MAP = {
  a1: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ali',
  a2: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hassan',
  a3: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bilal',
  a4: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AyeshaK',
  a5: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SanaMalik',
  a6: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fatima',
};

// If the DiceBear image ever fails to load (blocked by an ad-blocker,
// offline, API down, etc.), fall back to the initials circle instead
// of showing a broken image icon.
window.ebprevAvatarFallback = function (imgEl, name) {
  const fallback = document.createElement('div');
  fallback.className = 'ebprev-avatar-fallback';
  fallback.textContent = initials(name);
  imgEl.replaceWith(fallback);
};

function avatarHTML(r) {
  if (r.avatarId && AVATAR_MAP[r.avatarId]) {
    return `<img class="ebprev-avatar" src="${AVATAR_MAP[r.avatarId]}" alt="${esc(r.name)}" loading="lazy" onerror="ebprevAvatarFallback(this, '${esc(r.name).replace(/'/g, "\\'")}')">`;
  }
  // Backward-compatible fallback for older entries with no avatarId
  return `<div class="ebprev-avatar-fallback">${esc(initials(r.name))}</div>`;
}

const PAGE_SIZE = 60;
let currentPage = 1;

function renderGrid(page = 1) {
  const grid = document.getElementById('ebprevGrid');
  const pagination = document.getElementById('ebprevPagination');
  if (!grid) return;

  if (reviews.length === 0) {
    grid.innerHTML = `
      <div class="ebprev-empty-state">
        <i class="fa-regular fa-comment-dots"></i>
        No reviews yet. Be the first to share your experience!
      </div>`;
    if (pagination) pagination.innerHTML = '';
    return;
  }

  const sorted = [...reviews].sort((a, b) => new Date(b.date) - new Date(a.date));
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  currentPage = Math.min(Math.max(1, page), totalPages);

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = sorted.slice(start, start + PAGE_SIZE);

  grid.innerHTML = pageItems.map(r => `
    <div class="ebprev-card">
      <div class="ebprev-card-head">
        ${avatarHTML(r)}
        <div>
          <div class="ebprev-card-name">${esc(r.name)}${r.verified ? '<span class="ebprev-verified-badge"><i class="fa-solid fa-circle-check"></i> Verified</span>' : ''}</div>
          <div class="ebprev-card-date">${timeAgo(r.date)}</div>
        </div>
      </div>
      <div class="ebprev-card-stars">${starsHTML(r.rating)}</div>
      <p class="ebprev-card-text">${esc(r.text)}</p>
      ${r.productImage ? `<div class="ebprev-product-photo"><img src="${esc(r.productImage)}" alt="Product photo shared by ${esc(r.name)}" loading="lazy"></div>` : ''}
    </div>
  `).join('');

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const pagination = document.getElementById('ebprevPagination');
  if (!pagination) return;

  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }

  let html = `<button class="ebprev-page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''} aria-label="Previous page"><i class="fa-solid fa-chevron-left"></i></button>`;

  const addPageBtn = (p) => {
    html += `<button class="ebprev-page-btn ${p === currentPage ? 'ebprev-active' : ''}" data-page="${p}">${p}</button>`;
  };
  const addDots = () => { html += `<span class="ebprev-page-dots">…</span>`; };

  addPageBtn(1);
  if (currentPage > 3) addDots();
  for (let p = Math.max(2, currentPage - 1); p <= Math.min(totalPages - 1, currentPage + 1); p++) addPageBtn(p);
  if (currentPage < totalPages - 2) addDots();
  if (totalPages > 1) addPageBtn(totalPages);

  html += `<button class="ebprev-page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''} aria-label="Next page"><i class="fa-solid fa-chevron-right"></i></button>`;

  pagination.innerHTML = html;
}

// Event delegation: the pagination container itself never gets
// replaced, only its innerHTML, so one listener here handles every
// button across every re-render.
function initPagination() {
  const pagination = document.getElementById('ebprevPagination');
  if (!pagination) return;
  pagination.addEventListener('click', (e) => {
    const btn = e.target.closest('.ebprev-page-btn');
    if (!btn || btn.disabled) return;
    const page = Number(btn.dataset.page);
    if (page >= 1) {
      renderGrid(page);
      document.querySelector('.ebprev-grid-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

// Modal side rails: mini review cards that auto-scroll vertically
// beside the "Write a Review" popup on wide screens (CSS handles the
// motion + hover-pause + desktop-only visibility — see reviews.css).
// The list is duplicated once so the scroll loop is seamless.
function railCardHTML(r) {
  return `
    <div class="ebprev-rail-card">
      <div class="ebprev-rail-card-head">
        ${avatarHTML(r)}
        <div>
          <div class="ebprev-rail-card-name">${esc(r.name)}</div>
          <div class="ebprev-rail-card-stars">${starsHTML(r.rating)}</div>
        </div>
      </div>
      <p class="ebprev-rail-card-text">${esc(r.text)}</p>
    </div>`;
}

function renderModalRails() {
  const leftTrack = document.getElementById('ebprevRailLeftTrack');
  const rightTrack = document.getElementById('ebprevRailRightTrack');
  if (!leftTrack || !rightTrack || reviews.length === 0) return;

  const sorted = [...reviews].sort((a, b) => new Date(b.date) - new Date(a.date));
  const leftSet = sorted.filter((_, i) => i % 2 === 0);
  const rightSet = sorted.filter((_, i) => i % 2 === 1);

  const buildTrack = (set) => {
    const list = set.length ? set : sorted;
    const html = list.map(railCardHTML).join('');
    return html + html; // duplicated so the loop scroll has no visible seam
  };

  leftTrack.innerHTML = buildTrack(leftSet);
  rightTrack.innerHTML = buildTrack(rightSet);
}

// -------------------------------------------------------------
// 2. MODAL OPEN / CLOSE
// -------------------------------------------------------------
function openReviewModal() {
  document.getElementById('ebprevOverlay')?.classList.add('ebprev-open');
  document.body.style.overflow = 'hidden';
}

function closeReviewModal() {
  document.getElementById('ebprevOverlay')?.classList.remove('ebprev-open');
  document.body.style.overflow = '';
}
window.ebprevOpenModal = openReviewModal;
window.ebprevCloseModal = closeReviewModal;

// -------------------------------------------------------------
// 3. STAR PICKER (in the form)
// -------------------------------------------------------------
let selectedRating = 0;

function initStarPicker() {
  const picker = document.getElementById('ebprevStarPicker');
  if (!picker) return;
  const buttons = [...picker.querySelectorAll('button')];

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedRating = Number(btn.dataset.value);
      buttons.forEach(b => b.classList.toggle('ebprev-active', Number(b.dataset.value) <= selectedRating));
    });
  });
}

// -------------------------------------------------------------
// 3b. AVATAR PICKER (in the form) — defaults to 'a1' (pre-selected
// in the HTML), so it's never left empty.
// -------------------------------------------------------------
let selectedAvatar = 'a1';

function initAvatarPicker() {
  const picker = document.getElementById('ebprevAvatarPicker');
  if (!picker) return;
  const buttons = [...picker.querySelectorAll('button')];

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedAvatar = btn.dataset.avatar;
      buttons.forEach(b => b.classList.toggle('ebprev-active', b === btn));
    });
  });
}

// -------------------------------------------------------------
// 4. PHOTO UPLOAD (preview + ImgBB hosting)
// -------------------------------------------------------------
let uploadedImageUrl = '';

function initPhotoUpload() {
  const input = document.getElementById('ebprevPhotoInput');
  const preview = document.getElementById('ebprevPhotoPreview');
  const btn = document.getElementById('ebprevPhotoBtn');
  if (!input || !preview || !btn) return;

  btn.addEventListener('click', () => input.click());

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;

    // Local instant preview
    const reader = new FileReader();
    reader.onload = () => {
      preview.innerHTML = `<img src="${reader.result}" alt="Product photo">`;
      preview.classList.add('ebprev-has-image');
    };
    reader.readAsDataURL(file);

    // Upload to ImgBB so we have a public URL to email
    const hasRealKey = REVIEW_CONFIG.imgbbApiKey && REVIEW_CONFIG.imgbbApiKey !== 'YOUR_IMGBB_API_KEY';
    if (!hasRealKey) {
      console.warn('ImgBB API key not set — photo will not be uploaded/emailed. See setup notes in reviews.js.');
      return;
    }

    btn.textContent = 'Uploading…';
    btn.disabled = true;
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${REVIEW_CONFIG.imgbbApiKey}`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data?.data?.url) {
        uploadedImageUrl = data.data.url;
      } else {
        console.error('ImgBB upload failed:', data);
      }
    } catch (err) {
      console.error('Photo upload error:', err);
    } finally {
      btn.textContent = 'Change Photo';
      btn.disabled = false;
    }
  });
}

// -------------------------------------------------------------
// 5. FORM SUBMIT
// -------------------------------------------------------------
function showFieldError(msg) {
  const el = document.getElementById('ebprevFormError');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('ebprev-show');
}

function clearFieldError() {
  const el = document.getElementById('ebprevFormError');
  if (!el) return;
  el.textContent = '';
  el.classList.remove('ebprev-show');
}

function initSubmit() {
  const submitBtn = document.getElementById('ebprevSubmitBtn');
  if (!submitBtn) return;

  submitBtn.addEventListener('click', async () => {
    clearFieldError();

    const name = document.getElementById('ebprevName')?.value.trim();
    const email = document.getElementById('ebprevEmail')?.value.trim();
    const text = document.getElementById('ebprevText')?.value.trim();
    const privacyChecked = document.getElementById('ebprevPrivacyCheck')?.checked;

    if (!name || !email || !text || selectedRating === 0) {
      showFieldError('Please fill in your name, email, a star rating, and your review.');
      return;
    }
    if (!privacyChecked) {
      showFieldError('Please agree to the Privacy Policy to continue.');
      return;
    }

    // Honeypot — real users never fill this
    const honeypot = document.getElementById('ebprevHp')?.value;
    if (honeypot) {
      console.warn('Spam submission blocked (honeypot).');
      showSuccessState(); // silently pretend success so bots don't retry
      return;
    }

    // Timing trap — bots submit near-instantly
    const elapsed = Date.now() - (window.__ebprevLoadedAt || 0);
    if (elapsed < 3000) {
      showFieldError('Please take a moment before submitting.');
      return;
    }

    // Turnstile check
    const turnstileWidget = document.querySelector('#ebprevOverlay .cf-turnstile');
    const hasRealKey = turnstileWidget && turnstileWidget.getAttribute('data-sitekey') !== 'YOUR_TURNSTILE_SITE_KEY';
    if (hasRealKey) {
      const token = window.turnstile ? window.turnstile.getResponse(turnstileWidget) : null;
      if (!token) {
        showFieldError('Please complete the verification checkbox.');
        return;
      }
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    const hasRealWeb3FormsKey = REVIEW_CONFIG.web3formsAccessKey && REVIEW_CONFIG.web3formsAccessKey !== 'YOUR_WEB3FORMS_ACCESS_KEY';
    if (!hasRealWeb3FormsKey) {
      console.error('Web3Forms access key not configured. See setup notes in reviews.js.');
      showFieldError('Review submissions are not fully set up yet. Please try again later.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Review';
      return;
    }

    const payload = {
      access_key: REVIEW_CONFIG.web3formsAccessKey,
      subject: `New Website Review from ${name} (${selectedRating}★)`,
      from_name: 'EBP Reviews Form',
      reviewer_name: name,
      reviewer_email: email,
      rating: `${selectedRating} / 5`,
      review_text: text,
      avatar_id: selectedAvatar,
      photo_url: uploadedImageUrl || 'No photo uploaded',
      submitted_at: new Date().toLocaleString()
    };

    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showSuccessState();

        // Also log this review into the Google Sheet, if configured.
        // Fire-and-forget: if this fails, the review still counts as
        // submitted (the email above already went through), we just
        // silently skip the Sheet copy.
        const hasSheetWebhook = REVIEW_CONFIG.googleSheetWebhookUrl
          && REVIEW_CONFIG.googleSheetWebhookUrl !== 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL';
        if (hasSheetWebhook) {
          fetch(REVIEW_CONFIG.googleSheetWebhookUrl, {
            method: 'POST',
            body: JSON.stringify({
              name,
              email,
              rating: `${selectedRating} / 5`,
              review: text,
              photoUrl: uploadedImageUrl || 'No photo uploaded'
            })
          }).catch((err) => console.warn('Google Sheet logging failed (review email already sent fine):', err));
        }
      } else {
        console.error('Web3Forms error:', data);
        showFieldError('Something went wrong sending your review. Please try again.');
      }
    } catch (err) {
      console.error('Web3Forms error:', err);
      showFieldError('Something went wrong sending your review. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Review';
      if (window.turnstile) window.turnstile.reset();
    }
  });
}

function showSuccessState() {
  document.getElementById('ebprevFormWrap').style.display = 'none';
  document.getElementById('ebprevSuccess').classList.add('ebprev-show');
}

function resetForm() {
  document.getElementById('ebprevName').value = '';
  document.getElementById('ebprevEmail').value = '';
  document.getElementById('ebprevText').value = '';
  document.getElementById('ebprevPrivacyCheck').checked = false;
  document.getElementById('ebprevPhotoPreview').innerHTML = '<i class="fa-solid fa-image"></i>';
  document.getElementById('ebprevPhotoPreview').classList.remove('ebprev-has-image');
  selectedRating = 0;
  uploadedImageUrl = '';
  selectedAvatar = 'a1';
  document.querySelectorAll('#ebprevStarPicker button').forEach(b => b.classList.remove('ebprev-active'));
  document.querySelectorAll('#ebprevAvatarPicker button').forEach((b, i) => b.classList.toggle('ebprev-active', i === 0));
  document.getElementById('ebprevFormWrap').style.display = 'block';
  document.getElementById('ebprevSuccess').classList.remove('ebprev-show');
  clearFieldError();
}
window.ebprevResetAndClose = function () {
  resetForm();
  closeReviewModal();
};

// -------------------------------------------------------------
// 6. INIT
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  window.__ebprevLoadedAt = Date.now();
  renderSummary();
  renderGrid(1);
  renderModalRails();
  initStarPicker();
  initAvatarPicker();
  initPagination();
  initPhotoUpload();
  initSubmit();
});