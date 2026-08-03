// =============================================
// UTILS.JS – Reusable pure functions
// =============================================

// Standard skeleton-loading delay (ms), shared across every page that shows
// a skeleton state (home, shop, category pages, blog). Keeping this in one
// place means every page loads in the same amount of time — consistent UX
// and no unnecessary delay that could hurt Core Web Vitals / crawlability.
export const SKELETON_DELAY = 300;

// Escapes a value for safe interpolation into innerHTML templates.
// Used anywhere product/blog/search data is rendered via template strings,
// so a future dynamic/CMS-sourced data source can't introduce an XSS gap.
export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// jpg/png path ko WebP folder (assets/webp/...) ke equivalent path mein convert karta hai.
// Fallback ke liye original jpg/png <img> hamesha barqarar rehta hai (picture tag ke andar).
export function toWebP(src) {
  if (!src) return src;
  return src
    .replace('/assets/images/', '/assets/webp/')
    .replace(/\.(jpe?g|png)$/i, '.webp');
}

// =============================================
// SERVICE WORKER REGISTRATION
// utils.js is imported (directly or indirectly) by every entry script on
// the site — main.js, shop-engine.js, blog.js, post-page.js — so this
// single registration call is all that's needed to enable offline
// support + installability ("Add to Home Screen") on every page.
// Registered after 'load' so it never competes with the page's own
// critical resources for bandwidth/CPU on first paint.
// =============================================
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}

// =============================================
// "NEW CONTENT AVAILABLE" BANNER
// -------------------------------------------------------------
// Pairs with service-worker.js's stale-while-revalidate strategy: a
// returning visitor still gets their cached page instantly (fast), but
// if the service worker's background refresh finds the content actually
// changed (e.g. new products added to products.js, an edited blog post),
// it posts a message here and we show a small top banner with a Refresh
// button — so the visitor can pull the new version on demand instead of
// only getting it, unprompted, on some future visit.
//
// Lives in utils.js (not main.js) because this is the one file every
// entry script imports — main.js, shop-engine.js, blog.js, post-page.js —
// so the banner works identically on every page, including shop.html and
// the category pages that don't load main.js at all.
// =============================================
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'EBP_UPDATE_AVAILABLE') showUpdateBanner();
  });
}

let updateBannerShown = false; // avoid stacking a 2nd banner if multiple files change at once
function showUpdateBanner() {
  if (updateBannerShown) return;
  updateBannerShown = true;

  const bar = document.createElement('div');
  bar.id = 'ebpUpdateBanner';
  bar.setAttribute('role', 'status');
  bar.style.cssText =
    'position:fixed;top:0;left:0;right:0;z-index:99999;' +
    'background:#E91E63;color:#fff;text-align:center;' +
    'padding:10px 16px;font-family:inherit;font-size:0.9rem;' +
    'display:flex;align-items:center;justify-content:center;gap:12px;' +
    'flex-wrap:wrap;box-shadow:0 2px 10px rgba(0,0,0,0.15);';
  bar.innerHTML =
    '<span>🔄 New content is available.</span>' +
    '<button id="ebpUpdateRefreshBtn" style="' +
    'background:#fff;color:#E91E63;border:none;padding:6px 16px;' +
    'border-radius:20px;font-weight:600;cursor:pointer;font-size:0.85rem;">' +
    'Refresh</button>';

  const attach = () => {
    document.body.prepend(bar);
    document.getElementById('ebpUpdateRefreshBtn')?.addEventListener('click', () => {
      window.location.reload();
    });
  };
  if (document.body) attach();
  else document.addEventListener('DOMContentLoaded', attach);
}

