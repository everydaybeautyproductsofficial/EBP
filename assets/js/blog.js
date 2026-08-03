// =============================================
// BLOG.JS — Blog page logic
// Handles: featured, grid, pagination, filters,
//          search, popular posts, tags, sidebar cats
// Used by: blog.html only
// =============================================
import { blogPosts as rawPosts } from './posts.js';
import { SKELETON_DELAY, isValidEmail, enableEnterToSubmit, esc } from './utils.js';

const POSTS_PER_PAGE = 10; // ← change this to show more/fewer posts per page

const CAT_ICONS = {
  'Skin Care':         '<i class="fa-solid fa-spa"></i>',
  'Makeup':            '<i class="fa-solid fa-wand-magic-sparkles"></i>',
  'Hair Care':         '<i class="fa-solid fa-scissors"></i>',
  'Fragrance':         '<i class="fa-solid fa-spray-can-sparkles"></i>',
  'Foot, Hand & Nail': '<i class="fa-solid fa-hand-sparkles"></i>',
  'Personal Care':     '<i class="fa-solid fa-soap"></i>',
};

// Normalize posts
const posts = rawPosts.map((p, i) => ({
  id:      p.id ?? (i + 1),
  cat:     p.category ?? '',
  title:   p.title ?? '',
  excerpt: p.excerpt ?? '',
  date:    p.createdAt
    ? new Date(p.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '',
  img:     p.img ?? '',
  author:  p.author ?? 'S',
  href:    p.href ?? '#',
  tags:    p.tags ?? [],
}));

// Build category list dynamically from posts
const catCounts = {};
posts.forEach(p => { catCounts[p.cat] = (catCounts[p.cat] || 0) + 1; });

const ALL_CATEGORIES = [
  { slug: 'all',               label: 'All Articles',       icon: '<i class="fa-solid fa-layer-group"></i>' },
  { slug: 'Skin Care',         label: 'Skin Care',          icon: '<i class="fa-solid fa-spa"></i>' },
  { slug: 'Makeup',            label: 'Makeup',             icon: '<i class="fa-solid fa-wand-magic-sparkles"></i>' },
  { slug: 'Hair Care',         label: 'Hair Care',          icon: '<i class="fa-solid fa-scissors"></i>' },
  { slug: 'Fragrance',         label: 'Fragrance',          icon: '<i class="fa-solid fa-spray-can-sparkles"></i>' },
  { slug: 'Foot, Hand & Nail', label: 'Foot, Hand & Nail',  icon: '<i class="fa-solid fa-hand-sparkles"></i>' },
  { slug: 'Personal Care',     label: 'Personal Care',      icon: '<i class="fa-solid fa-soap"></i>' },
];

const categories = ALL_CATEGORIES;

const allTags = [...new Set(posts.flatMap(p => p.tags))].filter(Boolean);

// ── STATE ────────────────────────────────────
let activeCat = 'all';
let searchQ   = '';
let page      = 1;

// ── HELPERS ──────────────────────────────────
function getFiltered() {
  const q = searchQ.toLowerCase();
  return posts.filter(p => {
    const catOk  = activeCat === 'all' || p.cat === activeCat;
    const textOk = !q ||
      p.title.toLowerCase().includes(q) ||
      p.excerpt.toLowerCase().includes(q) ||
      p.cat.toLowerCase().includes(q);
    return catOk && textOk;
  });
}

// ── FEATURED ARTICLE ─────────────────────────
function renderFeatured() {
  const el = document.getElementById('bpFeatured');
  if (!el || !posts.length) return;
  const p = posts[0];
  el.href = esc(p.href);
  el.innerHTML = `
    <div class="bp-featured-media">
      <img src="${esc(p.img)}" alt="${esc(p.title)}" loading="eager" width="900" height="560">
      <span class="bp-featured-badge"><i class="fa-solid fa-star"></i> Editor's Pick</span>
    </div>
    <div class="bp-featured-body">
      <span class="bp-featured-cat">${esc(p.cat)}</span>
      <h2 class="bp-featured-title">${esc(p.title)}</h2>
    <div class="bp-featured-meta">
      <span class="author-chip"><div class="author-avatar">${esc((p.author || '').charAt(0))}</div><span><strong>${esc(p.author)}</strong></span></span>
      <span><i class="fa-regular fa-calendar"></i> ${esc(p.date)}</span>
    </div>
      <p class="bp-featured-excerpt">${esc(p.excerpt)}</p>
      <span class="bp-featured-cta">Read Full Article <i class="fa-solid fa-arrow-right"></i></span>
    </div>`;
}

// ── CARD HTML ────────────────────────────────
function cardHTML(p) {

  const date = new Date(p.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  return `
  <article class="bp-card reveal" role="listitem">
    <div class="bp-card-img-wrap">
      <img 
        src="${esc(p.img)}" 
        alt="${esc(p.title)}" 
        loading="lazy" 
        width="600" 
        height="375"
      >
      <span class="bp-card-cat">${esc(p.cat)}</span>
    </div>
    <div class="bp-card-body">
      <div class="bp-card-meta">
        <span class="author-chip">
          <div class="author-avatar">${esc((p.author || '').charAt(0))}</div>
          <span><strong>${esc(p.author)}</strong></span>
        </span>
        <span>
          <i class="fa-regular fa-calendar"></i> ${date}
        </span>
      </div>
      <h3 class="bp-card-title">${esc(p.title)}</h3>
      <p class="bp-card-excerpt">${esc(p.excerpt)}</p>
      <div class="bp-card-footer">
        <a href="${esc(p.href)}" class="bp-card-link">
          Read Article <span>→</span>
        </a>
      </div>
    </div>
  </article>`;
}

// ── SKELETON (initial-load only, same shimmer style used site-wide) ──
function blogSkeletonHTML() {
  return `
    <article class="bp-card" style="pointer-events:none;">
      <div class="bp-card-img-wrap">
        <div class="skeleton" style="width:100%;height:200px;"></div>
      </div>
      <div class="bp-card-body">
        <div class="skeleton" style="height:12px;width:60%;border-radius:4px;margin-bottom:10px;"></div>
        <div class="skeleton" style="height:18px;width:95%;border-radius:4px;margin-bottom:8px;"></div>
        <div class="skeleton" style="height:18px;width:75%;border-radius:4px;margin-bottom:10px;"></div>
        <div class="skeleton" style="height:12px;width:100%;border-radius:4px;margin-bottom:6px;"></div>
        <div class="skeleton" style="height:12px;width:85%;border-radius:4px;"></div>
      </div>
    </article>
  `;
}

// ── RENDER GRID ──────────────────────────────
// showSkeleton=true is only used on the very first render (DOMContentLoaded)
// so the initial page load feels consistent with the rest of the site.
// Every later re-render (search, category tab, tag click, pagination) calls
// this with the default false and stays instant — no repeated fake delay.
function renderGrid(showSkeleton = false) {
  const all   = getFiltered();
  const start = (page - 1) * POSTS_PER_PAGE;
  const slice = all.slice(start, start + POSTS_PER_PAGE);

  const grid  = document.getElementById('bpGrid');
  const title = document.getElementById('bpGridTitle');
  const count = document.getElementById('bpGridCount');

  if (title) {
    title.textContent = activeCat !== 'all'
      ? `${activeCat} Articles`
      : searchQ ? 'Search Results' : 'Latest Articles';
  }
  if (count) {
    count.textContent = all.length === 1 ? '1 article' : `${all.length} articles`;
  }

  const doRender = () => {
    if (!slice.length) {
      grid.innerHTML = `
        <div class="bp-no-results">
          <div class="bp-no-icon"><i class="fa-solid fa-magnifying-glass"></i></div>
          <p>No articles found${searchQ ? ` for "<strong>${esc(searchQ)}</strong>"` : ''}.</p>
        </div>`;
    } else {
      grid.innerHTML = slice.map(cardHTML).join('');
    }

    renderPagination(all.length);
    initReveal();
  };

  if (showSkeleton && grid) {
    grid.innerHTML = Array(6).fill(blogSkeletonHTML()).join('');
    setTimeout(doRender, SKELETON_DELAY);
  } else {
    doRender();
  }
}

// ── PAGINATION ───────────────────────────────
function renderPagination(total) {
  const pages = Math.ceil(total / POSTS_PER_PAGE);
  const nav   = document.getElementById('bpPagination');
  if (!nav) return;
  if (pages <= 1) { nav.innerHTML = ''; return; }

  let html = '';
  if (page > 1) html += `<button class="bp-pg-btn" data-page="${page - 1}" aria-label="Previous">‹</button>`;
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) {
      html += `<button class="bp-pg-btn${i === page ? ' active' : ''}" data-page="${i}">${i}</button>`;
    } else if (Math.abs(i - page) === 2) {
      html += `<span class="bp-pg-dots">…</span>`;
    }
  }
  if (page < pages) html += `<button class="bp-pg-btn" data-page="${page + 1}" aria-label="Next">›</button>`;
  nav.innerHTML = html;

  nav.querySelectorAll('.bp-pg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      page = parseInt(btn.dataset.page);
      renderGrid();
      document.getElementById('bpMain')?.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

// ── CATEGORY TABS ────────────────────────────
function renderCatTabs() {
  const strip = document.getElementById('bpCatStrip');
  if (!strip) return;
  strip.innerHTML = categories.map(c => `
    <button class="bp-cat-btn${activeCat === c.slug ? ' active' : ''}"
            role="tab"
            aria-selected="${activeCat === c.slug}"
            data-cat="${esc(c.slug)}">
      ${c.icon} ${esc(c.label)}
    </button>`).join('');

  strip.querySelectorAll('.bp-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCat = btn.dataset.cat;
      page = 1;
      strip.querySelectorAll('.bp-cat-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      renderGrid();
      updateStatusBar();
    });
  });
}

