// =============================================
// CONSENT.JS – Region-aware analytics loading
// -------------------------------------------------------------
// EU / UK visitors: OPT-IN model (GDPR / UK GDPR). Google Analytics
// (gtag) and the Meta Pixel do NOT run until the visitor explicitly
// clicks "Accept All" — exactly as before.
//
// US / rest-of-world visitors: OPT-OUT model (CCPA/CPRA-style).
// Analytics load automatically on arrival — no click required — and
// the visitor is given a "Do Not Sell or Share My Personal
// Information" choice if they want to opt out for future visits.
//
// If the visitor's country can't be detected (network error, etc.)
// we fail SAFE and treat them as an opt-in (EU-style) visitor.
//
// This is the ONLY place in the codebase allowed to load those two
// third-party scripts. Nothing here runs on page load by itself.
// =============================================

const GA_ID = 'G-471XVKR6Z3';
const FB_PIXEL_ID = '883104150917535';

// EEA countries + UK. GDPR / UK GDPR opt-in rules apply to these.
const OPT_IN_REQUIRED_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE',
  'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT',
  'RO', 'SK', 'SI', 'ES', 'SE', // EU
  'IS', 'LI', 'NO', // EEA (non-EU)
  'GB' // United Kingdom
]);

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
// analytics has actually been loaded (i.e. consent given, or visitor
// is in an opt-out region).
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

// --- Region detection -------------------------------------------------
// Uses Cloudflare's free /cdn-cgi/trace endpoint to read the visitor's
// country (the `loc=` line) without any API key or third-party
// geolocation service. Cached in sessionStorage so we only call it
// once per browser session.
async function detectCountry() {
  const cached = sessionStorage.getItem('detectedCountry');
  if (cached !== null) return cached;
  try {
    const res = await fetch('https://www.cloudflare.com/cdn-cgi/trace', { cache: 'no-store' });
    const text = await res.text();
    const match = text.match(/loc=([A-Z]{2})/);
    const country = match ? match[1] : '';
    sessionStorage.setItem('detectedCountry', country);
    return country;
  } catch (e) {
    return ''; // unknown -> fail safe to opt-in behaviour
  }
}

function isOptInRegion(country) {
  return !country || OPT_IN_REQUIRED_COUNTRIES.has(country);
}

// Called on every page load.
export async function initConsent() {
  if (localStorage.getItem('ccpaOptOut')) return; // visitor opted out — never auto-load
  if (localStorage.getItem('cookiesAccepted')) {
    loadAnalytics();
    return;
  }
  const country = await detectCountry();
  if (!isOptInRegion(country)) {
    // US / opt-out region: load immediately, no click required.
    loadAnalytics();
    localStorage.setItem('cookiesAccepted', '1');
  }
}

// Shows the cookie-consent banner (if the page has one). For opt-in
// (EU/UK) visitors who haven't accepted yet, analytics stays off until
// they click Accept. For opt-out (US/other) visitors, analytics loads
// right away and the banner is shown as an informational notice with
// a "Do Not Sell or Share My Personal Information" choice.
export async function initCookieBanner() {
  if (localStorage.getItem('ccpaOptOut')) return;

  if (localStorage.getItem('cookiesAccepted')) {
    initConsent();
    return;
  }

  const country = await detectCountry();
  const optIn = isOptInRegion(country);

  if (!optIn) {
    loadAnalytics();
    localStorage.setItem('cookiesAccepted', '1');
  }

  setTimeout(() => {
    const banner = document.getElementById('cookieBanner');
    if (!banner) return;
    banner.classList.add('show');
    if (!optIn) addOptOutLink(banner);
  }, 2000);
}

// Adds a small "Do Not Sell or Share My Personal Information" link to
// the banner for opt-out-region visitors. Injected via JS so we don't
// need to edit the banner markup on every page.
function addOptOutLink(banner) {
  if (banner.querySelector('.ccpa-optout-link')) return;
  const link = document.createElement('button');
  link.type = 'button';
  link.className = 'ccpa-optout-link';
  link.textContent = 'Do Not Sell or Share My Personal Information';
  link.style.cssText = 'display:block;background:none;border:none;padding:0;margin-top:8px;'
    + 'text-decoration:underline;cursor:pointer;font-size:12px;color:inherit;opacity:0.85;';
  link.onclick = optOutTracking;
  banner.appendChild(link);
}

// Lets an opt-out-region visitor stop tracking going forward. Scripts
// already loaded in this tab can't be fully unloaded, so we reload the
// page — the next load will respect the opt-out from the very start.
export function optOutTracking() {
  localStorage.removeItem('cookiesAccepted');
  localStorage.setItem('ccpaOptOut', '1');
  window.location.reload();
}

// Handles the banner's "Accept All" button. Defined here (not per-page)
// so it works no matter which entry script loaded consent.js.
export function acceptCookies() {
  const banner = document.getElementById('cookieBanner');
  if (banner) banner.classList.remove('show');
  localStorage.setItem('cookiesAccepted', '1');
  localStorage.removeItem('ccpaOptOut');
  loadAnalytics();
}

// Exposed globally because the banner button uses a plain onclick="" —
// guarded so importing this module in the Node build script (via
// shop-engine.js) never throws on a missing `window`.
if (typeof window !== 'undefined') {
  window.acceptCookies = acceptCookies;
  window.optOutTracking = optOutTracking;
}
