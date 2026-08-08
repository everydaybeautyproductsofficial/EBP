// =============================================
// MAIN.JS – Initialisation, global event listeners
// =============================================
import { products, AFFILIATE_TAG, EMAILJS_ACCOUNTS } from './data.js';
import { renderMainGrid, renderTopRated, renderBlog, renderRecentlyViewed, initReveal } from './ui.js';
import { initTheme, toggleDark, toggleFaq, toggleMobileNav, initScrollEffects, setCurrentYear, isValidEmail } from './utils.js';
import { initCookieBanner } from './consent.js';

// Hide loader on full page load
window.addEventListener("load", function () {
  const loader = document.getElementById("loader");
  if (loader) loader.style.display = "none";
});

// Populate any static affiliate buttons (data-asin) using the centralized AFFILIATE_TAG
document.querySelectorAll('[data-asin]').forEach(el => {
  const asin = el.getAttribute('data-asin');
  if (asin) el.href = `https://www.amazon.com/dp/${asin}?tag=${AFFILIATE_TAG}`;
});

// Helper: inject product schema (only on pages that actually render the product grid)
// NOTE: aggregateRating intentionally removed — Google's structured data
// guidelines require rating/review markup to reflect the site's own
// first-party reviews, not a third party's (Amazon's). Publishing
// Amazon's rating/review counts as this site's aggregateRating risks a
// manual action that disables rich results sitewide. Add this back only
// once the site collects and displays its own genuine reviews.
function injectProductSchema() {
  if (!document.getElementById('productGrid')) return;
  const items = products.slice(0, 5).map(p => ({
    "@type": "Product",
    "name": p.name,
    "image": `https://everydaybeautyproducts.com${p.img}`,
    "brand": { "@type": "Brand", "name": p.brand },
    "description": p.excerpt,
    "offers": {
      "@type": "Offer",
      "price": p.price.toFixed(2),
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock",
      "url": `https://www.amazon.com/dp/${p.asin}?tag=${AFFILIATE_TAG}`
    }
  }));
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.text = JSON.stringify({ "@context": "https://schema.org", "@type": "ItemList", "itemListElement": items.map((item, i) => ({ "@type": "ListItem", "position": i + 1, "item": item })) });
  document.head.appendChild(script);
}

// Newsletter popup init
function initPopup() {
  if (!localStorage.getItem('popupShown')) {
    setTimeout(() => {
      const popup = document.getElementById('newsletterPopup');
      if (popup) popup.classList.add('show');
    }, 8000);
  }
}

// Global click listener to close dropdowns
document.addEventListener("click", function (e) {
  const dropdown = document.getElementById("sortDropdown");
  if (dropdown && !dropdown.contains(e.target)) {
    dropdown.classList.remove("open");
  }
});

// Expose shared functions to window for inline HTML use
window.toggleDark = toggleDark;
window.toggleFaq = toggleFaq;
window.toggleMobileNav = toggleMobileNav;

// Record when the page finished loading — used by the contact form's
// spam-timing check (real humans take at least a few seconds to fill a form;
// bots that auto-submit instantly get blocked).
window.__pageLoadedAt = Date.now();

// DOMContentLoaded: initialise everything
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initCookieBanner();
  initPopup();
  initScrollEffects();
  setCurrentYear();
  renderMainGrid();
  renderTopRated();
  renderBlog();
  renderRecentlyViewed();
  initReveal();
  injectProductSchema();
  initCustomDropdown();

  // Support deep-linking into the search overlay via ?q= (used by SearchAction schema)
  const qParam = new URLSearchParams(window.location.search).get('q');
  if (qParam && qParam.trim()) {
    window.openSearch();
    const input = document.getElementById('searchInput');
    if (input) {
      input.value = qParam;
      window.handleSearch(qParam);
    }
  }
});

// ========== CONTACT PAGE FUNCTIONS ==========
// EmailJS configuration.
// Every account's Public Key, Service ID, and Template IDs live
// centrally in data.js (EMAILJS_ACCOUNTS) — edit them there, not here.
// We do NOT call emailjs.init() globally anymore, because each of the
// 5 accounts has its own Public Key. Instead, each emailjs.send() call
// below passes { publicKey: ... } directly, which tells the EmailJS SDK
// which account to send through for that specific email.

