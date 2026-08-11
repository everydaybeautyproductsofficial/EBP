// =============================================
// UI.JS – Rendering, state, DOM updates, and exposed globals
// =============================================
import { AFFILIATE_TAG, products, blogPosts, searchData, EMAILJS_ACCOUNTS } from './data.js';
import { formatNumber, formatCat, buildAffiliateLink, renderStars, SKELETON_DELAY, isValidEmail, enableEnterToSubmit, toWebP, esc } from './utils.js';

// -------------------- State --------------------
let currentCategory = 'all';
let currentSort = 'popular';
let currentRating = 'all';

// =============================================
// SKELETON HELPERS
// Ye functions temporary "loading" placeholders
// banate hain jab tak real data load na ho jaye.
// CSS mein .skeleton class already defined hai
// jo shimmer animation chalati hai.
// =============================================

// Product card ka skeleton — bilkul real card jitna bada
function productSkeletonHTML() {
  return `
    <div class="product-card" style="pointer-events:none;">
      <div class="product-card-img-wrap">
        <!-- Image area ka placeholder -->
        <div class="skeleton" style="width:100%;height:220px;border-radius:var(--radius-md);"></div>
      </div>
      <div class="product-card-body" style="display:flex;flex-direction:column;gap:10px;padding-top:12px;">
        <!-- Brand name ki line -->
        <div class="skeleton" style="height:12px;width:40%;border-radius:4px;"></div>
        <!-- Product name ki line -->
        <div class="skeleton" style="height:16px;width:90%;border-radius:4px;"></div>
        <!-- Doosri name line (2 line naam ke liye) -->
        <div class="skeleton" style="height:16px;width:70%;border-radius:4px;"></div>
        <!-- Stars rating ki line -->
        <div class="skeleton" style="height:14px;width:55%;border-radius:4px;"></div>
        <!-- Excerpt / description ki line -->
        <div class="skeleton" style="height:12px;width:100%;border-radius:4px;"></div>
        <div class="skeleton" style="height:12px;width:80%;border-radius:4px;"></div>
        <!-- Price ki line -->
        <div class="skeleton" style="height:20px;width:35%;border-radius:4px;margin-top:4px;"></div>
        <!-- Buy on Amazon button ka placeholder -->
        <div class="skeleton" style="height:42px;width:100%;border-radius:50px;margin-top:6px;"></div>
      </div>
    </div>
  `;
}

// Blog card ka skeleton — bilkul real blog card jitna bada
function blogSkeletonHTML() {
  return `
    <div class="blog-card" style="pointer-events:none;">
      <div class="blog-card-img">
        <!-- Blog image ka placeholder -->
        <div class="skeleton" style="width:100%;height:200px;border-radius:var(--radius-md) var(--radius-md) 0 0;"></div>
      </div>
      <div class="blog-card-body" style="display:flex;flex-direction:column;gap:10px;padding:16px;">
        <!-- Author + date ki line -->
        <div class="skeleton" style="height:12px;width:60%;border-radius:4px;"></div>
        <!-- Blog title ki pehli line -->
        <div class="skeleton" style="height:18px;width:95%;border-radius:4px;"></div>
        <!-- Blog title ki doosri line -->
        <div class="skeleton" style="height:18px;width:75%;border-radius:4px;"></div>
        <!-- Excerpt ki lines -->
        <div class="skeleton" style="height:12px;width:100%;border-radius:4px;"></div>
        <div class="skeleton" style="height:12px;width:85%;border-radius:4px;"></div>
        <!-- Read More button ka placeholder -->
        <div class="skeleton" style="height:14px;width:30%;border-radius:4px;margin-top:4px;"></div>
      </div>
    </div>
  `;
}

// -------------------- Rendering functions --------------------