// ── STATUS BAR ───────────────────────────────
function updateStatusBar() {
  const bar = document.getElementById('bpStatusBar');
  if (!bar) return;
  if (searchQ) {
    const n = getFiltered().length;
    bar.innerHTML = `Showing <strong>${n}</strong> result${n !== 1 ? 's' : ''} for
      "<strong>${esc(searchQ)}</strong>"
      <button class="bp-clear-btn" id="bpClearBtn">Clear</button>`;
    bar.classList.add('visible');
    document.getElementById('bpClearBtn')?.addEventListener('click', () => {
      searchQ = '';
      const inp = document.getElementById('bpSearchInput');
      if (inp) inp.value = '';
      page = 1;
      updateStatusBar();
      renderGrid();
    });
  } else {
    bar.classList.remove('visible');
    bar.innerHTML = '';
  }
}

// ── POPULAR POSTS ─────────────────────────────
function renderPopular() {
  const el = document.getElementById('bpPopular');
  if (!el) return;
  el.innerHTML = posts.slice(0, 5).map(p => `
    <a class="bp-pop-item" href="${esc(p.href)}">
      <div class="bp-pop-thumb">
        <img src="${esc(p.img)}" alt="${esc(p.title)}" loading="lazy" width="60" height="60">
      </div>
      <div class="bp-pop-info">
        <div class="bp-pop-title">${esc(p.title)}</div>
        <div class="bp-pop-date"><i class="fa-regular fa-calendar"></i> ${esc(p.date)}</div>
      </div>
    </a>`).join('');
}