// Contact form ke "Subject" dropdown ki har value ko ek category se map karna.
// Isi category ke hisab se sahi EmailJS account select hoga.
const SUBJECT_TO_CATEGORY = {
  'General Question': 'general',
  'Product Recommendation Request': 'general',
  'Website Feedback': 'general',
  'Brand Partnership / Collaboration': 'partnership',
  'Press & Media Inquiry': 'press',
  'Report an Issue': 'legal',
  'Other': 'general'
};

window.submitForm = function() {
  const first = document.getElementById('firstName')?.value.trim();
  const last = document.getElementById('lastName')?.value.trim();
  const email = document.getElementById('email')?.value.trim();
  const subject = document.getElementById('subject')?.value;
  const message = document.getElementById('message')?.value.trim();
  const privacy = document.getElementById('privacyCheck')?.checked;
  const newsletter = document.getElementById('newsletterCheck')?.checked;
  if (!first || !email || !subject || !message) {
    alert('Please fill in all required fields.');
    return;
  }
  if (!isValidEmail(email)) {
    alert('Please enter a valid email address.');
    return;
  }
  if (!privacy) {
    alert('Please agree to the Privacy Policy to continue.');
    return;
  }

  // --- SPAM PROTECTION #1: Honeypot ---
  // Real users never see or fill the "website" field (it's hidden off-screen).
  // Bots that auto-fill every input on the page will fill it, so if it has
  // any value we quietly pretend the message was sent and stop.
  const honeypot = document.getElementById('website')?.value;
  if (honeypot) {
    console.warn('Spam submission blocked (honeypot).');
    const form = document.getElementById('contactForm');
    const success = document.getElementById('formSuccess');
    if (form) form.style.display = 'none';
    if (success) success.style.display = 'block';
    return;
  }

  // --- SPAM PROTECTION #2: Timing trap ---
  // A human needs at least a couple of seconds to read the form and type.
  // Auto-submitting bots often fire instantly on page load, so reject
  // anything submitted under 3 seconds after the page loaded.
  const elapsed = Date.now() - (window.__pageLoadedAt || 0);
  if (elapsed < 3000) {
    alert('Please take a moment to fill out the form before submitting.');
    return;
  }

  // --- SPAM PROTECTION #3: Cloudflare Turnstile ---
  // Blocks the vast majority of automated bots/scripts. A real site key is
  // already set in contact.html. The check below is a safety fallback: if
  // that key is ever removed/reset back to the placeholder, verification
  // is skipped automatically instead of breaking the form.
  const turnstileWidget = document.querySelector('.cf-turnstile');
  const hasRealTurnstileKey = turnstileWidget && turnstileWidget.getAttribute('data-sitekey') !== 'YOUR_TURNSTILE_SITE_KEY';
  if (hasRealTurnstileKey) {
    const turnstileToken = window.turnstile ? window.turnstile.getResponse() : document.querySelector('[name="cf-turnstile-response"]')?.value;
    if (!turnstileToken) {
      alert('Please complete the verification checkbox before sending.');
      return;
    }
  }

  const submitBtn = document.querySelector('.btn-submit');
  if (submitBtn) submitBtn.disabled = true;

  // Subject dropdown se category nikalna, na milay to 'general' default
  const category = SUBJECT_TO_CATEGORY[subject] || 'general';
  const account = EMAILJS_ACCOUNTS[category];

  const templateParams = {
    firstName: first,
    lastName: last,
    email: email,
    subject: subject,
    message: message
  };
  const sendOptions = { publicKey: account.publicKey };

  // 1) Auto-reply → goes to the CUSTOMER confirming we received their message.
  // 2) Admin notification → goes to YOUR inbox (e.g. partnerships@) with the details.
  Promise.all([
    emailjs.send(account.serviceId, account.autoReplyTemplateId, templateParams, sendOptions),
    emailjs.send(account.serviceId, account.adminTemplateId, templateParams, sendOptions)
  ])
    .then(() => {
      const form = document.getElementById('contactForm');
      const success = document.getElementById('formSuccess');
      if (form) form.style.display = 'none';
      if (success) success.style.display = 'block';

      // Agar user ne newsletter checkbox bhi check kiya hai, to use
      // hamesha newsletter@ account se welcome email bhejte hain —
      // chahe contact form ki category kuch bhi ho.
      //
      // NOTE: previously this checked `window.NEWSLETTER_TEMPLATE_ID`, which
      // is only ever set by ui.js. contact.html does not load ui.js, so that
      // global was always undefined here and this branch never ran. main.js
      // already imports EMAILJS_ACCOUNTS directly from data.js, so we read
      // the welcome template id from there instead — no dependency on ui.js.
      if (newsletter && EMAILJS_ACCOUNTS.newsletter?.welcomeTemplateId) {
        const nl = EMAILJS_ACCOUNTS.newsletter;
        emailjs.send(nl.serviceId, nl.welcomeTemplateId, {
          firstName: first, email: email, source: 'contact-form'
        }, { publicKey: nl.publicKey }).catch(() => {});
      }
    })
    .catch((err) => {
      console.error('EmailJS error:', err);
      alert('Something went wrong while sending your message. Please try again.');
    })
    .finally(() => {
      if (submitBtn) submitBtn.disabled = false;
      // Reset the Turnstile widget so a stale/used token can't be replayed
      // if the user submits the form again.
      if (window.turnstile && hasRealTurnstileKey) window.turnstile.reset();
    });
};

