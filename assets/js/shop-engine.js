/**
 * shop-engine.js
 * ─────────────────────────────────────────────────────────────────────────
 * Centralised product-listing engine shared by shop.html and all category
 * pages.  Drop this file into /js/ alongside data.js and utils.js.
 *
 * HOW TO USE ON shop.html
 * ────────────────────────
 *   import { initShopEngine } from './assets/js/shop-engine.js';
 *   initShopEngine({ pageCategory: 'all' });
 *
 * HOW TO USE ON A CATEGORY PAGE  (e.g. category/makeup.html)
 * ────────────────────────────────────────────────────────────
 *   import { initShopEngine } from '../assets/js/shop-engine.js';
 *   initShopEngine({ pageCategory: 'makeup' });
 *
 * The engine:
 *   • Reads `products` from data.js
 *   • When pageCategory !== 'all', it restricts the product pool to that
 *     category only — filters then operate within that pool.
 *   • When pageCategory === 'all', every product is in scope (original
 *     shop.html behaviour).
 *   • On category pages the "Categories" sidebar section is hidden because
 *     it has no useful function (only one category is ever shown).
 * ─────────────────────────────────────────────────────────────────────────
 */

import { products as RAW_PRODUCTS, AFFILIATE_TAG, EMAILJS_ACCOUNTS, searchData } from './data.js';
import { formatNumber, renderStars, SKELETON_DELAY, CAT_LABELS, isValidEmail, enableEnterToSubmit, toWebP, esc } from './utils.js';
import { initCookieBanner } from './consent.js';

// Record page load time — used by the footer newsletter form's spam-timing
// check below (mirrors the same trap used in main.js/ui.js).
// Guarded so this file can also be imported by Node build scripts
// (scripts/build-seo.mjs) for renderCard()/buildAffiliateLink(), where
// `window` does not exist.
if (typeof window !== 'undefined') {
  window.__pageLoadedAt = window.__pageLoadedAt || Date.now();
}



// ─── Build an Amazon affiliate link ──────────────────────────────────────
export function buildAffiliateLink(asin) {
  return `https://www.amazon.com/dp/${asin}?tag=${AFFILIATE_TAG}`;
}

// ─── Skeleton card (initial-load loading state only — same shimmer style
//     used on the homepage, so every page's first load feels consistent) ──
function skeletonCardHTML() {
  return `
    <div class="product-card" style="pointer-events:none;">
      <div class="product-card-img-wrap">
        <div class="skeleton" style="width:100%;height:220px;border-radius:var(--radius-md);"></div>
      </div>
      <div class="product-card-body" style="display:flex;flex-direction:column;gap:10px;padding-top:12px;">
        <div class="skeleton" style="height:12px;width:40%;border-radius:4px;"></div>
        <div class="skeleton" style="height:16px;width:90%;border-radius:4px;"></div>
        <div class="skeleton" style="height:16px;width:70%;border-radius:4px;"></div>
        <div class="skeleton" style="height:14px;width:55%;border-radius:4px;"></div>
        <div class="skeleton" style="height:12px;width:100%;border-radius:4px;"></div>
        <div class="skeleton" style="height:12px;width:80%;border-radius:4px;"></div>
        <div class="skeleton" style="height:20px;width:35%;border-radius:4px;margin-top:4px;"></div>
        <div class="skeleton" style="height:42px;width:100%;border-radius:50px;margin-top:6px;"></div>
      </div>
    </div>
  `;
}

