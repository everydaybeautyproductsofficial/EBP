/**
 * build-blog-seo.mjs
 * ─────────────────────────────────────────────────────────────────────────
 * Auto-generates the static (pre-JS) content for every blog/*.html page,
 * using the SAME post data the live site already uses (imported directly
 * from posts.js). This guarantees the static HTML always matches what
 * post-page.js would inject on load — nothing is re-typed or duplicated
 * by hand.
 *
 * What it does, per blog post page:
 *   1. Reads window.POST_ID from the page itself, looks that post up in
 *      posts.js, and fills in — directly in the raw HTML —
 *        - <title>, meta description, og:title/description, twitter tags
 *        - breadcrumb current-page text
 *        - category badge, <h1> title, excerpt
 *        - author name + avatar initial, formatted publish date
 *        - hero image src + alt
 *        - the BlogPosting and BreadcrumbList JSON-LD blocks
 *   2. So a visitor, a search engine, or a social-media link preview all
 *      see the real title/content immediately — without JavaScript
 *      needing to run first.
 *
 * SAFE TO RE-RUN ANY NUMBER OF TIMES:
 *   - Every field is located by its unique id/attribute (e.g.
 *     id="postTitle") and its *entire* current inner content is replaced,
 *     whether that's empty (first run) or already-correct data from a
 *     previous run.
 *   - JSON-LD blocks are parsed as real JSON (not string-matched) and
 *     written back, exactly like build-seo.mjs already does for products.
 *
 * The client-side script (post-page.js) still runs exactly as before —
 * it simply re-sets the same values on load. Nothing about the page's
 * interactivity changes; this script only makes the *static* HTML match
 * it from the start.
 *
 * HOW TO ADD A NEW BLOG POST
 * ────────────────────────────
 *   1. Copy an existing blog/*.html file, rename it, update its
 *      window.POST_ID to a new id.
 *   2. Add a matching entry to assets/js/posts.js (same id).
 *   3. Write the article body inside #articleBody as usual.
 *   4. Run this script (or just push — GitHub Actions runs it for you).
 *   That's it — title, excerpt, author, date, badge, hero image, and
 *   schema are all filled in automatically from posts.js.
 *
 * HOW TO RUN
 * ────────────
 *   node scripts/build-blog-seo.mjs
 *
 * This is also run automatically by GitHub Actions on every push that
 * touches assets/js/posts.js or any blog/*.html file — see
 * .github/workflows/build-seo.yml
 * ─────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { blogPosts } from '../assets/js/posts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SITE_URL = 'https://everydaybeautyproducts.com';
const BLOG_DIR = path.join(ROOT, 'blog');

const LDJSON_RE = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;

// Escapes a string for safe insertion into HTML text content
// (titles/excerpts are plain editorial copy, but this keeps it bulletproof
// even if someone types a stray & or < into posts.js).
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Same logic as post-page.js's injectPostMeta(), so the static HTML and
// the JS-rendered result are always identical.
function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function authorInitial(author) {
  const stripped = (author ?? '').replace(/^(dr|mr|ms|mrs|prof)\.?\s*/i, '').trim();
  return (stripped[0] ?? 'S').toUpperCase();
}

// Replaces the inner content of a tag identified by a unique open-tag
// string, up to its matching close tag. Works whether the current inner
// content is empty or already filled in.
function replaceInner(html, openTag, closeTag, newInner, fileLabel, fieldLabel) {
  const startIdx = html.indexOf(openTag);
  if (startIdx === -1) {
    console.warn(`  \u26a0 ${fileLabel}: couldn't find ${fieldLabel} (${openTag}) — skipped`);
    return html;
  }
  const contentStart = startIdx + openTag.length;
  const closeIdx = html.indexOf(closeTag, contentStart);
  if (closeIdx === -1) {
    console.warn(`  \u26a0 ${fileLabel}: couldn't find closing tag for ${fieldLabel} — skipped`);
    return html;
  }
  return html.slice(0, contentStart) + newInner + html.slice(closeIdx);
}