// ── TAGS ─────────────────────────────────────
function renderTags() {
  const el = document.getElementById('bpTagsCloud');
  if (!el) return;
  if (!allTags.length) {
    el.closest('.bp-widget')?.remove();
    return;
  }
  el.innerHTML = allTags.map(t =>
    `<button class="bp-tag" data-tag="${esc(t)}">${esc(t)}</button>`
  ).join('');
  el.querySelectorAll('.bp-tag').forEach(btn => {
    btn.addEventListener('click', () => {
      searchQ = btn.dataset.tag;
      const inp = document.getElementById('bpSearchInput');
      if (inp) inp.value = btn.dataset.tag;
      page = 1;
      renderGrid();
      updateStatusBar();
    });
  });
}

// ── SIDEBAR CATEGORIES ───────────────────────
function renderSidebarCats() {
  const el = document.getElementById('bpSideCats');
  if (!el) return;
  el.innerHTML = ALL_CATEGORIES
    .filter(c => c.slug !== 'all')
    .map(c => `
      <a class="bp-side-cat" href="/blog.html?cat=${encodeURIComponent(c.slug)}">
        <span>${c.icon} ${esc(c.label)}</span>
        <span class="bp-side-cat-count">${catCounts[c.slug] || 0}</span>
      </a>`).join('');
}

