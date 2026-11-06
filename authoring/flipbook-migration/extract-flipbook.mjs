#!/usr/bin/env node
/**
 * extract-flipbook.mjs
 *
 * Reads a FlipHTML5 static export and produces a normalized JSON manifest
 * that the Sitecore import script (flipbook-import.ps1) can consume.
 *
 * Usage:
 *   node extract-flipbook.mjs <path-to-flipbook-folder> [output.json]
 *
 * Decoded semantics (from files/yzReader app.js keymap):
 *   BSi            -> items (hotspots)
 *   xAA            -> style { 206:left px, t88:top px, UBe:width px, UNE:height px }
 *   ywD / DJX      -> originalPathWidth / originalPathHeight
 *   2HV            -> actionList
 *   wSf.EeA        -> openPage target (1-based page number as string)
 *   fRe.PVT        -> external link URL
 *   L9f / GX1      -> page label / zero-based index
 *   FW9 / Jyi      -> large image / thumbnail path
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import vm from 'node:vm';

const [, , inputDir, outputPath] = process.argv;
if (!inputDir) {
  console.error('Usage: node extract-flipbook.mjs <flipbook-folder> [output.json]');
  process.exit(1);
}

const root = resolve(inputDir);
const pageEditorPath = join(root, 'files', 'pageEditor.js');
const searchConfigPath = join(root, 'files', 'search', 'search_config.js');
const flipPagesPath = join(root, 'javascript', 'config.js');

if (!existsSync(pageEditorPath)) {
  console.error(`pageEditor.js not found at ${pageEditorPath}`);
  process.exit(1);
}

/* ---------------- load readerConfig ---------------- */
const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(readFileSync(pageEditorPath, 'utf8'), sandbox, {
  filename: 'pageEditor.js',
});
const readerConfig =
  sandbox.readerConfig ?? sandbox.window?.readerConfig;
if (!readerConfig?.pages) {
  console.error('readerConfig.pages not found — unexpected pageEditor.js format');
  process.exit(1);
}

const pageW = readerConfig.pageConfig?.pageWidth ?? 1167;
const pageH = readerConfig.pageConfig?.pageHeight ?? 825;

/* ---------------- optional search text ---------------- */
let searchTexts = [];
if (existsSync(searchConfigPath)) {
  const src = readFileSync(searchConfigPath, 'utf8');
  const m = src.match(/var\s+textForPages\s*=\s*(\[[\s\S]*?\])\s*;?\s*$/);
  if (m) {
    try {
      searchTexts = vm.runInNewContext(`(${m[1]})`, {});
    } catch {
      console.warn('Could not parse search_config.js — search text will be empty');
    }
  }
}

/* ---------------- optional fliphtml5_pages (image names) ---------------- */
let flipPages = [];
if (existsSync(flipPagesPath)) {
  const src = readFileSync(flipPagesPath, 'utf8');
  const keyIdx = src.indexOf('fliphtml5_pages');
  if (keyIdx !== -1) {
    // Balanced-bracket scan: the array contains nested arrays/objects, so a
    // lazy regex would stop at the first inner ']'.
    const start = src.indexOf('[', keyIdx);
    if (start !== -1) {
      let depth = 0;
      let end = -1;
      let inStr = false;
      for (let i = start; i < src.length; i++) {
        const ch = src[i];
        if (inStr) {
          if (ch === '\\') i++;
          else if (ch === '"' || ch === "'") inStr = false;
          continue;
        }
        if (ch === '"' || ch === "'") inStr = true;
        else if (ch === '[' || ch === '{') depth++;
        else if (ch === ']' || ch === '}') {
          depth--;
          if (depth === 0) { end = i; break; }
        }
      }
      if (end !== -1) {
        try {
          flipPages = vm.runInNewContext(`(${src.slice(start, end + 1)})`, {});
        } catch {
          console.warn('Could not parse fliphtml5_pages');
        }
      }
    }
  }
}

/* ---------------- decode helpers ---------------- */
const toPct = (px, total) =>
  total > 0 ? Math.round((px / total) * 10000) / 100 : 0;