// Replaces a single attribute's value, e.g. content="..." or src="...",
// on the first tag found starting at/after `anchor`.
function replaceAttr(html, anchor, attr, newValue, fileLabel, fieldLabel) {
  const anchorIdx = html.indexOf(anchor);
  if (anchorIdx === -1) {
    console.warn(`  \u26a0 ${fileLabel}: couldn't find ${fieldLabel} (${anchor}) — skipped`);
    return html;
  }
  const attrNeedle = `${attr}="`;
  const attrIdx = html.indexOf(attrNeedle, anchorIdx);
  if (attrIdx === -1) {
    console.warn(`  \u26a0 ${fileLabel}: couldn't find ${attr}= near ${fieldLabel} — skipped`);
    return html;
  }
  const valueStart = attrIdx + attrNeedle.length;
  const valueEnd = html.indexOf('"', valueStart);
  return html.slice(0, valueStart) + newValue + html.slice(valueEnd);
}

function injectHeadMeta(html, post, fileLabel) {
  const fullTitle = post.title;;
  const esc = escapeHtml(post.title);
  const escExcerpt = escapeHtml(post.excerpt);
  const escFullTitle = escapeHtml(fullTitle);

  html = replaceInner(html, '<title>', '</title>', escFullTitle, fileLabel, '<title>');
  html = replaceAttr(html, '<meta name="description"', 'content', escExcerpt, fileLabel, 'meta description');
  html = replaceAttr(html, '<meta property="og:title"', 'content', escFullTitle, fileLabel, 'og:title');
  html = replaceAttr(html, '<meta property="og:description"', 'content', escExcerpt, fileLabel, 'og:description');
  html = replaceAttr(html, '<meta name="twitter:title"', 'content', escFullTitle, fileLabel, 'twitter:title');
  html = replaceAttr(html, '<meta name="twitter:description"', 'content', escExcerpt, fileLabel, 'twitter:description');
  void esc;
  return html;
}

function injectHeroSection(html, post, fileLabel) {
  const esc = escapeHtml(post.title);
  const escExcerpt = escapeHtml(post.excerpt);
  const escCategory = escapeHtml(post.category);
  const escAuthor = escapeHtml(post.author);

  html = replaceInner(html, '<span id="breadcrumbCurrent">', '</span>', esc, fileLabel, 'breadcrumb');
  html = replaceInner(html, '<div class="post-cat-badge" id="postCatBadge">', '</div>', `\u{1F338} ${escCategory}`, fileLabel, 'category badge');
  html = replaceInner(html, '<h1 class="post-title" id="postTitle">', '</h1>', esc, fileLabel, '<h1> title');
  html = replaceInner(html, '<p class="post-excerpt" id="postExcerpt">', '</p>', escExcerpt, fileLabel, 'excerpt');
  html = replaceInner(html, '<div class="author-avatar" id="authorInitial">', '</div>', authorInitial(post.author), fileLabel, 'author initial');
  html = replaceInner(html, '<span class="author-name" id="postAuthor">', '</span>', escAuthor, fileLabel, 'author name');

  const dateInner = `<i class="fa-regular fa-calendar"></i> ${formatDate(post.createdAt)}`;
  html = replaceInner(html, '<span class="post-date" id="postDate">', '</span>', `\n        ${dateInner}\n      `, fileLabel, 'post date');

  html = replaceAttr(html, '<img id="postHeroImg"', 'src', post.img, fileLabel, 'hero image src');
  html = replaceAttr(html, '<img id="postHeroImg"', 'alt', esc, fileLabel, 'hero image alt');

  return html;
}

// Updates the BlogPosting + BreadcrumbList JSON-LD blocks (parsed as real
// JSON, same safe approach build-seo.mjs uses for product schema).
function injectJsonLd(html, post, fileLabel) {
  let touchedBlogPosting = false;
  let touchedBreadcrumb = false;

  const newHtml = html.replace(LDJSON_RE, (fullMatch, jsonText) => {
    let obj;
    try {
      obj = JSON.parse(jsonText);
    } catch {
      console.warn(`  \u26a0 ${fileLabel}: found a JSON-LD block that isn't valid JSON — left untouched`);
      return fullMatch;
    }

    if (obj['@type'] === 'BlogPosting') {
      obj.headline = post.title;
      obj.description = post.excerpt;
      obj.image = `${SITE_URL}${post.img}`;
      obj.datePublished = post.createdAt;
      obj.dateModified = post.createdAt;
      obj.author = { '@type': 'Person', name: post.author };
      obj.url = `${SITE_URL}${post.href}`;
      obj.mainEntityOfPage = { '@type': 'WebPage', '@id': `${SITE_URL}${post.href}` };
      obj.articleSection = post.category;
      obj.keywords = (post.tags ?? []).join(', ');
      touchedBlogPosting = true;
      return `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;
    }

    if (obj['@type'] === 'BreadcrumbList' && Array.isArray(obj.itemListElement)) {
      const last = obj.itemListElement[obj.itemListElement.length - 1];
      if (last) {
        last.name = post.title;
        last.item = `${SITE_URL}${post.href}`;
      }
      touchedBreadcrumb = true;
      return `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;
    }

    return fullMatch;
  });

  if (!touchedBlogPosting) console.warn(`  \u26a0 ${fileLabel}: no BlogPosting JSON-LD block found — skipped`);
  if (!touchedBreadcrumb) console.warn(`  \u26a0 ${fileLabel}: no BreadcrumbList JSON-LD block found — skipped`);

  return newHtml;
}