// ─── Render a single product card (identical design) ─────────────────────
export function renderCard(p) {
  const discount     = p.discount ? `-${p.discount}%` : '';
  const oldPriceHtml = p.oldPrice  ? `<span class="product-old-price">$${p.oldPrice.toFixed(2)}</span>` : '';
  const primeBadge   = p.prime     ? '<span class="prime-badge">prime</span>' : '';
  const discountBadge = discount   ? `<span class="discount-badge">${discount}</span>` : '';

  return `<div class="product-card">
    <div class="product-card-img-wrap">
      <picture>
        <source srcset="${esc(toWebP(p.img))}" type="image/webp">
        <img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy" width="400" height="400">
      </picture>
      <span class="cat-badge">${esc(CAT_LABELS[p.category] || p.category)}</span>
      ${primeBadge}
      ${discountBadge}
    </div>
    <div class="product-card-body">
      <div class="product-brand">${esc(p.brand)}</div>
      <div class="product-name">${esc(p.name)}</div>
      <div class="product-rating">${renderStars(p.rating)}<span class="review-count">(${formatNumber(p.reviews)})</span></div>
      <div class="product-excerpt">${esc(p.excerpt)}</div>
      <div class="product-price-row"><span class="product-price">$${p.price.toFixed(2)}</span>${oldPriceHtml}</div>
      <a href="${buildAffiliateLink(p.asin)}" target="_blank" rel="nofollow sponsored noopener"
         class="btn-amazon" onclick="window.trackView(${p.id})">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
        Buy on Amazon
      </a>
    </div>
  </div>`;
}

// ─── Main initialiser ────────────────────────────────────────────────────
/**
 * @param {object} options
 * @param {string} options.pageCategory
 *   'all'  → shop.html (show every product, category sidebar visible)
 *   any category slug → category page (pool locked to that category,
 *                        category sidebar hidden)
 */