// ── REVEAL ANIMATION ─────────────────────────
function initReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.07 });
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => obs.observe(el));
}

// ── INIT ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Hero search bindings
  const inp  = document.getElementById('bpSearchInput');
  const btn  = document.getElementById('bpSearchBtn');
  if (inp) {
    inp.addEventListener('input', () => {
      searchQ = inp.value.trim();
      page = 1;
      renderGrid();
      updateStatusBar();
    });
  }
  if (btn) {
    btn.addEventListener('click', () => {
      searchQ = inp?.value.trim() || '';
      page = 1;
      renderGrid();
      updateStatusBar();
    });
  }

  // Sidebar newsletter — uses the shared EmailJS + Subscriber Sheet flow
  // from ui.js (window.sendNewsletterWelcome, exposed by main.js, which
  // is loaded before blog.js on blog.html). Previously this just showed
  // a fake "Thank you" alert without actually sending anything.
  function handleBlogSidebarSubscribe() {
    const emailInp = document.getElementById('bpSideEmail');
    const email = emailInp?.value.trim();
    if (!email) { emailInp?.focus(); return; }
    if (!isValidEmail(email)) {
      alert('Please enter a valid email address.');
      emailInp?.focus();
      return;
    }
    // Same honeypot + 3s timing guard used by the footer/popup/post-page
    // sidebar forms (see ui.js isSpamSubmission) — this form was
    // previously missing it, leaving it open to bots.
    if (typeof window.isSpamSubmission === 'function' && window.isSpamSubmission('hp_blog_sidebar')) {
      return;
    }
    if (typeof window.hasAlreadySubscribed === 'function' && window.hasAlreadySubscribed(email)) {
      alert("You're already subscribed! Check your inbox for the welcome email.");
      emailInp.value = '';
      return;
    }
    if (typeof window.sendNewsletterWelcome !== 'function') {
      alert('Something went wrong. Please try again.');
      return;
    }
    window.sendNewsletterWelcome(email, 'blog-sidebar')
      .then(() => {
        window.markSubscribed?.(email);
        alert('Thank you for subscribing! Check your inbox for a welcome email.');
        emailInp.value = '';
      })
      .catch(() => alert('Something went wrong. Please try again.'));
  }
  document.getElementById('bpSideSubBtn')?.addEventListener('click', handleBlogSidebarSubscribe);
  // Enter key support — bpSideEmail isn't inside a real <form> (see
  // enableEnterToSubmit in utils.js), so without this, typing an email
  // and pressing Enter did nothing; only clicking the button worked.
  enableEnterToSubmit('bpSideEmail', handleBlogSidebarSubscribe);

  // Check URL param for category
  const urlCat = new URLSearchParams(window.location.search).get('cat');
  if (urlCat) activeCat = urlCat;

  // Render everything
  renderCatTabs();
  renderFeatured();
  renderGrid(true); // initial load — shows the standard skeleton state
  renderPopular();
  renderTags();
  renderSidebarCats();
});