// Custom dropdown initialization
function initCustomDropdown() {
  const customSelect = document.getElementById('subjectSelect');
  if (!customSelect) return;

  const trigger = customSelect.querySelector('.select-trigger');
  const optionsContainer = customSelect.querySelector('.select-options');
  const hiddenSelect = customSelect.querySelector('select');
  const valueSpan = customSelect.querySelector('.select-value');
  const options = Array.from(optionsContainer.querySelectorAll('.select-option'));

  function openDropdown() {
    document.querySelectorAll('.custom-select.open').forEach(drop => {
      if (drop !== customSelect) drop.classList.remove('open');
    });
    customSelect.classList.add('open');
    trigger.setAttribute('aria-expanded', 'true');
  }

  function closeDropdown(focusTrigger) {
    customSelect.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
    if (focusTrigger) trigger.focus();
  }

  function selectOption(option) {
    const value = option.getAttribute('data-value');
    const text = option.textContent;
    valueSpan.textContent = text;
    hiddenSelect.value = value;
    options.forEach(opt => {
      opt.classList.remove('selected');
      opt.setAttribute('aria-selected', 'false');
      opt.setAttribute('tabindex', '-1');
    });
    option.classList.add('selected');
    option.setAttribute('aria-selected', 'true');
    option.setAttribute('tabindex', '0');
    hiddenSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Mouse interaction (unchanged behavior)
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (customSelect.classList.contains('open')) {
      closeDropdown(false);
    } else {
      openDropdown();
    }
  });

  optionsContainer.addEventListener('click', (e) => {
    const option = e.target.closest('.select-option');
    if (!option) return;
    selectOption(option);
    closeDropdown(true);
  });

  document.addEventListener('click', () => {
    closeDropdown(false);
  });

  // Keyboard interaction on the trigger: Enter/Space/ArrowDown open the list,
  // Escape closes it — makes the dropdown fully operable without a mouse.
  trigger.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
      case 'Down':
        e.preventDefault();
        openDropdown();
        const current = options.find(opt => opt.classList.contains('selected')) || options[0];
        current.focus();
        break;
      case 'Escape':
        closeDropdown(false);
        break;
    }
  });

  // Keyboard interaction inside the listbox: arrow keys move between options,
  // Enter/Space selects, Escape closes and returns focus to the trigger.
  optionsContainer.addEventListener('keydown', (e) => {
    const currentIndex = options.indexOf(document.activeElement);
    switch (e.key) {
      case 'ArrowDown':
      case 'Down': {
        e.preventDefault();
        const next = options[Math.min(currentIndex + 1, options.length - 1)];
        next.focus();
        break;
      }
      case 'ArrowUp':
      case 'Up': {
        e.preventDefault();
        const prev = options[Math.max(currentIndex - 1, 0)];
        prev.focus();
        break;
      }
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (currentIndex >= 0) {
          selectOption(options[currentIndex]);
          closeDropdown(true);
        }
        break;
      case 'Escape':
        e.preventDefault();
        closeDropdown(true);
        break;
      case 'Tab':
        closeDropdown(false);
        break;
    }
  });
}
