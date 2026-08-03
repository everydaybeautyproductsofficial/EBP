/**
 * build-sitemap.mjs
 * ─────────────────────────────────────────────────────────────────────────
 * Stamps every <lastmod> in sitemap.xml with the REAL last-modified date
 * of the page it points to, instead of a single hand-typed date shared by
 * every URL. Fixes the "every page had the same lastmod even though some
 * are marked changefreq: daily" issue.
 *
 * Date source, in order of preference:
 *   1. Git history (`git log -1 --format=%cI -- <file>`), when this is
 *      run inside a git checkout with history available — this is the
 *      most accurate signal of when a page's content actually changed.
 *   2. Filesystem mtime, as a fallback (e.g. local runs outside git, or
 *      shallow CI checkouts where git history isn't available).
 *
 * SAFE TO RE-RUN ANY NUMBER OF TIMES:
 *   - Only the contents of each <lastmod> tag are replaced; every other
 *     line (loc, changefreq, priority, comments, formatting) is left
 *     exactly as-is.
 *
 * HOW TO RUN
 * ────────────
 *   node scripts/build-sitemap.mjs
 *
 * Run this alongside build-seo.mjs / build-blog-seo.mjs whenever content
 * changes — see .github/workflows/build-seo.yml.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SITEMAP_PATH = path.join(ROOT, 'sitemap.xml');
const SITE_URL = 'https://everydaybeautyproducts.com';

function locToFilePath(loc) {
  let p = loc.replace(SITE_URL, '');
  if (p === '' || p === '/') p = '/index.html';
  return path.join(ROOT, p);
}

function gitDate(absPath) {
  try {
    const rel = path.relative(ROOT, absPath);
    const out = execSync(`git log -1 --format=%cI -- "${rel}"`, {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim();
    return out ? out.slice(0, 10) : null;
  } catch {
    return null;
  }
}

function mtimeDate(absPath) {
  return statSync(absPath).mtime.toISOString().slice(0, 10);
}

function lastmodFor(absPath) {
  if (!existsSync(absPath)) return null;
  return gitDate(absPath) || mtimeDate(absPath);
}

let sitemap = readFileSync(SITEMAP_PATH, 'utf8');

let updated = 0;
let skipped = 0;

sitemap = sitemap.replace(
  /<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g,
  (match, loc, oldDate) => {
    const filePath = locToFilePath(loc.trim());
    const newDate = lastmodFor(filePath);
    if (!newDate) {
      skipped++;
      console.warn(`  ! No local file found for ${loc.trim()} — keeping existing lastmod (${oldDate})`);
      return match;
    }
    updated++;
    return match.replace(`<lastmod>${oldDate}</lastmod>`, `<lastmod>${newDate}</lastmod>`);
  }
);

writeFileSync(SITEMAP_PATH, sitemap);
console.log(`sitemap.xml: ${updated} lastmod date(s) updated, ${skipped} skipped (no matching file).`);
