// =============================================
// data-integrity.test.mjs — Level 2: catches typos/mistakes in the data
// files that would otherwise only show up as a visual bug in the browser
// (or an invisible one, like a dead image or a broken discount badge).
// Run with: node --test
// =============================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { products } from '../assets/js/products.js';
import { blogPosts } from '../assets/js/posts.js';
import { CAT_LABELS } from '../assets/js/utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── PRODUCTS ────────────────────────────────────────────────────

test('products: every id is unique', () => {
  const ids = products.map((p) => p.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual(dupes, [], `Duplicate product id(s): ${dupes.join(', ')}`);
});

test('products: category is always one of the 6 real site categories', () => {
  const validCats = Object.keys(CAT_LABELS);
  for (const p of products) {
    assert.ok(validCats.includes(p.category), `"${p.name}" has invalid category "${p.category}"`);
  }
});

test('products: ASIN looks like a real 10-character Amazon ASIN', () => {
  for (const p of products) {
    assert.match(p.asin, /^[A-Z0-9]{10}$/, `"${p.name}" has a malformed ASIN "${p.asin}"`);
  }
});

test('products: rating is between 0 and 5', () => {
  for (const p of products) {
    assert.ok(p.rating >= 0 && p.rating <= 5, `"${p.name}" has out-of-range rating ${p.rating}`);
  }
});

test('products: if oldPrice is set, it must be higher than price (so the discount badge makes sense)', () => {
  for (const p of products) {
    if (p.oldPrice !== undefined) {
      assert.ok(p.oldPrice > p.price, `"${p.name}" has oldPrice (${p.oldPrice}) <= price (${p.price})`);
    }
  }
});

test('products: every image file referenced actually exists on disk', () => {
  for (const p of products) {
    const imgPath = path.join(ROOT, p.img);
    assert.ok(existsSync(imgPath), `"${p.name}" points to a missing image: ${p.img}`);
  }
});

// ── BLOG POSTS ──────────────────────────────────────────────────

test('blogPosts: every id is unique', () => {
  const ids = blogPosts.map((p) => p.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual(dupes, [], `Duplicate blog post id(s): ${dupes.join(', ')}`);
});

test('blogPosts: every href points to a real .html file on disk', () => {
  for (const p of blogPosts) {
    const filePath = path.join(ROOT, p.href.replace(/^\//, ''));
    assert.ok(existsSync(filePath), `"${p.title}" points to a missing page: ${p.href}`);
  }
});

test('blogPosts: every image file referenced actually exists on disk', () => {
  for (const p of blogPosts) {
    const imgPath = path.join(ROOT, p.img);
    assert.ok(existsSync(imgPath), `"${p.title}" points to a missing image: ${p.img}`);
  }
});

test('blogPosts: createdAt is a valid, parseable date', () => {
  for (const p of blogPosts) {
    const d = new Date(p.createdAt);
    assert.ok(!Number.isNaN(d.getTime()), `"${p.title}" has an unparseable createdAt: ${p.createdAt}`);
  }
});
