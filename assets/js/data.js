// =============================================
// DATA.JS – Config and search index only
// Products live in: products.js (same folder)
// Blog posts live in: posts.js (same folder)
// =============================================

import { products } from './products.js';
import { blogPosts } from './posts.js';

export const AFFILIATE_TAG = 'everydaybe092-20'; // Amazon Associates tag

// =============================================
// EMAILJS CONFIG — single source of truth
// Used by both main.js (contact form) and ui.js (newsletter forms)
// =============================================
// You're using 5 SEPARATE EmailJS accounts (one per Gmail inbox), so
// each one has its OWN Public Key + Service ID. Contact-form categories
// also carry their own Auto-Reply template (→ sent to the customer) and
// Admin Notification template (→ sent to you).
//
// IMPORTANT: every newsletter/subscribe form on the site (popup, footer,
// blog page, post pages) always uses EMAILJS_ACCOUNTS.newsletter —
// that part is already wired up for you in ui.js.
export const EMAILJS_ACCOUNTS = {
  general: {                                    // hello@everydaybeautyproducts.com
    publicKey: '0AP8qRxpnsUAUdqcs',
    serviceId: 'service_0c1vwxm',
    autoReplyTemplateId: 'template_652o7n9',
    adminTemplateId: 'template_g0ktn1m'
  },
  partnership: {                                // partnerships@everydaybeautyproducts.com
    publicKey: 'jPdiHTwMBrCpID8kY',
    serviceId: 'service_1zcl0um',
    autoReplyTemplateId: 'template_na243tu',
    adminTemplateId: 'template_hb79hqb'
  },
  press: {                                      // press@everydaybeautyproducts.com
    publicKey: 'lhfKdonIuwUoepULi',
    serviceId: 'service_g9nlors',
    autoReplyTemplateId: 'template_jx1kvb8',
    adminTemplateId: 'template_bi3ty0j'
  },
  legal: {                                      // legal@everydaybeautyproducts.com
    publicKey: '9zb9Zgz80g8OLyAPD',
    serviceId: 'service_cc856ib',
    autoReplyTemplateId: 'template_ljkvkla',
    adminTemplateId: 'template_9rb7vge'
  },
  newsletter: {                                 // newsletter@everydaybeautyproducts.com
    publicKey: '6mvkUH5FKV9XmH0BD',
    serviceId: 'service_fi4tjex',
    welcomeTemplateId: 'template_2eux66w'
  }
};

export { products } from './products.js';
export { blogPosts } from './posts.js';

export const searchData = [
  ...products.map(p => ({ type: 'Product', label: p.name, sub: p.brand, href: `https://www.amazon.com/dp/${p.asin}?tag=${AFFILIATE_TAG}` })),
  ...blogPosts.map(b => ({ type: 'Article', label: b.title, sub: b.category, href: b.href })),
  { type: 'Category', label: 'Skin Care', sub: `${products.filter(p => p.category === 'skin-care').length} products`, href: '/category/skin-care.html' },
  { type: 'Category', label: 'Makeup', sub: `${products.filter(p => p.category === 'makeup').length} products`, href: '/category/makeup.html' },
  { type: 'Category', label: 'Hair Care', sub: `${products.filter(p => p.category === 'hair-care').length} products`, href: '/category/hair-care.html' },
  { type: 'Category', label: 'Fragrance', sub: `${products.filter(p => p.category === 'fragrance').length} products`, href: '/category/fragrance.html' },
  { type: 'Category', label: 'Foot, Hand & Nail', sub: `${products.filter(p => p.category === 'foot-hand-nail').length} products`, href: '/category/foot-hand-nail.html' },
  { type: 'Category', label: 'Personal Care', sub: `${products.filter(p => p.category === 'personal-care').length} products`, href: '/category/personal-care.html' }
];