// Real product card HTML banata hai
export function renderProductCard(p) {
  const link = buildAffiliateLink(p.asin, AFFILIATE_TAG);
  return `
    <div class="product-card reveal" data-category="${esc(p.category)}" data-price="${p.price}" data-rating="${p.rating}">
      <div class="product-card-img-wrap">
        <picture>
          <source srcset="${esc(toWebP(p.img))}" type="image/webp">
          <img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy" width="400" height="400">
        </picture>
        <span class="cat-badge">${esc(formatCat(p.category))}</span>
        ${p.prime ? '<span class="prime-badge">prime</span>' : ''}
        ${p.discount ? `<span class="discount-badge">-${p.discount}%</span>` : ''}
      </div>
      <div class="product-card-body">
        <div class="product-brand">${esc(p.brand)}</div>
        <div class="product-name">${esc(p.name)}</div>
        <div class="product-rating">
          ${renderStars(p.rating)}
          <span class="review-count">(${formatNumber(p.reviews)})</span>
        </div>
        <div class="product-excerpt">${esc(p.excerpt)}</div>
        <div class="product-price-row">
          <span class="product-price">$${p.price.toFixed(2)}</span>
          ${p.oldPrice ? `<span class="product-old-price">$${p.oldPrice.toFixed(2)}</span>` : ''}
        </div>
        <a href="${link}" target="_blank" rel="nofollow sponsored noopener" class="btn-amazon" onclick="trackView(${p.id})">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          Buy on Amazon
        </a>
      </div>
    </div>
  `;
}

// Real blog card HTML banata hai
export function renderBlogCard(post) {
  const date = new Date(post.createdAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
  return `
    <div class="blog-card reveal">
      <div class="blog-card-img">
        <picture>
          <source srcset="${esc(toWebP(post.img))}" type="image/webp">
          <img src="${esc(post.img)}" alt="${esc(post.title)}" loading="lazy" width="600" height="375">
        </picture>
        <span class="blog-cat-badge">${esc(post.category)}</span>
      </div>
      <div class="blog-card-body">
        <div class="blog-meta">
          <div class="author-chip">
            <div class="author-avatar">${esc((post.author?.name ?? post.author ?? '').charAt(0))}</div>
            <span><strong>${esc(post.author?.name ?? post.author)}</strong></span>
          </div>
          <span><i class="fa-regular fa-calendar"></i> ${date}</span>
        </div>
        <h3 class="blog-card-title">${esc(post.title)}</h3>
        <p class="blog-card-excerpt">${esc(post.excerpt)}</p>
        <a href="${esc(post.href)}" class="blog-read-more">
          Read Article <span>→</span>
        </a>
      </div>
    </div>
  `;
}

// Filtering aur sorting logic — kuch nahi badla
function getFilteredProducts() {
  let filtered = [...products];
  if (currentCategory !== 'all') filtered = filtered.filter(p => p.category === currentCategory);
  if (currentRating !== 'all') filtered = filtered.filter(p => p.rating >= currentRating);
  if (currentSort === 'price-low') filtered.sort((a, b) => a.price - b.price);
  else if (currentSort === 'price-high') filtered.sort((a, b) => b.price - a.price);
  else if (currentSort === 'rating') filtered.sort((a, b) => b.rating - a.rating);
  else if (currentSort === 'reviews') filtered.sort((a, b) => b.reviews - a.reviews);
  else if (currentSort === 'newest') filtered.sort((a, b) => b.id - a.id);
  return filtered;
}

// =============================================
// renderMainGrid
// showSkeleton=true  → pehli/initial load par 6 skeleton cards dikhata hai,
//                      phir SKELETON_DELAY (utils.js, sab pages mein same)
//                      ke baad real products se replace karta hai.
// showSkeleton=false → filter/sort/rating change hone par turant (instant)
//                      real products dikhata hai, koi artificial delay nahi.
//                      (Pehle har filter click par 1.5s ka fake wait tha,
//                      ab sirf pehli load par ek dafa skeleton dikhta hai.)
// =============================================
export function renderMainGrid(showSkeleton = true) {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  const render = () => {
    const filtered = getFilteredProducts().slice(0, 30);
    grid.innerHTML = filtered.map(renderProductCard).join('');
    initReveal();
  };

  if (showSkeleton) {
    grid.innerHTML = Array(6).fill(productSkeletonHTML()).join('');
    setTimeout(render, SKELETON_DELAY);
  } else {
    render();
  }
}

// =============================================
// renderTopRated
// Pehle 4 skeleton cards dikhata hai (top rated section mein),
// phir SKELETON_DELAY ke baad real top-rated products se replace karta hai.
// =============================================
export function renderTopRated() {
  const topGrid = document.getElementById('topRatedGrid');
  if (topGrid) {
    // Step 1: 4 skeleton cards show karo
    topGrid.innerHTML = Array(4).fill(productSkeletonHTML()).join('');

    // Step 2: Real data se replace karo
    setTimeout(() => {
      const sorted = [...products].sort((a, b) => b.rating - a.rating).slice(0, 10);
      topGrid.innerHTML = sorted.map(renderProductCard).join('');
      initReveal();
    }, SKELETON_DELAY);
  }
}

// =============================================
// renderBlog
// Pehle 3 skeleton blog cards dikhata hai,
// phir SKELETON_DELAY ke baad real blog posts se replace karta hai.
// =============================================
export function renderBlog() {
  const blogGrid = document.getElementById('blogGrid');
  if (blogGrid) {
    // Step 1: 3 skeleton blog cards show karo
    blogGrid.innerHTML = Array(3).fill(blogSkeletonHTML()).join('');

    // Step 2: Real blog posts se replace karo
    setTimeout(() => {
      blogGrid.innerHTML = blogPosts.slice(0, 9).map(renderBlogCard).join('');
      initReveal();
    }, SKELETON_DELAY);
  }
}

// =============================================
// renderRecentlyViewed
// Is mein skeleton nahi lagaya kyunki ye section
// sirf tab dikhta hai jab user ne pehle koi product
// dekha ho — agar localStorage empty hai to section
// hide rehta hai, skeleton ki zaroorat nahi.
// =============================================
export function renderRecentlyViewed() {
  let recentlyViewed;
  try {
    recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
  } catch {
    recentlyViewed = [];
  }
  if (!recentlyViewed.length) return;
  const section = document.getElementById('recentlyViewed');
  const grid = document.getElementById('recentlyViewedGrid');
  if (!grid) return;
  const items = recentlyViewed.map(id => products.find(p => p.id === id)).filter(Boolean);
  if (!items.length) return;
  grid.innerHTML = items.map(renderProductCard).join('');
  if (section) section.classList.add('has-items');
  initReveal();
}

// -------------------- Scroll Reveal --------------------
// Ye function page pe cards ko scroll karte waqt
// smoothly fade-in karta hai — kuch nahi badla
export function initReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => observer.observe(el));
}

