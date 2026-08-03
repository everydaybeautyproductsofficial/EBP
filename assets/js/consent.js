// =============================================
// CONSENT.JS – Cookie-consent gated analytics loading
// -------------------------------------------------------------
// Google Analytics (gtag) and the Meta Pixel must NOT run until the
// visitor actually accepts cookies — either by clicking "Accept All" on
// the banner (see acceptCookies() in ui.js) or because they already
// accepted on a previous visit (localStorage 'cookiesAccepted').
//
// This is the ONLY place in the codebase allowed to load those two
// third-party scripts. Nothing here runs on page load by itself.
// =============================================

const GA_ID = 'G-471XVKR6Z3';
const FB_PIXEL_ID = '883104150917535';

let analyticsLoaded = false;

export function loadAnalytics() {
  if (analyticsLoaded) return;
  analyticsLoaded = true;

  // --- Google tag (gtag.js) - GA4 ---
  const gaScript = document.createElement('script');
  gaScript.async = true;
  gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(gaScript);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID);

  // --- Meta Pixel Code ---
  (function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    t = b.createElement(e); t.async = true; t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  window.fbq('init', FB_PIXEL_ID);
  window.fbq('track', 'PageView');

  initAffiliateClickTracking();
}

// Track every click on an Amazon affiliate link as a conversion event,
// sent to both Google Analytics and Facebook. Only wired up once
// analytics has actually been loaded (i.e. consent given).
function initAffiliateClickTracking() {
  document.addEventListener('click', function (e) {
    const link = e.target.closest('a[href*="amazon.com"]');
    if (!link) return;
    const linkText = (link.textContent || '').trim().slice(0, 100);
    if (window.gtag) {
      window.gtag('event', 'affiliate_click', {
        link_url: link.href,
        link_text: linkText,
        page_path: window.location.pathname
      });
    }
    if (window.fbq) {
      window.fbq('track', 'Lead', {
        content_name: linkText,
        content_category: 'affiliate_link'
      });
    }
  });
}

// Called on every page load. If the visitor already accepted cookies on
// a previous visit, resume analytics on this page too — no need to show
// the banner again.
export function initConsent() {
  if (localStorage.getItem('cookiesAccepted')) {
    loadAnalytics();
  }
}

// Shows the cookie-consent banner (if the page has one) for visitors who
// haven't accepted yet, or resumes analytics for those who already have.
// Centralised here — rather than duplicated per entry-point script — so
// every page on the site (main.js pages AND the shop/category pages that
// only load shop-engine.js) gets identical cookie-banner behaviour.
export function initCookieBanner() {
  if (localStorage.getItem('cookiesAccepted')) {
    initConsent();
    return;
  }
  setTimeout(() => {
    const banner = document.getElementById('cookieBanner');
    if (banner) banner.classList.add('show');
  }, 2000);
}

// Handles the banner's "Accept All" button. Defined here (not per-page)
// so it works no matter which entry script loaded consent.js.
export function acceptCookies() {
  const banner = document.getElementById('cookieBanner');
  if (banner) banner.classList.remove('show');
  localStorage.setItem('cookiesAccepted', '1');
  // Only now — after explicit consent — do GA/Meta Pixel actually load.
  loadAnalytics();
}

// Exposed globally because the banner button uses a plain onclick="" —
// guarded so importing this module in the Node build script (via
// shop-engine.js) never throws on a missing `window`.
if (typeof window !== 'undefined') {
  window.acceptCookies = acceptCookies;
}