export function initShopEngine({ pageCategory = 'all' } = {}) {

  // The pool this page is allowed to show
  const POOL = pageCategory === 'all'
    ? RAW_PRODUCTS
    : RAW_PRODUCTS.filter(p => p.category === pageCategory);

  // ── State ────────────────────────────────────────────────────────────
  // currentCat is only relevant on shop.html (pageCategory === 'all').
  // On category pages it is always locked to pageCategory.
  let currentCat    = pageCategory;   // starts locked on category pages
  let currentRating = 0;
  let currentSort   = 'popular';
  let minPrice      = 0;
  let maxPrice      = Infinity;
  let primeOnly     = false;
  let searchQuery   = '';
  let currentPage   = 1;
  let currentView   = 'grid';
  let filteredProducts = [];
  const ITEMS_PER_PAGE = 24;

  // ── Filter + sort ────────────────────────────────────────────────────
  function filterAndSortProducts() {
    let result = POOL.filter(p => {
      // On shop.html, apply the sidebar category selection; on category
      // pages currentCat is permanently equal to pageCategory so this
      // condition is never restrictive beyond the already-filtered POOL.
      if (currentCat !== 'all' && p.category !== currentCat) return false;
      if (p.rating < currentRating)                           return false;
      if (p.price < minPrice || p.price > maxPrice)          return false;
      if (primeOnly && !p.prime)                             return false;
      if (searchQuery &&
          !p.name.toLowerCase().includes(searchQuery) &&
          !p.brand.toLowerCase().includes(searchQuery))      return false;
      return true;
    });

    if (currentSort === 'rating')      result.sort((a, b) => b.rating - a.rating);
    else if (currentSort === 'reviews') result.sort((a, b) => b.reviews - a.reviews);
    else if (currentSort === 'price-low')  result.sort((a, b) => a.price - b.price);
    else if (currentSort === 'price-high') result.sort((a, b) => b.price - a.price);
    else if (currentSort === 'newest') result.sort((a, b) => b.id - a.id);
    // 'popular' — keep original order

    return result;
  }

  // ── Render current page ───────────────────────────────────────────────
  function renderProducts() {
    filteredProducts = filterAndSortProducts();
    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    if (currentPage > totalPages) currentPage = Math.max(1, totalPages);
    const start       = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageProducts = filteredProducts.slice(start, start + ITEMS_PER_PAGE);

    const grid = document.getElementById('productGrid');
    if (grid) {
      grid.innerHTML = pageProducts.length
        ? pageProducts.map(renderCard).join('')
        : `<div class="no-results" style="grid-column:1/-1">
             <div class="icon"><i class="fa-solid fa-magnifying-glass"></i></div>
             <h3>No products found</h3>
             <p>Try adjusting your filters or search term.</p>
           </div>`;
      grid.classList.toggle('list-view', currentView === 'list');
    }
    updateResultsCount(filteredProducts.length);
    updatePaginationControls(totalPages);
    updateActiveFilterTags();
  }

  function updateResultsCount(total) {
    const el = document.getElementById('resultsCount');
    if (el) el.innerHTML = `Showing <strong>${total}</strong> product${total !== 1 ? 's' : ''}`;
  }

  // ── Pagination ────────────────────────────────────────────────────────
  function updatePaginationControls(totalPages) {
    const paginationDiv = document.querySelector('.pagination');
    if (!paginationDiv) return;
    if (totalPages <= 1) { paginationDiv.style.display = 'none'; return; }
    paginationDiv.style.display = 'flex';

    let html = `<button class="page-btn prev" data-page="prev">← Prev</button>`;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
      } else if (i === currentPage - 2 || i === currentPage + 2) {
        html += `<span style="color:var(--text-muted)">…</span>`;
      }
    }
    html += `<button class="page-btn next" data-page="next">Next →</button>`;
    paginationDiv.innerHTML = html;

    paginationDiv.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        if (page === 'prev')  currentPage = Math.max(1, currentPage - 1);
        else if (page === 'next') currentPage = Math.min(totalPages, currentPage + 1);
        else currentPage = parseInt(page, 10);
        renderProducts();
        // Bug fix: previously `el?.offsetTop - 80 ?? 0` — if el is undefined,
        // `el?.offsetTop` is undefined, but `undefined - 80` evaluates to NaN
        // *before* the `??` runs, and `??` only substitutes on null/undefined,
        // not NaN. So the fallback never actually kicked in. Compute the
        // element first and branch explicitly instead.
        const scrollTarget = document.querySelector('.products-area') || document.querySelector('.shop-layout');
        window.scrollTo({
          top: scrollTarget ? scrollTarget.offsetTop - 80 : 0,
          behavior: 'smooth',
        });
      });
    });
  }

  // ── Active filter tags ────────────────────────────────────────────────
  function updateActiveFilterTags() {
    const tags = [];

    // Category tag only shown on shop.html (where the user can change it)
    if (pageCategory === 'all' && currentCat !== 'all') {
      tags.push({
        label: CAT_LABELS[currentCat],
        clear: () => {
          currentCat = 'all';
          document.querySelectorAll('.filter-option[onclick*="setCat"]')
            .forEach((el, i) => el.classList.toggle('active', i === 0));
          applyFilters();
        },
      });
    }

    if (currentRating > 0) tags.push({
      label: `${currentRating}★+`,
      clear: () => {
        currentRating = 0;
        document.querySelectorAll('.filter-option[onclick*="setRating"]')
          .forEach((el, i) => el.classList.toggle('active', i === 0));
        applyFilters();
      },
    });

    if (primeOnly) tags.push({
      label: 'Prime Only',
      clear: () => { document.getElementById('primeOnly').checked = false; applyFilters(); },
    });

    if (minPrice > 0 || maxPrice < Infinity) tags.push({
      label: `Price $${minPrice} – $${maxPrice === Infinity ? 'any' : maxPrice}`,
      clear: () => {
        const mn = document.getElementById('minPrice');
        const mx = document.getElementById('maxPrice');
        if (mn) mn.value = '';
        if (mx) mx.value = '';
        minPrice = 0; maxPrice = Infinity;
        applyFilters();
      },
    });

    if (searchQuery) tags.push({
      label: `Search: ${searchQuery}`,
      clear: () => {
        const ss = document.getElementById('shopSearch');
        if (ss) ss.value = '';
        searchQuery = '';
        applyFilters();
      },
    });

    const container = document.getElementById('activeFilters');
    if (container) {
      container.innerHTML = tags
        .map((t, idx) => `<span class="filter-tag-active">${t.label} <button onclick="window._tempClearTag(${idx})">×</button></span>`)
        .join('');
      window._tempClearTag = idx => tags[idx].clear();
    }
  }

  // ── Sort dropdown ─────────────────────────────────────────────────────
  function initSortDropdown() {
    const sortDropdown     = document.getElementById('sortDropdown');
    if (!sortDropdown) return;
    const sortButton       = sortDropdown.querySelector('.dropdown-btn');
    const sortItems        = sortDropdown.querySelectorAll('.dropdown-item');
    const selectedSortText = document.getElementById('selectedSort');

    sortButton?.addEventListener('click', e => {
      e.stopPropagation();
      sortDropdown.classList.toggle('open');
    });

    sortItems.forEach(item => {
      item.addEventListener('click', () => {
        sortItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        currentSort = item.dataset.value;
        if (selectedSortText) selectedSortText.textContent = item.textContent;
        sortDropdown.classList.remove('open');
        currentPage = 1;
        renderProducts();
      });
    });

    document.addEventListener('click', e => {
      if (!sortDropdown.contains(e.target)) sortDropdown.classList.remove('open');
    });
  }

  window.setCat = function(cat, el) {
    // On shop.html ('all' pool) the sidebar should FILTER in place.
    // On a category page the sidebar should NAVIGATE to the chosen
    // category's own page (clicking the current category just stays put).
    if (pageCategory === 'all') {
      currentCat  = cat;
      currentPage = 1;
      document.querySelectorAll('.filter-option[data-cat]')
        .forEach(e => e.classList.remove('active'));
      if (el) el.classList.add('active');
      applyFilters();
    } else {
      if (cat === pageCategory) return; // already on this category's page
      window.location.href = cat === 'all' ? '/shop.html' : `/category/${cat}.html`;
    }
  };

  window.setRating = function(rating, el) {
    currentRating = rating;
    currentPage   = 1;
    document.querySelectorAll('.filter-option[onclick*="setRating"]').forEach(e => e.classList.remove('active'));
    if (el) el.classList.add('active');
    applyFilters();
  };

  window.applyFilters = function() {
    minPrice    = parseFloat(document.getElementById('minPrice')?.value)  || 0;
    maxPrice    = parseFloat(document.getElementById('maxPrice')?.value)  || Infinity;
    primeOnly   = document.getElementById('primeOnly')?.checked           || false;
    searchQuery = document.getElementById('shopSearch')?.value.toLowerCase().trim() || '';
    currentPage = 1;
    renderProducts();
  };

  window.clearFilters = function() {
    currentCat    = pageCategory;   // reset to page's own category (or 'all')
    currentRating = 0;
    currentSort   = 'popular';
    minPrice      = 0;
    maxPrice      = Infinity;
    primeOnly     = false;
    searchQuery   = '';
    currentPage   = 1;

    const ids = ['shopSearch', 'minPrice', 'maxPrice'];
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const pi = document.getElementById('primeOnly');
    if (pi) pi.checked = false;

    // Reset sort dropdown UI
    const selectedSortText = document.getElementById('selectedSort');
    if (selectedSortText) selectedSortText.textContent = 'Most Popular';

    document.querySelectorAll('#sortDropdown .dropdown-item').forEach((el, i) => {
      el.classList.toggle('active', i === 0);
    });

    // Reset category sidebar active state
    document.querySelectorAll('.filter-option[onclick*="setCat"]').forEach((el, i) => {
      el.classList.toggle('active', i === 0);
    });
    // Reset rating sidebar active state
    document.querySelectorAll('.filter-option[onclick*="setRating"]').forEach((el, i) => {
      el.classList.toggle('active', i === 0);
    });

    renderProducts();
  };

  window.setView = function(view) {
    currentView = view;
    document.getElementById('gridViewBtn')?.classList.toggle('active', view === 'grid');
    document.getElementById('listViewBtn')?.classList.toggle('active', view === 'list');
    const grid = document.getElementById('productGrid');
    if (grid) grid.classList.toggle('list-view', view === 'list');
  };

  window.trackView = function(productId) {
    let recent = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    if (!recent.includes(productId)) {
      recent.unshift(productId);
      recent = recent.slice(0, 5);
      localStorage.setItem('recentlyViewed', JSON.stringify(recent));
    }
  };

  // ── Search overlay helpers ────────────────────────────────────────────
  window.openSearch = function() {
    document.getElementById('searchOverlay')?.classList.add('show');
    setTimeout(() => document.getElementById('searchInput')?.focus(), 100);
  };
  window.closeSearch = function(e) {
    if (!e || e.target === document.getElementById('searchOverlay')) {
      document.getElementById('searchOverlay')?.classList.remove('show');
      const results = document.getElementById('searchResults');
      if (results) results.classList.remove('show');
      const input = document.getElementById('searchInput');
      if (input) input.value = '';
    }
  };
  // Shared matching logic — searches the FULL site (products, blog
  // articles, categories via searchData from data.js), not just this
  // page's category-scoped POOL. This is the header's global search
  // overlay (🔍 icon) — it must behave identically on every page
  // (homepage, blog, shop.html, and every category page). It is NOT the
  // same as the sidebar/hero "#shopSearch" filter box, which is meant
  // to stay scoped to the current page's product grid — that one still
  // correctly uses POOL via applyFilters(), untouched below.
  //
  // Previously this filtered against POOL, so on a category page (e.g.
  // category/skin-care.html) searching "mascara" returned nothing, even
  // though the exact same search from the homepage found it — same
  // search icon, same input, silently different results depending on
  // which page you happened to be on.
  function getGlobalSearchMatches(query) {
    const q = query.toLowerCase();
    return searchData.filter(d => d.label.toLowerCase().includes(q) || d.sub.toLowerCase().includes(q));
  }

  window.handleSearch = function(query) {
    const resultsEl = document.getElementById('searchResults');
    if (!query.trim()) { resultsEl?.classList.remove('show'); return; }
    const matches = getGlobalSearchMatches(query).slice(0, 8);

    if (!resultsEl) return;

    // Built with textContent/addEventListener instead of innerHTML +
    // inline onclick — same safe pattern used in ui.js's handleSearch
    // ("no innerHTML with user input").
    resultsEl.textContent = '';

    if (!matches.length) {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.style.cursor = 'default';

      const noResults = document.createElement('div');
      noResults.style.fontSize = '0.85rem';
      noResults.style.color = 'var(--text-muted)';
      noResults.textContent = `No results for "${query}"`;

      item.appendChild(noResults);
      resultsEl.appendChild(item);
      resultsEl.classList.add('show');
      return;
    }

    matches.forEach(m => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.addEventListener('click', () => {
        window.open(m.href, m.type === 'Product' ? '_blank' : '_self');
      });

      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = m.type;

      const info = document.createElement('div');

      const label = document.createElement('div');
      label.style.fontSize = '0.88rem';
      label.style.fontWeight = '600';
      label.style.color = 'var(--text)';
      label.textContent = m.label;

      const sub = document.createElement('div');
      sub.style.fontSize = '0.75rem';
      sub.style.color = 'var(--text-muted)';
      sub.textContent = m.sub;

      info.appendChild(label);
      info.appendChild(sub);
      item.appendChild(tag);
      item.appendChild(info);
      resultsEl.appendChild(item);
    });

    resultsEl.classList.add('show');
  };
  window.handleSearchKey = function(e) {
    if (e.key === 'Escape') closeSearch();
    if (e.key === 'Enter')  performSearch();
  };
  // Enter key now navigates to the top global match (product, article,
  // or category) — same behaviour as clicking the first item in the
  // dropdown, and the same behaviour ui.js gives on the homepage/blog.
  // Previously this applied the query as a same-page product filter
  // (via applyFilters()), which — like handleSearch above — was scoped
  // to this page's category pool and could never surface a blog article
  // or a product from a different category.
  window.performSearch = function() {
    const input = document.getElementById('searchInput');
    const q = input?.value.trim();
    if (!q) return;

    const matches = getGlobalSearchMatches(q);
    if (!matches.length) {
      window.handleSearch(q);
      return;
    }

    const top = matches[0];
    window.open(top.href, top.type === 'Product' ? '_blank' : '_self');
    closeSearch();
  };

  // ── Dark mode ─────────────────────────────────────────────────────────
  window.toggleDark = function() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    const btn = document.getElementById('darkToggle');
    if (btn) btn.innerHTML = isDark
      ? '<i class="fa-solid fa-moon"></i>'
      : '<i class="fa-solid fa-sun"></i>';
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
  };

  function initTheme() {
    const saved = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    const btn = document.getElementById('darkToggle');
    if (btn) btn.innerHTML = saved === 'dark'
      ? '<i class="fa-solid fa-sun"></i>'
      : '<i class="fa-solid fa-moon"></i>';
  }

  // ── Mobile nav ────────────────────────────────────────────────────────
  window.toggleMobileNav = function() {
    const nav = document.getElementById('mobileNav');
    const ham = document.getElementById('hamburger');
    if (!nav || !ham) return;
    const isOpen = nav.classList.toggle('show');
    const spans  = ham.querySelectorAll('span');
    if (isOpen) {
      spans[0].style.transform = 'translateY(7px) rotate(45deg)';
      spans[1].style.opacity   = '0';
      spans[2].style.transform = 'translateY(-7px) rotate(-45deg)';
    } else {
      spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
    }
  };

  // ── Footer newsletter ─────────────────────────────────────────────────
  // Uses the same shared newsletter@ EmailJS account as ui.js
  // (EMAILJS_ACCOUNTS.newsletter from data.js) — no duplicated config here.
  const SUBSCRIBER_SHEET_ENDPOINT_SHOP = 'https://script.google.com/macros/s/AKfycbwWxcMENmyi9NtAnxiyn_HcRVNYla47qxpb_ns5mNr4l2fXJLRP1dbkg_DVlRL9V-VV/exec';

  window.footerSubscribe = function() {
    const emailInput = document.getElementById('footerEmail');
    const email = emailInput?.value.trim();
    if (!email) return;
    if (!isValidEmail(email)) {
      alert('Please enter a valid email address.');
      return;
    }

    // Spam check #1: honeypot — bots fill this hidden field, humans never see it.
    if (document.getElementById('hp_footer')?.value) {
      if (emailInput) emailInput.value = '';
      return; // silently drop
    }
    // Spam check #2: timing trap — real humans take a few seconds minimum.
    if (Date.now() - (window.__pageLoadedAt || 0) < 3000) {
      alert('Please take a moment before submitting.');
      return;
    }
    // Spam check #3: already subscribed this session — the timing trap
    // only blocks the *first* rapid-fire attempt, so a human could still
    // wait 3s and resubmit the form indefinitely. This flag stops that.
    // Tracked per-email (same 'subscribedEmails' list used by ui.js) so a
    // *different* email typed on the same browser/device is never
    // incorrectly blocked — only a repeat of the same email is.
    const emailKey = email.toLowerCase();
    const getSubscribedList = () => {
      try { return JSON.parse(localStorage.getItem('subscribedEmails') || '[]'); }
      catch { return []; }
    };
    const addToSubscribedList = () => {
      try {
        const list = getSubscribedList();
        if (!list.includes(emailKey)) list.push(emailKey);
        localStorage.setItem('subscribedEmails', JSON.stringify(list));
      } catch { /* ignore (private mode etc.) */ }
    };

    if (getSubscribedList().includes(emailKey)) {
      alert("You're already subscribed! Check your inbox for the welcome email.");
      if (emailInput) emailInput.value = '';
      return;
    }

    fetch(SUBSCRIBER_SHEET_ENDPOINT_SHOP, {
      method: 'POST',
      body: JSON.stringify({ email, name: '' })
    }).catch(() => {});

    if (!window.emailjs) {
      addToSubscribedList();
      alert('Thank you for subscribing!');
      if (emailInput) emailInput.value = '';
      return;
    }

    const nl = EMAILJS_ACCOUNTS.newsletter;
    emailjs.send(nl.serviceId, nl.welcomeTemplateId, {
      firstName: '', email: email, source: 'footer-shop'
    }, { publicKey: nl.publicKey })
      .then(() => {
        addToSubscribedList();
        alert('Thank you for subscribing! Check your inbox for a welcome email.');
        if (emailInput) emailInput.value = '';
      })
      .catch(() => alert('Something went wrong. Please try again.'));
  };

  // ── Back-to-top button ────────────────────────────────────────────────
  function initBackToTop() {
    const btn = document.getElementById('backToTop');
    if (!btn) return;
    window.addEventListener('scroll', () => btn.classList.toggle('show', window.scrollY > 200));
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // ── Sidebar (mobile) ──────────────────────────────────────────────────
  function initSidebar() {
    const mobileFilterBtn = document.querySelector('.mobile-filter-btn');
    const closeBtn        = document.querySelector('.close-sidebar');
    const sidebar         = document.querySelector('.sidebar');

    mobileFilterBtn?.addEventListener('click', () => sidebar?.classList.add('show'));
    closeBtn?.addEventListener('click',        () => sidebar?.classList.remove('show'));

    document.addEventListener('click', e => {
      if (sidebar?.classList.contains('show') &&
          !sidebar.contains(e.target) &&
          !mobileFilterBtn?.contains(e.target)) {
        sidebar.classList.remove('show');
      }
    });
  }

  // ── Loader ────────────────────────────────────────────────────────────
  window.addEventListener('load', () => {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
  });

  // ── FAQ accordion (used on category pages) ───────────────────────────
  window.toggleFaq = function(el) {
    const isOpen = el.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(f => f.classList.remove('open'));
    if (!isOpen) el.classList.add('open');
  };

  // ── Header scroll class ───────────────────────────────────────────────
  window.addEventListener('scroll', () => {
    document.getElementById('mainHeader')?.classList.toggle('scrolled', window.scrollY > 50);
  });

  // ── AUTO CATEGORY COUNTS ─────────────────────────────────────────────
  // Counts products per category directly from RAW_PRODUCTS (data.js)
  // and updates every sidebar element that has a data-cat attribute.
  // Runs on EVERY page (shop.html AND every category page) — no manual
  // number updates needed ever, on any file.
  function updateCategoryCounts() {
    // Build a count map: { 'skin-care': 88, 'makeup': 120, ... }
    const counts = { all: RAW_PRODUCTS.length };
    RAW_PRODUCTS.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });

    // Find every sidebar filter-option that has data-cat and update its
    // inner <span class="cat-count"> with the real number.
    document.querySelectorAll('.filter-option[data-cat]').forEach(el => {
      const cat   = el.dataset.cat;
      const span  = el.querySelector('.cat-count');
      if (span && counts[cat] !== undefined) {
        span.textContent = counts[cat];
      }
    });
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────
  function init() {
    // shop.html and category/*.html only load this shared engine (not
    // main.js), so the cookie banner + consent flow had never been wired
    // up here. Without this: new visitors never saw the "Accept All"
    // banner (the markup used to live only on index.html), returning
    // visitors who'd already accepted got no GA4/Meta Pixel on these
    // pages, and affiliate-click tracking (wired up inside loadAnalytics())
    // never ran on the pages that generate the most Amazon clicks.
    initCookieBanner();

    initTheme();
    const yearEl = document.getElementById('currentYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
    initSortDropdown();
    initSidebar();
    initBackToTop();

    // Wire search input in shop hero
    document.getElementById('shopSearch')?.addEventListener('input', () => window.applyFilters());

    // Enter key support for the footer newsletter input — it isn't inside
    // a real <form> (see enableEnterToSubmit in utils.js), so without this
    // typing an email and pressing Enter did nothing; only clicking
    // "Subscribe" worked.
    enableEnterToSubmit('footerEmail', () => window.footerSubscribe());

    // Auto-fill category counts from data.js — no more manual numbers!
    updateCategoryCounts();

    // Initial-load skeleton (same SKELETON_DELAY used everywhere else on
    // the site, so every page's first load feels consistent). This only
    // runs once here — every later re-render (filters, sort, search,
    // pagination) calls renderProducts() directly and stays instant.
    const grid = document.getElementById('productGrid');
    if (grid) {
      grid.innerHTML = Array(8).fill(skeletonCardHTML()).join('');
      setTimeout(renderProducts, SKELETON_DELAY);
    } else {
      renderProducts();
    }
  }

  init();
}