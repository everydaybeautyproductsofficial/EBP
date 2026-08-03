# Automatic SEO build — how it works

This folder contains two scripts: **`build-seo.mjs`** (products) and
**`build-blog-seo.mjs`** (blog posts). Both work the same way: one data
file is the single source of truth, and the script fills in the static
HTML from it — so you only ever edit data in one place.

## `build-seo.mjs` — products

Every product on your site lives in one file: `assets/js/products.js`.
This script reads that file and automatically fills in:

1. The product grid on `shop.html` and every `category/*.html` page, so
   real product cards exist in the page's HTML (not just generated later
   by JavaScript in the visitor's browser).
2. The `ItemList` structured data (JSON-LD) on those same pages, so
   Google can show your products as rich results in search.

## `build-blog-seo.mjs` — blog posts

Every blog post's data (title, excerpt, author, publish date, hero
image, category) lives in one file: `assets/js/posts.js`. This script
reads that file, matches each entry to its `blog/*.html` page by the
page's `window.POST_ID`, and automatically fills in:

1. The `<title>`, meta description, and Open Graph/Twitter tags.
2. The visible `<h1>` title, excerpt, category badge, author name +
   avatar initial, formatted publish date, breadcrumb text, and hero
   image — directly in the raw HTML, not just injected later by
   JavaScript in the visitor's browser.
3. The `BlogPosting` and `BreadcrumbList` structured data (JSON-LD).

**To add a new blog post:**
1. Copy an existing `blog/*.html` file, rename it, and update its
   `window.POST_ID` to a new, unused id.
2. Add a matching entry to `assets/js/posts.js` (same id) — copy the
   commented-out template block at the bottom of the file.
3. Write the article body inside `#articleBody` as usual.
4. `git push`. The rest (title, excerpt, author, date, badge, hero
   image, schema) is filled in for you automatically.

## FAQ schema on other pages (not a blog post or category page)

Any page on the site with a `.faq-item` section — not just blog posts and
category pages — can get FAQPage structured data automatically. This
currently covers `contact.html`, and can cover any future page the same
way (e.g. if `about.html` gets an FAQ section tomorrow).

**To add a new page:**
1. Open `scripts/build-blog-seo.mjs` and add the page's filename to the
   `OTHER_FAQ_PAGES` list near the bottom, e.g.
   `['contact.html', 'about.html']`.
2. Open `.github/workflows/build-seo.yml` and add that same filename in
   **two** places:
   - the `paths:` list (so a push to that file triggers the workflow),
   - the `file_pattern:` on the commit step (so the workflow's generated
     changes to that file actually get committed — without this, the
     script still runs and updates the file locally in CI, but the
     change is silently thrown away instead of being pushed back).

That's it — extraction of the FAQ items, duplicate-schema cleanup, and
insertion into `<head>` are all automatic and identical to how
`contact.html` already works. No other code changes needed.

## You don't need to run anything by hand

A GitHub Actions workflow (`.github/workflows/build-seo.yml`) runs both
scripts **automatically** every time you push a change to
`assets/js/products.js`, `assets/js/posts.js`, or either script itself —
for example, adding a product, editing a blog post's title, or adding a
new post. It then commits the updated HTML files back into your
repository by itself.

Your workflow is simply:

1. Edit `assets/js/products.js` and/or `assets/js/posts.js`.
2. `git push`.
3. Wait about 30–60 seconds — check the "Actions" tab on GitHub to see it
   run. When it's done, the affected pages are already updated for you.

## Running it manually (optional)

If you ever want to run both scripts yourself on your own computer:

```bash
npm run build
```

(requires Node.js installed — but again, this is optional, GitHub does
it for you automatically.) You can run just one script directly too:

```bash
node scripts/build-seo.mjs        # products only
node scripts/build-blog-seo.mjs   # blog posts only
```

You can also trigger the whole workflow manually on GitHub itself:
**Actions tab → "Auto-update SEO product data" → Run workflow button.**

## Safe to run any number of times

`build-seo.mjs` only ever touches:
- the exact area between `<!-- SEO:PRODUCTS:START -->` and
  `<!-- SEO:PRODUCTS:END -->` inside the product grid,
- the `itemListElement` field inside the page's `ItemList` JSON-LD block.

`build-blog-seo.mjs` only ever touches:
- the specific labeled fields inside each blog post's hero section
  (title, excerpt, badge, author, date, hero image),
- the head `<title>`/meta tags,
- the `BlogPosting` and `BreadcrumbList` JSON-LD blocks.

Everything else on every page (header, footer, FAQ content, filters,
article body content, styling, etc.) is left completely untouched, no
matter how many times you run either script.