// -------------------- Global handlers --------------------
// Neeche saare window functions bilkul same hain —
// inhe bilkul touch nahi kiya gaya

window.filterCategory = function(cat, btn) {
  currentCategory = cat;
  document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderMainGrid(false); // instant — data already loaded, no need to fake-load again
};

window.sortProducts = function(val) {
  currentSort = val;
  renderMainGrid(false); // instant
};

window.filterRating = function(val, btn) {
  currentRating = val;
  document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderMainGrid(false); // instant
};

window.toggleDropdown = function() {
  document.getElementById("sortDropdown")?.classList.toggle("open");
};

window.selectSort = function(value, label, el) {
  document.getElementById("selectedSort").innerText = label;
  document.querySelectorAll(".dropdown-item").forEach(item => item.classList.remove("active"));
  if (el) el.classList.add("active");
  document.getElementById("sortDropdown")?.classList.remove("open");
  window.sortProducts(value);
};

window.trackView = function(productId) {
  let recentlyViewed;
  try {
    recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
  } catch {
    recentlyViewed = [];
  }
  if (!recentlyViewed.includes(productId)) {
    recentlyViewed.unshift(productId);
    recentlyViewed = recentlyViewed.slice(0, 5);
    localStorage.setItem('recentlyViewed', JSON.stringify(recentlyViewed));
  }
};

// Shared matching logic — used by both the live-typing dropdown (handleSearch)
// and Enter-key search (performSearch), so both behave consistently.
function getSearchMatches(query) {
  const q = query.toLowerCase();
  return searchData.filter(d => d.label.toLowerCase().includes(q) || d.sub.toLowerCase().includes(q));
}