// =============================================
// FAQ SCHEMA (FAQPage JSON-LD)
// ─────────────────────────────────────────────
// The FAQ accordion markup (.faq-item / .faq-q / .faq-a) already lives by
// hand inside each blog/*.html file's <body> — it is NOT stored in
// posts.js. So instead of reading structured data, this reads the FAQ
// straight out of that post's own HTML and turns it into a matching
// FAQPage JSON-LD block. Every post is self-contained: a post's schema
// is always built ONLY from the .faq-item blocks physically inside that
// same file, so there is no way for one post's FAQ to end up on another
// post's page.
//
// Runs independently of the POST_ID/posts.js pipeline above, so it also
// covers pages like how-to-start-affiliate-marketing-with-no-money.html
// that have their own FAQ section but aren't (yet) wired into posts.js.
//
// TO ADD/EDIT AN FAQ: just edit the .faq-item blocks in the HTML as
// normal — this script re-derives the schema from them every run. There
// is nothing else to update by hand, ever.
// =============================================
const FAQ_ITEM_RE = /<div class="faq-item"[^>]*>\s*<div class="faq-q">([\s\S]*?)<\/div>\s*<div class="faq-a">([\s\S]*?)<\/div>\s*<\/div>/g;
// Matches ANY <script type="application/ld+json">...</script> block,
// pretty-printed or minified — each match is parsed as real JSON below
// (not string-matched), so an FAQPage block in any formatting is found
// and replaced, never left behind as a stray duplicate.
const LDJSON_BLOCK_RE = /<script type="application\/ld\+json">([\s\S]*?)<\/script>\n?/g;

