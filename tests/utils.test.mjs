// =============================================
// utils.test.mjs — Level 1: pure function tests
// Run with: node --test
// -------------------------------------------------------------
// These test the small, dependency-free helper functions in
// assets/js/utils.js. No DOM, no network — pure input → output checks.
// utils.js also registers the service worker on import (guarded by
// `if ('serviceWorker' in navigator)`), which is safely a no-op under
// Node since `navigator` doesn't exist there.
// =============================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatNumber, formatCat, buildAffiliateLink, renderStars, CAT_LABELS } from '../assets/js/utils.js';

test('formatNumber: below 1000 stays as-is', () => {
  assert.equal(formatNumber(42), '42');
  assert.equal(formatNumber(999), '999');
});

test('formatNumber: 1000+ gets a K suffix with one decimal', () => {
  assert.equal(formatNumber(1500), '1.5K');
  assert.equal(formatNumber(24960), '25.0K');
  assert.equal(formatNumber(183519), '183.5K');
});

test('formatCat: known category slugs map to their display label', () => {
  assert.equal(formatCat('skin-care'), 'Skin Care');
  assert.equal(formatCat('foot-hand-nail'), 'Foot, Hand & Nail');
});

test('formatCat: unknown slug falls back to the raw slug (no crash)', () => {
  assert.equal(formatCat('made-up-category'), 'made-up-category');
});

test('CAT_LABELS: has exactly the 6 categories the site supports', () => {
  const expected = ['skin-care', 'makeup', 'hair-care', 'fragrance', 'foot-hand-nail', 'personal-care'];
  assert.deepEqual(Object.keys(CAT_LABELS).sort(), expected.sort());
});

test('buildAffiliateLink: builds a correct Amazon URL with the tag', () => {
  const link = buildAffiliateLink('B00XYZ1234', 'everydaybe092-20');
  assert.equal(link, 'https://www.amazon.com/dp/B00XYZ1234?tag=everydaybe092-20');
});

test('renderStars: a perfect 5.0 rating renders 5 filled stars, 0 half/empty', () => {
  const html = renderStars(5);
  assert.equal((html.match(/star filled/g) || []).length, 5);
  assert.ok(!html.includes('star half'));
});

test('renderStars: a 4.5 rating renders 4 filled + 1 half star', () => {
  const html = renderStars(4.5);
  assert.equal((html.match(/star filled/g) || []).length, 4);
  assert.equal((html.match(/star half/g) || []).length, 1);
});

test('renderStars: always renders exactly 5 star spans total, for any rating', () => {
  for (const rating of [0, 1, 2.5, 3.7, 4.9, 5]) {
    const html = renderStars(rating);
    assert.equal((html.match(/<span class="star/g) || []).length, 5, `rating=${rating}`);
  }
});
