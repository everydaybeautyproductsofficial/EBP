// =============================================
// POST-PAGE.JS – Blog post page logic
// =============================================
import { blogPosts } from './posts.js';
import { products, AFFILIATE_TAG } from './data.js';
import { renderStars, formatNumber, toggleDark, toggleFaq, toggleMobileNav, esc } from './utils.js';
// NOTE: initTheme, initScrollEffects, and setCurrentYear are intentionally
// NOT imported here. main.js is loaded on every blog post page (it's what
// wires up the footer/popup newsletter forms + cookie consent) and already
// calls all three on DOMContentLoaded. Calling them again from here was
// pure duplication — harmless for initTheme()/setCurrentYear() (they just
// re-set the same value), but initScrollEffects() attaches a NEW
// `scroll` listener every time it runs, since it has no guard against
// being called twice. That meant every blog post page silently carried
// two identical scroll listeners, double-toggling the same classes on
// every scroll. Removed here; see utils.js for the belt-and-suspenders
// fix (a guard flag so this can never happen again even if a future
// script calls it a second time).

const POST_ID = window.POST_ID;
const post    = blogPosts.find(p => p.id === POST_ID);

// ── Expose shared functions to window for inline HTML onclick ────────────────
window.toggleDark      = toggleDark;
window.toggleFaq       = toggleFaq;
window.toggleMobileNav = toggleMobileNav;

// ── Category slug map ────────────────────────────────────────────────────────
const CAT_MAP = {
  'Skin Care'        : 'skin-care',
  'Makeup'           : 'makeup',
  'Hair Care'        : 'hair-care',
  'Fragrance'        : 'fragrance',
  'Personal Care'    : 'personal-care',
  'Foot, Hand & Nail': 'foot-hand-nail',
};

// ── Helper: returns highest-rated product for this post's category ────────────
function getTopProduct() {
  if (!post) return null;
  const slug  = CAT_MAP[post.category];
  const inCat = products.filter(p => p.category === slug);
  if (!inCat.length) return null;
  return inCat.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews)[0];
}

