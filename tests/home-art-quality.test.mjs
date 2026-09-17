import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url));

test('studio artwork is the complete verified native-resolution AVIF', () => {
  const asset = read('public/buysor-studio-v6-1536.avif');
  assert.equal(asset.byteLength, 35440);
  assert.equal(createHash('sha256').update(asset).digest('hex'), '53ba1dfa2641dd550126e35abdb40da8f47fce2955002f7ac199412fe73b3278');
  assert.equal(asset.toString('ascii', 8, 12), 'avif');
  const ispe = asset.indexOf(Buffer.from('ispe'));
  assert.ok(ispe >= 0);
  assert.equal(asset.readUInt32BE(ispe + 8), 1536);
  assert.equal(asset.readUInt32BE(ispe + 12), 1024);
});

test('home prefers the new artwork without removing its compatible fallback', () => {
  const page = read('app/page.tsx').toString('utf8');
  assert.match(page, /<picture>/);
  assert.match(page, /type="image\/avif"/);
  assert.match(page, /srcSet="\/buysor-studio-v6-1536\.avif"/);
  assert.match(page, /src="\/buysor-home-showroom-20260917\.webp"/);
  assert.match(page, /loading="eager"/);
  assert.match(page, /fetchPriority="high"/);
  assert.match(page, /showroom\.stage/);
  assert.match(page, /href: "\/credits"/);
  assert.match(page, /href: "\/pricing"/);
});

test('artwork styling blends empty margins without blur or CSS enlargement', () => {
  const css = read('app/hero-showroom.module.css').toString('utf8');
  assert.match(css, /background: var\(--canvas, #fff\)/);
  assert.match(css, /max-width: 960px/);
  assert.match(css, /object-fit: contain/);
  assert.match(css, /mask-composite: intersect/);
  assert.doesNotMatch(css, /(?:filter\s*:|transform\s*:.*scale\()/);
});