// Format number with K suffix
export function formatNumber(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

// Category slug → display name. Single source of truth for category
// labels — used directly by shop-engine.js's product-card badges/sidebar
// and via formatCat() below by the homepage/blog cards, so the name
// shown for a category can never drift between different parts of the
// site again.
export const CAT_LABELS = {
  'skin-care': 'Skin Care', 'makeup': 'Makeup', 'hair-care': 'Hair Care',
  'fragrance': 'Fragrance', 'foot-hand-nail': 'Foot, Hand & Nail', 'personal-care': 'Personal Care'
};

// Convert category slug to display name
export function formatCat(cat) {
  return CAT_LABELS[cat] || cat;
}

// Build Amazon affiliate link
export function buildAffiliateLink(asin, AFFILIATE_TAG) {
  return `https://www.amazon.com/dp/${asin}?tag=${AFFILIATE_TAG}`;
}

// Generate star rating HTML
export function renderStars(rating) {
  let html = '<div class="stars">';
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) html += '<span class="star filled">★</span>';
    else if (rating >= i - 0.5) html += '<span class="star half">★</span>';
    else html += '<span class="star">★</span>';
  }
  return html + '</div>';
}

// Shared: init and toggle dark mode
// Guarded so that if a page loads two scripts that both call initTheme()
// (e.g. main.js + post-page.js on blog post pages), the second call is a
// harmless no-op instead of redundant work.
let themeInitialized = false;
export function initTheme() {
  if (themeInitialized) return;
  themeInitialized = true;
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  const btn = document.getElementById('darkToggle');
  if (btn) btn.innerHTML = saved === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
}

export function toggleDark() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
  const btn = document.getElementById('darkToggle');
  if (btn) btn.innerHTML = isDark ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
  localStorage.setItem('theme', isDark ? 'light' : 'dark');
}

// Shared: scroll effects (header shadow + back-to-top)
// Guarded — without this, calling initScrollEffects() twice (e.g. once
// from main.js and once from post-page.js on the same blog post page)
// registered TWO permanent `scroll` listeners, so every scroll event
// double-ran the same classList.toggle() calls. The flag below makes any
// call after the first a safe no-op instead.
let scrollEffectsInitialized = false;
export function initScrollEffects() {
  if (scrollEffectsInitialized) return;
  scrollEffectsInitialized = true;
  window.addEventListener('scroll', () => {
    document.getElementById('mainHeader')?.classList.toggle('scrolled', window.scrollY > 50);
    document.getElementById('backToTop')?.classList.toggle('show', window.scrollY > 400);
  });
}

// Shared: set footer year
export function setCurrentYear() {
  const el = document.getElementById('currentYear');
  if (el) el.textContent = new Date().getFullYear();
}

// Shared: FAQ toggle
export function toggleFaq(el) {
  const isOpen = el.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(f => f.classList.remove('open'));
  if (!isOpen) el.classList.add('open');
}

// Shared: mobile nav toggle
export function toggleMobileNav() {
  const nav = document.getElementById('mobileNav');
  const ham = document.getElementById('hamburger');
  if (!nav || !ham) return;
  const isOpen = nav.classList.toggle('show');
  ham.classList.toggle('open', isOpen);
  const spans = ham.querySelectorAll('span');
  if (isOpen) {
    spans[0].style.transform = 'translateY(7px) rotate(45deg)';
    spans[1].style.opacity = '0';
    spans[2].style.transform = 'translateY(-7px) rotate(-45deg)';
  } else {
    spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
  }
}

// Shared: basic email format check.
// None of the newsletter forms (footer, popup, sidebar, blog sidebar) sit
// inside a real <form> element — they're just an <input> + a button with
// onclick — so the browser's native type="email" validation never runs
// (that only fires on actual form submission). Without this, literally
// any text ("asdf") passed the old truthy-only check and got sent to
// EmailJS/the subscriber sheet as if it were a real address. Intentionally
// simple (not RFC 5322-complete) — just enough to catch obvious typos and
// junk input; EmailJS/the sheet is the real source of truth either way.
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

// Shared: lets an <input> submit on Enter even when it isn't inside a real
// <form> element (true of every newsletter input on the site — footer,
// popup, sidebar — they're just an <input> + a button with onclick, so
// there's no native form-submit to catch the Enter keypress). Silently
// does nothing if the input isn't on the current page.
export function enableEnterToSubmit(inputId, onSubmit) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    }
  });
}