window.handleSearch = function(query) {
  const resultsEl = document.getElementById('searchResults');
  if (!query.trim()) { resultsEl?.classList.remove('show'); return; }
  const matches = getSearchMatches(query).slice(0, 8);

  if (!resultsEl) return;

  // Clear previous results safely (no innerHTML with user input).
  resultsEl.textContent = '';

  if (!matches.length) {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.style.cursor = 'default';

    const noResults = document.createElement('div');
    noResults.style.fontSize = '0.85rem';
    noResults.style.color = 'var(--text-muted)';
    // textContent, NOT innerHTML — query is untrusted user input (e.g. ?q=<script>),
    // so this must never be parsed as HTML.
    noResults.textContent = `No results for "${query}"`;

    item.appendChild(noResults);
    resultsEl.appendChild(item);
    resultsEl.classList.add('show');
    return;
  }

  matches.forEach(m => {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    // addEventListener instead of an inline onclick="" string — avoids
    // building an executable attribute out of data values.
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
  if (e.key === 'Escape') window.closeSearch();
  if (e.key === 'Enter') window.performSearch();
};

// Enter key ka press ab real kaam karta hai — pehle sirf ek placeholder
// alert dikhata tha ("Connect this to your CMS/backend"). Ab live dropdown
// jaisi hi matching logic use karke top result par navigate karta hai
// (bilkul waisa jaisa user us result par click karay), aur agar koi match
// na mile to results dropdown mein real "no results" message dikhata hai.
window.performSearch = function() {
  const input = document.getElementById('searchInput');
  const q = input?.value.trim();
  if (!q) return;

  const matches = getSearchMatches(q);
  if (!matches.length) {
    // No results — reuse handleSearch so the same empty-state UI shows.
    window.handleSearch(q);
    return;
  }

  // Go to the top (best) match — same behaviour as clicking the first
  // item in the live dropdown.
  const top = matches[0];
  window.open(top.href, top.type === 'Product' ? '_blank' : '_self');
  window.closeSearch();
};

window.openSearch = function() {
  const overlay = document.getElementById('searchOverlay');
  if (overlay) {
    overlay.classList.add('show');
    setTimeout(() => document.getElementById('searchInput')?.focus(), 100);
  }
};

window.closeSearch = function(e) {
  if (!e || e.target === document.getElementById('searchOverlay')) {
    const overlay = document.getElementById('searchOverlay');
    if (overlay) overlay.classList.remove('show');
    const results = document.getElementById('searchResults');
    if (results) results.classList.remove('show');
    const input = document.getElementById('searchInput');
    if (input) input.value = '';
  }
};

// =============================================
// EMAILJS INTEGRATION — NEWSLETTER
// Footer / newsletter-section / popup — teeno forms
// isi se subscribe karte hain aur EmailJS ke zariye
// Gmail se ek branded "Welcome" email bhejte hain.
//
// Newsletter emails always go through the dedicated newsletter@ EmailJS
// account (its own Public Key, Service ID, and Welcome Template ID),
// which lives centrally in data.js as EMAILJS_ACCOUNTS.newsletter.
// =============================================
window.NEWSLETTER_TEMPLATE_ID = EMAILJS_ACCOUNTS.newsletter.welcomeTemplateId;

// Google Apps Script web-app URL (Deploy > New deployment > Web app),
// deployed under the newsletter@ Gmail account.
// Yahan subscriber emails save hote hain, jinhe weekly/monthly newsletter
// bheji jati hai (separate se Apps Script time-trigger ke through).
const SUBSCRIBER_SHEET_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwWxcMENmyi9NtAnxiyn_HcRVNYla47qxpb_ns5mNr4l2fXJLRP1dbkg_DVlRL9V-VV/exec';

// Subscriber ko Google Sheet me bhi add karte hain (fire-and-forget —
// agar yeh fail ho jaye to bhi welcome email pe asar nahi padna chahiye).
function addToSubscriberSheet(email, name) {
  fetch(SUBSCRIBER_SHEET_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify({ email, name: name || '' })
  }).catch(() => {
    // Silent fail — Sheet me add na ho sake to bhi welcome email
    // already chala gaya hota hai, user ko error nahi dikhana.
  });
}

// Newsletter form me sirf email field hota hai (firstName nahi),
// isliye template ke {{firstName}} ko khaali rakhte hain — template
// design ismein bhi theek dikhna chahiye.
function sendNewsletterWelcome(email, source) {
  addToSubscriberSheet(email, '');
  const nl = EMAILJS_ACCOUNTS.newsletter;
  return emailjs.send(nl.serviceId, nl.welcomeTemplateId, {
    firstName: '',
    email: email,
    source: source
  }, { publicKey: nl.publicKey });
}

// Exposed on window so page-specific scripts loaded after main.js
// (e.g. blog.js on blog.html) can reuse the exact same EmailJS +
// Subscriber Sheet logic instead of duplicating it or faking success.
window.sendNewsletterWelcome = sendNewsletterWelcome;

// =============================================
// CUSTOM "THANK YOU" POPUP
// Dynamically banta hai isliye har page
// par alag se HTML add karne ki zaroorat nahi.
// =============================================
function showThankYouPopup(title, message) {
  let modal = document.getElementById('thankYouPopup');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'thankYouPopup';
    modal.className = 'popup-overlay';
    modal.innerHTML = `
      <div class="popup-box">
        <button class="popup-close" onclick="window.closeThankYouPopup()" aria-label="Close">×</button>
        <div class="popup-emoji"><picture><source srcset="${toWebP('/assets/images/logo.png')}" type="image/webp"><img src="/assets/images/logo.png" alt="EverydayBeautyProducts Logo"></picture></div>
        <h3 id="thankYouTitle"></h3>
        <p id="thankYouMessage"></p>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) window.closeThankYouPopup();
    });
  }
  modal.querySelector('#thankYouTitle').textContent = title;
  modal.querySelector('#thankYouMessage').textContent = message;
  modal.classList.add('show');
}

window.closeThankYouPopup = function() {
  const modal = document.getElementById('thankYouPopup');
  if (modal) modal.classList.remove('show');
};

// Shared spam guard for all newsletter-style forms (footer, popup, sidebar,
// newsletter-section). Checks:
//  1) Honeypot — hidden field only bots fill in.
//  2) Timing trap — blocks submissions under 3s after page load.
// Returns true if the submission looks like spam (caller should stop).
function isSpamSubmission(honeypotId) {
  if (document.getElementById(honeypotId)?.value) return true;
  if (Date.now() - (window.__pageLoadedAt || 0) < 3000) {
    alert('Please take a moment before submitting.');
    return true;
  }
  return false;
}

// Exposed on window (same reasoning as sendNewsletterWelcome above) so
// page-specific scripts loaded after main.js — e.g. blog.js's sidebar
// subscribe handler on blog.html — can reuse this shared spam guard
// instead of skipping it or duplicating the logic.
window.isSpamSubmission = isSpamSubmission;

// The 3s timing trap in isSpamSubmission() only stops the *first* bot
// submission — nothing stopped a human from just waiting 3s and hitting
// "Subscribe" over and over. This adds a simple "already subscribed"
// localStorage list: once a subscribe call succeeds for a given email,
// every newsletter form (footer, popup, sidebar, blog sidebar)
// short-circuits *that same email* instead of re-sending. Tracked per
// email (not a single global flag) so a different email typed on the
// same browser/device (shared computer, different family member, etc.)
// is never incorrectly blocked. Not bulletproof (clearing storage
// resets it) but stops casual repeat-submits without needing
// server-side rate limiting.
const NEWSLETTER_FLAG = 'subscribedEmails';

function hasAlreadySubscribed(email) {
  try {
    const list = JSON.parse(localStorage.getItem(NEWSLETTER_FLAG) || '[]');
    return list.includes(String(email).trim().toLowerCase());
  } catch { return false; }
}

function markSubscribed(email) {
  try {
    const key = String(email).trim().toLowerCase();
    const list = JSON.parse(localStorage.getItem(NEWSLETTER_FLAG) || '[]');
    if (!list.includes(key)) list.push(key);
    localStorage.setItem(NEWSLETTER_FLAG, JSON.stringify(list));
  } catch { /* ignore (private mode etc.) */ }
}

window.hasAlreadySubscribed = hasAlreadySubscribed;
window.markSubscribed = markSubscribed;

window.footerSubscribe = function() {
  const emailInput = document.getElementById('footerEmail');
  const email = emailInput?.value.trim();
  if (!email) return;
  if (!isValidEmail(email)) {
    alert('Please enter a valid email address.');
    return;
  }
  if (isSpamSubmission('hp_footer')) return;
  if (hasAlreadySubscribed(email)) {
    showThankYouPopup('Already subscribed', "You're already on the list! Check your inbox for the welcome email.");
    if (emailInput) emailInput.value = '';
    return;
  }
  sendNewsletterWelcome(email, 'footer')
    .then(() => {
      markSubscribed(email);
      showThankYouPopup('Subscribed!', 'Thank you for subscribing! Check your inbox for a welcome email.');
      if (emailInput) emailInput.value = '';
    })
    .catch(() => alert('Something went wrong. Please try again.'));
};

window.subscribeNewsletter = function(e) {
  e.preventDefault();
  if (isSpamSubmission('hp_newsletter')) return;
  const input = e.target.querySelector('input[type="email"]');
  const email = input?.value.trim();
  if (!email) return;
  if (!isValidEmail(email)) {
    alert('Please enter a valid email address.');
    return;
  }
  if (hasAlreadySubscribed(email)) {
    showThankYouPopup('Already subscribed', "You're already on the list! Check your inbox for the welcome email.");
    e.target.reset();
    return;
  }
  sendNewsletterWelcome(email, 'newsletter-section')
    .then(() => {
      markSubscribed(email);
      showThankYouPopup('Welcome!', 'Thank you for subscribing! Welcome to the EverydayBeautyProducts family.');
      e.target.reset();
    })
    .catch(() => alert('Something went wrong. Please try again.'));
};

window.subscribePopup = function() {
  const emailInput = document.getElementById('popupEmail');
  const email = emailInput?.value.trim();
  if (!email) return;
  if (!isValidEmail(email)) {
    alert('Please enter a valid email address.');
    return;
  }
  if (isSpamSubmission('hp_popup')) return;
  window.closePopup();
  if (hasAlreadySubscribed(email)) {
    showThankYouPopup('Already subscribed', "You're already on the list! Check your inbox for the welcome email.");
    if (emailInput) emailInput.value = '';
    return;
  }
  sendNewsletterWelcome(email, 'popup')
    .then(() => {
      markSubscribed(email);
      showThankYouPopup('You\'re in!', 'Check your inbox for a welcome gift.');
      if (emailInput) emailInput.value = '';
    })
    .catch(() => alert('Something went wrong. Please try again.'));
};

window.closePopup = function() {
  const popup = document.getElementById('newsletterPopup');
  if (popup) popup.classList.remove('show');
  localStorage.setItem('popupShown', '1');
};

// Sidebar "Get Beauty Deals" widget — used on every individual blog
// post page (blog/*.html), input id="sidebarEmail". Was previously
// referenced via onclick="sidebarSubscribe()" but never defined —
// the button did nothing and threw a console error. Fixed to use the
// same EmailJS + Subscriber Sheet flow as the footer/popup forms.
window.sidebarSubscribe = function() {
  const emailInput = document.getElementById('sidebarEmail');
  const email = emailInput?.value.trim();
  if (!email) return;
  if (!isValidEmail(email)) {
    alert('Please enter a valid email address.');
    return;
  }
  if (isSpamSubmission('hp_sidebar')) return;
  if (hasAlreadySubscribed(email)) {
    showThankYouPopup('Already subscribed', "You're already on the list! Check your inbox for the welcome email.");
    if (emailInput) emailInput.value = '';
    return;
  }
  sendNewsletterWelcome(email, 'sidebar')
    .then(() => {
      markSubscribed(email);
      showThankYouPopup('Subscribed!', 'Thank you for subscribing! Check your inbox for a welcome email.');
      if (emailInput) emailInput.value = '';
    })
    .catch(() => alert('Something went wrong. Please try again.'));
};

// Enter key support — none of these inputs sit inside a real <form>
// (see enableEnterToSubmit in utils.js), so without this a user had to
// click "Subscribe" manually; typing the email and pressing Enter did
// nothing. Each call is a safe no-op on pages that don't have that input.
enableEnterToSubmit('footerEmail', () => window.footerSubscribe());
enableEnterToSubmit('popupEmail', () => window.subscribePopup());
enableEnterToSubmit('sidebarEmail', () => window.sidebarSubscribe());