const decodeHotspot = (item, index) => {
  const style = item.xAA ?? {};
  const actions = Array.isArray(item['2HV']) ? item['2HV'] : [];

  // First meaningful action wins (FlipHTML5 items carry a single action in practice)
  let type = 'externalLink';
  let targetPage = null;
  let url = null;

  for (const action of actions) {
    if (action?.wSf) {
      type = 'internalPage';
      const p = parseInt(action.wSf.EeA, 10);
      targetPage = Number.isFinite(p) ? p : null;
      break;
    }
    if (action?.fRe) {
      type = 'externalLink';
      url = action.fRe.PVT ?? null;
      break;
    }
    if (action?.fiC) {
      type = 'iframe';
      url = action.fiC.PVT ?? action.fiC.OI6 ?? null;
      break;
    }
    if (action?.k2I) {
      type = 'popupImage';
      url = action.k2I.PVT ?? null;
      break;
    }
    if (action?.nFd) {
      type = 'popupVideo';
      url = action.nFd.PVT ?? null;
      break;
    }
    if (action?.rpJ) {
      type = 'audio';
      url = action.rpJ.PVT ?? null;
      break;
    }
  }

  // Geometry: xAA style values are px in the pageConfig coordinate space
  // (pageWidth x pageHeight). Prefer explicit originalPathWidth/Height
  // (ywD/DJX) for size when present, else the style px values.
  const leftPx = parseFloat(String(style['206'] ?? '0').replace('px', '')) || 0;
  const topPx = parseFloat(String(style.t88 ?? '0').replace('px', '')) || 0;
  const widthPx =
    parseFloat(String(style.UBe ?? '0').replace('px', '')) || item.ywD || 0;
  const heightPx =
    parseFloat(String(style.UNE ?? '0').replace('px', '')) || item.DJX || 0;

  return {
    index,
    type,
    label: item.dsc ?? item.alt ?? item.wLC ?? `Hotspot ${index + 1}`,
    rect: {
      left: toPct(leftPx, pageW),
      top: toPct(topPx, pageH),
      width: toPct(widthPx, pageW),
      height: toPct(heightPx, pageH),
    },
    targetPage, // 1-based page number -> resolved to item later
    url,
    raw: undefined, // keep output clean; set undefined to drop key
  };
};

/* ---------------- build manifest ---------------- */
const pages = readerConfig.pages.map((p, i) => {
  const items = Array.isArray(p.BSi) ? p.BSi : [];
  return {
    index: i,
    label: String(p.L9f ?? i + 1),
    // Prefer local filenames from fliphtml5_pages (config.js) — pageEditor.js
    // FW9/Jyi values are remote fliphtml5.com URLs, while the static export
    // stores pages under files/large|thumb with hashed local names.
    image: flipPages[i]?.n?.[0]
      ? `./files/large/${flipPages[i].n[0]}`
      : (p.FW9 ?? null),
    thumb: flipPages[i]?.t ?? p.Jyi ?? null,
    searchText: typeof searchTexts[i] === 'string' ? searchTexts[i] : '',
    hotspots: items.map((it, hi) => decodeHotspot(it, hi)),
  };
});

// Resolve internalPage targets: page number (1-based label) -> page index.
const labelToIndex = new Map(pages.map((p) => [p.label, p.index]));
for (const page of pages) {
  for (const h of page.hotspots) {
    if (h.type === 'internalPage' && h.targetPage != null) {
      h.targetIndex = labelToIndex.get(String(h.targetPage)) ?? h.targetPage - 1;
    }
  }
}

const manifest = {
  source: root,
  generatedAt: new Date().toISOString(),
  pageCount: pages.length,
  pageWidth: pageW,
  pageHeight: pageH,
  settings: {
    title: 'Workwear - Food and beverage industry',
    flipStyle: 'Flip',
    themeColor: '#397AF3',
    backgroundColor: '#1b2930',
    showToolbar: true,
    showThumbnails: true,
    showTableOfContents: true,
    showSearch: true,
    showPageNumbers: true,
    rightToLeft: false,
    autoPlay: false,
    autoPlayInterval: 5,
  },
  toc: [
    // Printed TOC entries are encoded as page-5 hotspots; mirror the known
    // structure. Adjust per publication.
    { caption: 'Food Clean', targetPage: 7 },
    { caption: 'Food Comfort', targetPage: 13 },
    { caption: 'Food Deluxe', targetPage: 19 },
    { caption: 'Food Xtra', targetPage: 23 },
  ],
  pages,
};

const out = outputPath ?? join(root, 'flipbook-manifest.json');
writeFileSync(out, JSON.stringify(manifest, null, 2));
console.log(`Wrote ${out}`);
console.log(`  pages: ${pages.length}, hotspots: ${pages.reduce((a, p) => a + p.hotspots.length, 0)}`);