// Strips the "▼" toggle-arrow markup and any other tags out of a
// .faq-q/.faq-a block's inner HTML, decodes the couple of entities that
// realistically show up in this copy, and collapses whitespace — leaving
// plain text suitable for a JSON-LD "name"/"text" field.
function toPlainText(innerHtml) {
  return innerHtml
    .replace(/<span class="arrow">[\s\S]*?<\/span>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractFaqs(html) {
  const faqs = [];
  for (const match of html.matchAll(FAQ_ITEM_RE)) {
    const question = toPlainText(match[1]);
    const answer = toPlainText(match[2]);
    if (question && answer) faqs.push({ question, answer });
  }
  return faqs;
}

function buildFaqPageScript(faqs) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

// Removes every existing FAQPage JSON-LD block (parsed as real JSON, so
// it's found regardless of pretty-printed vs. minified formatting —
// this is what catches a block a previous manual edit or an earlier,
// less careful version of this script may have left behind) and
// inserts exactly one fresh block built from the page's current
// .faq-item markup. Safe to re-run any number of times: it always
// converges to exactly one FAQPage block, or none if there's no FAQ.
function injectFaqSchema(html, fileLabel) {
  const faqs = extractFaqs(html);

  let removedCount = 0;
  let withoutFaqPage = html.replace(LDJSON_BLOCK_RE, (fullMatch, jsonText) => {
    try {
      const obj = JSON.parse(jsonText);
      if (obj['@type'] === 'FAQPage') { removedCount++; return ''; }
    } catch {
      // Not valid JSON — leave it exactly as-is, it isn't ours to touch.
    }
    return fullMatch;
  });

  if (removedCount > 1) {
    console.warn(`  \u26a0 ${fileLabel}: found ${removedCount} duplicate FAQPage blocks — collapsed down to 1`);
  }

  if (!faqs.length) return withoutFaqPage;

  if (!withoutFaqPage.includes('</head>')) {
    console.warn(`  \u26a0 ${fileLabel}: no </head> found — FAQPage schema skipped`);
    return withoutFaqPage;
  }
  console.log(`  \u2022 ${fileLabel}: FAQPage schema (${faqs.length} question${faqs.length === 1 ? '' : 's'})`);
  const scriptTag = buildFaqPageScript(faqs);
  return withoutFaqPage.replace('</head>', `${scriptTag}\n</head>`);
}

function buildPost(fileName, skipPostIdCheck = false) {
  const filePath = path.join(BLOG_DIR, fileName);
  const original = readFileSync(filePath, 'utf8');
  const fileLabel = `blog/${fileName}`;
  let html = original;

  // FAQ schema runs on every blog page that has a FAQ section, whether
  // or not it's wired into posts.js (see injectFaqSchema's comment).
  html = injectFaqSchema(html, fileLabel);

  const idMatch = html.match(/window\.POST_ID\s*=\s*(\d+)\s*;/);
  if (!idMatch) {
    if (!skipPostIdCheck) {
      console.warn(`  \u26a0 ${fileLabel}: no "window.POST_ID = N;" found — title/meta/BlogPosting schema skipped (FAQ schema still applied above, if present)`);
    }
  } else {
    const postId = Number(idMatch[1]);
    const post = blogPosts.find(p => p.id === postId);
    if (!post) {
      console.warn(`  \u26a0 ${fileLabel}: POST_ID ${postId} has no matching entry in posts.js — title/meta/BlogPosting schema skipped`);
    } else {
      html = injectHeadMeta(html, post, fileLabel);
      html = injectHeroSection(html, post, fileLabel);
      html = injectJsonLd(html, post, fileLabel);
    }
  }

  if (html !== original) {
    writeFileSync(filePath, html, 'utf8');
    console.log(`\u2714 ${fileLabel} — updated`);
  } else {
    console.log(`… ${fileLabel} — no changes`);
  }
}

console.log(`Building blog SEO content from ${blogPosts.length} post(s) in posts.js\n`);

// Files that live in blog/ but are intentionally hand-built, standalone
// pages OUTSIDE the posts.js template system (no window.POST_ID by design —
// e.g. a lead-magnet / guide page rather than a product-review post).
// Listed here so the build log doesn't warn about a "missing" POST_ID that
// was never supposed to exist. FAQ schema still applies to them normally.
const NON_TEMPLATE_BLOG_FILES = new Set([
  'how-to-start-affiliate-marketing-with-no-money.html',
]);

const blogFiles = readdirSync(BLOG_DIR).filter(f => f.endsWith('.html'));
for (const fileName of blogFiles) {
  buildPost(fileName, NON_TEMPLATE_BLOG_FILES.has(fileName));
}

// =============================================
// OTHER PAGES WITH A FAQ SECTION (not a blog post, not a product/category
// page — e.g. contact.html)
// ─────────────────────────────────────────────
// FAQ schema shouldn't only work on blog/category pages — ANY page on the
// site with a .faq-item section should get it automatically. List every
// such page here (root-relative path). Nothing else about a page needs
// to change to qualify — this reuses the exact same injectFaqSchema()
// used above, so behaviour (dedupe, plain-text extraction, etc.) is
// identical everywhere on the site.
//
// TO ADD A FAQ SECTION TO A NEW PAGE: build the .faq-item markup as
// usual, then just add that page's filename to this list. Nothing else
// to configure.
// =============================================
const OTHER_FAQ_PAGES = ['contact.html', 'reviews.html'];

console.log(`\nChecking ${OTHER_FAQ_PAGES.length} other page(s) with a FAQ section\n`);

for (const fileName of OTHER_FAQ_PAGES) {
  const filePath = path.join(ROOT, fileName);
  const original = readFileSync(filePath, 'utf8');
  const html = injectFaqSchema(original, fileName);
  if (html !== original) {
    writeFileSync(filePath, html, 'utf8');
    console.log(`\u2714 ${fileName} — updated`);
  } else {
    console.log(`… ${fileName} — no changes`);
  }
}

console.log('\nDone.');