// ── injectPostMeta ────────────────────────────────────────────────────────────
function injectPostMeta() {
  if (!post) return;

  // <title> and meta tags
  document.title = `${post.title} — EverydayBeautyProducts`;
  document.querySelector('meta[name="description"]')
    ?.setAttribute('content', post.excerpt);
  document.querySelector('meta[property="og:title"]')
    ?.setAttribute('content', `${post.title} — EverydayBeautyProducts`);
  document.querySelector('meta[property="og:description"]')
    ?.setAttribute('content', post.excerpt);

  // Hero section elements
  const badge = document.getElementById('postCatBadge');
  if (badge) badge.textContent = `${esc(post.category)}`;

  const title = document.getElementById('postTitle');
  if (title) title.textContent = post.title;

  const excerpt = document.getElementById('postExcerpt');
  if (excerpt) excerpt.textContent = post.excerpt;

  const heroImg = document.getElementById('postHeroImg');
  if (heroImg) { heroImg.src = `${post.img}`; heroImg.alt = post.title; }

  const breadcrumbCurrent = document.getElementById('breadcrumbCurrent');
  if (breadcrumbCurrent) breadcrumbCurrent.textContent = post.title;

  const authorName = document.getElementById('postAuthor');
  if (authorName) authorName.textContent = post.author;

  const authorInitial = document.getElementById('authorInitial');
  if (authorInitial) {
    // Skip title prefixes (Dr., Mr., Ms., Prof.) and use first letter of actual first name
    const nameParts = (post.author ?? '').replace(/^(dr|mr|ms|mrs|prof)\.?\s*/i, '').trim();
    authorInitial.textContent = nameParts[0]?.toUpperCase() ?? 'S';
  }

  const postDate = document.getElementById('postDate');
  if (postDate) {
    postDate.innerHTML =
      '<i class="fa-regular fa-calendar"></i> ' +
      new Date(post.createdAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
  }
}

// ── calcReadTime ──────────────────────────────────────────────────────────────
function calcReadTime() {
  const body    = document.getElementById('articleBody');
  const display = document.getElementById('readTime');
  if (!body || !display) return;
  const words = body.innerText.trim().split(/\s+/).length;
  display.innerHTML =
    `<i class="fa-regular fa-clock"></i> ${Math.max(1, Math.round(words / 200))} Min Read`;
}

// ── renderSidebarProduct ──────────────────────────────────────────────────────
function renderSidebarProduct() {
  if (!post) return;
  const top = getTopProduct();
  if (!top) return;
  const link = `https://www.amazon.com/dp/${top.asin}?tag=${AFFILIATE_TAG}`;
  const box  = document.getElementById('sidebarBuyBox');
  if (!box) return;
  box.innerHTML = `
    <div class="buy-box-img">
      <img src="${esc(top.img)}" alt="${esc(top.name)}" loading="lazy">
    </div>
    <div class="buy-box-name">${esc(top.name)}</div>
    <div class="buy-box-brand">by ${esc(top.brand)}</div>
    <div class="buy-box-rating">
      ${renderStars(top.rating)}
      <span style="font-size:0.75rem;color:var(--text-muted)">(${formatNumber(top.reviews)})</span>
    </div>
    <div class="buy-box-price-row">
      <span class="buy-box-price">$${top.price.toFixed(2)}</span>
      ${top.oldPrice  ? `<span class="buy-box-old">$${top.oldPrice.toFixed(2)}</span>` : ''}
      ${top.discount  ? `<span class="buy-box-discount">-${top.discount}%</span>`      : ''}
    </div>
    <a href="${link}" target="_blank" rel="nofollow sponsored noopener" class="btn-amazon-full">
      Buy Now on Amazon
    </a>
    <div class="prime-tag">
      <span class="prime-logo">prime</span> Free delivery on qualifying orders
    </div>
  `;
}

// ── renderManualAmazonButtons ───────────────────────────────────────────────
// Fills in the href for every manually-placed "Buy Now on Amazon" button
// inside the article body. In the HTML you only need to add one line per
// product, with the ASIN you want to link to:
//
//   <a href="#" class="btn-amazon-callout manual-buy-btn" data-asin="B0XXXXXXX"
//      target="_blank" rel="nofollow sponsored noopener">
//     <i class="fa-brands fa-amazon"></i> Buy Now on Amazon
//   </a>
//
// This function reads data-asin and builds the real Amazon link using
// AFFILIATE_TAG from data.js automatically — so your affiliate ID is always
// attached without editing it by hand for every button/post.
function renderManualAmazonButtons() {
  document.querySelectorAll('a.manual-buy-btn[data-asin]').forEach(btn => {
    const asin = btn.dataset.asin?.trim();
    if (!asin || asin === 'PUT_ASIN_HERE') return; // skip unfilled placeholders
    btn.href = `https://www.amazon.com/dp/${asin}?tag=${AFFILIATE_TAG}`;
  });
}

// ── renderRelatedProducts ─────────────────────────────────────────────────────
function renderRelatedProducts() {
  const grid = document.getElementById('relatedGrid');
  if (!grid || !post) return;
  const slug       = CAT_MAP[post.category];
  const topProduct = getTopProduct();
  const related    = products
    .filter(p => p.category === slug && p.asin !== topProduct?.asin)
    .sort((a, b) => b.rating - a.rating || b.reviews - a.reviews)
    .slice(0, 3);

  if (!related.length) { grid.closest('section')?.remove(); return; }

  grid.innerHTML = related.map(p => {
    const link          = `https://www.amazon.com/dp/${p.asin}?tag=${AFFILIATE_TAG}`;
    const oldPriceHtml  = p.oldPrice  ? `<span class="product-price-old">$${p.oldPrice.toFixed(2)}</span>` : '';
    const primeBadge    = p.prime     ? `<span class="prime-badge">prime</span>`                            : '';
    const discountBadge = p.discount  ? `<span class="discount-badge">-${p.discount}%</span>`               : '';
    return `
      <div class="product-card">
        <div class="product-card-img-wrap">
          <img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy" width="400" height="400">
          <span class="cat-badge">${esc(post.category)}</span>
          ${primeBadge}
          ${discountBadge}
        </div>
        <div class="product-card-body">
          <div class="product-brand">${esc(p.brand)}</div>
          <div class="product-name">${esc(p.name)}</div>
          <div class="product-rating">
            ${renderStars(p.rating)}
            <span class="review-count">(${formatNumber(p.reviews)})</span>
          </div>
          <div class="product-excerpt">${esc(p.excerpt ?? '')}</div>
          <div class="product-price-row">
            <span class="product-price">$${p.price.toFixed(2)}</span>
            ${oldPriceHtml}
          </div>
          <a href="${link}" target="_blank" rel="nofollow sponsored noopener" class="btn-amazon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
            Buy on Amazon
          </a>
        </div>
      </div>`;
  }).join('');
}

// ── renderSidebarRelatedPosts ─────────────────────────────────────────────────
// Fills #sidebarRelatedPosts with up to 3 posts from the same category,
// sourced from blogPosts in posts.js. Excludes the current post.
function renderSidebarRelatedPosts() {
  const container = document.getElementById('sidebarRelatedPosts');
  if (!container || !post) return;

  const related = blogPosts
    .filter(p => p.id !== post.id && p.category === post.category)
    .slice(0, 3);

  // Fall back to any recent posts if same-category posts are insufficient
  const fallback = blogPosts
    .filter(p => p.id !== post.id && !related.find(r => r.id === p.id))
    .slice(0, 3 - related.length);

  const items = [...related, ...fallback].slice(0, 3);
  if (!items.length) { container.closest('.sidebar-widget')?.remove(); return; }

  container.innerHTML = items.map(p => `
    <a href="${esc(p.href)}" class="related-post-item">
      <div class="related-post-thumb">
        <img src="${esc(p.img)}" alt="${esc(p.title)}" loading="lazy">
      </div>
      <div class="related-post-info">
        <div class="related-post-cat">${esc(p.category)}</div>
        <div class="related-post-title">${esc(p.title)}</div>
      </div>
    </a>
  `).join('');
}

// ── updatePostCategoryCounts ──────────────────────────────────────────────────
function updatePostCategoryCounts() {
  const counts = {};
  products.forEach(p => {
    counts[p.category] = (counts[p.category] || 0) + 1;
  });

  document.querySelectorAll('.cat-link[data-cat]').forEach(el => {
    const span = el.querySelector('.cat-count');
    if (span && counts[el.dataset.cat] !== undefined) {
      span.textContent = counts[el.dataset.cat];
    }
  });
}

// ── Share / copy ──────────────────────────────────────────────────────────────
window.shareArticle = function(platform) {
  const url   = encodeURIComponent(window.location.href);
  const title = encodeURIComponent(document.title);
  const urls  = {
    pinterest : `https://pinterest.com/pin/create/button/?url=${url}&description=${title}`,
    facebook  : `https://facebook.com/sharer/sharer.php?u=${url}`,
    instagram : `https://www.instagram.com/`,
  };
  window.open(urls[platform], '_blank', 'width=600,height=400');
};

window.copyLink = function() {
  navigator.clipboard.writeText(window.location.href)
    .then(() => alert('Link copied to clipboard! 🔗'))
    .catch(() => alert('Could not copy link. Please copy the URL manually.'));
};

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // initTheme(), initScrollEffects(), setCurrentYear() removed from here —
  // main.js (loaded on every blog post page) already runs them. See the
  // import comment above for why.
  injectPostMeta();
  calcReadTime();
  renderSidebarProduct();
  renderManualAmazonButtons();
  renderRelatedProducts();
  renderSidebarRelatedPosts();
  updatePostCategoryCounts();
});