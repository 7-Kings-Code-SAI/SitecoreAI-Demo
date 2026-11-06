#!/usr/bin/env node
/**
 * generate-content-yaml.mjs
 *
 * Reads flipbook-manifest.json and generates Sitecore content serialization YAML
 * for the Flipbook datasource, pages, hotspots, and TOC entries.
 *
 * Usage: node generate-content-yaml.mjs <manifest.json> <output-dir>
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const [, , manifestPath, outputDir] = process.argv;
if (!manifestPath || !outputDir) {
  console.error('Usage: node generate-content-yaml.mjs <manifest.json> <output-dir>');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const { pages, toc, settings, pageWidth, pageHeight } = manifest;

const CONTENT_ROOT = '/sitecore/content/ai-sales-agent/ai-sales-agent/Data/Flipbooks';
const FLIPBOOK_ID = '11111111-2222-3333-4444-555555555555';
const FLIPBOOK_PAGE_TPL_ID = 'E8F9A0B1-C2D3-4567-8901-234567890123';
const HOTSPOT_TPL_ID = 'A6B7C8D9-E0F1-2345-6789-012345678901';
const TOC_TPL_ID = 'F8A9B0C1-D2E3-4567-1234-678901234567';

// Ensure output directory exists
mkdirSync(outputDir, { recursive: true });

function yamlString(str) {
  if (str === null || str === undefined) return '';
  // Escape if needed; for now assume clean
  return str;
}

function writeYaml(path, obj) {
  const dir = dirname(path);
  mkdirSync(dir, { recursive: true });
  const lines = ['---'];
  function dump(prefix, val) {
    if (val === null || val === undefined) return;
    if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === 'object' && item !== null) {
          lines.push(`${prefix}-`);
          for (const [k, v] of Object.entries(item)) {
            dump(`${prefix}  ${k}:`, v);
          }
        } else {
          lines.push(`${prefix}- ${JSON.stringify(item)}`);
        }
      }
    } else if (typeof val === 'object' && val !== null) {
      for (const [k, v] of Object.entries(val)) {
        dump(`${prefix}${k}:`, v);
      }
    } else {
      lines.push(`${prefix}${String(val)}`);
    }
  }
  dump('', obj);
  lines.push('');
  writeFileSync(path, lines.join('\n'), 'utf8');
}

// Generate Flipbook datasource item
const flipbookYaml = {
  ID: FLIPBOOK_ID,
  Parent: '{11111111-2222-3333-4444-555555555556}', // Data folder placeholder
  Template: FLIPBOOK_ID,
  Path: `${CONTENT_ROOT}/Workwear Flipbook`,
  SharedFields: [
    { ID: 'ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e', Hint: '__Sortorder', Value: 100 },
  ],
  Languages: [
    {
      Language: 'en',
      Versions: [
        {
          Version: 1,
          Fields: [
            { ID: '25bed78c-4957-4165-998a-ca1b52f67497', Hint: '__Created', Value: '20260101T000000Z' },
            { ID: '52807595-0f8f-4b20-8d2a-cb71d28c6103', Hint: '__Owner', Value: 'sitecore\\admin' },
            { ID: '5dd74568-4d4b-44c1-b513-0af5f4cda34f', Hint: '__Created by', Value: 'sitecore\\admin' },
            { ID: '8cdc337e-a112-42fb-bbb4-4143751e123f', Hint: '__Revision', Value: '11111111-2222-3333-4444-555555555555' },
            { ID: 'badd9cf9-53e0-4d0c-bcc0-2d784c282f6a', Hint: '__Updated by', Value: 'sitecore\\admin' },
            { ID: 'd9cf14b1-fa16-4ba6-9288-e8a174d4d522', Hint: '__Updated', Value: '20260101T000000Z' },
            { ID: 'A1B2C3D4-E5F6-7890-ABCD-EF1234567890', Hint: 'Title', Value: settings.title },
            { ID: 'B2C3D4E5-F6A7-8901-BCDE-F12345678901', Hint: 'Description', Value: settings.description },
            { ID: 'C3D4E5F6-A7B8-9012-CDEF-123456789012', Hint: 'Page Width', Value: pageWidth },
            { ID: 'D4E5F6A7-B8C9-0123-DEF0-234567890123', Hint: 'Page Height', Value: pageHeight },
            { ID: 'E5F6A7B8-C9D0-1234-EF01-345678901234', Hint: 'Flip Style', Value: settings.flipStyle },
            { ID: 'F6A7B8C9-D0E1-2345-F012-456789012345', Hint: 'Theme Color', Value: settings.themeColor },
            { ID: 'A7B8C9D0-E1F2-3456-0123-567890123456', Hint: 'Background Color', Value: settings.backgroundColor },
            { ID: 'B8C9D0E1-F2A3-4567-1234-678901234567', Hint: 'Show Toolbar', Value: settings.showToolbar ? '1' : '0' },
            { ID: 'C9D0E1F2-A3B4-5678-2345-789012345678', Hint: 'Show Thumbnails', Value: settings.showThumbnails ? '1' : '0' },
            { ID: 'D0E1F2A3-B4C5-6789-3456-890123456789', Hint: 'Show Table Of Contents', Value: settings.showTableOfContents ? '1' : '0' },
            { ID: 'E1F2A3B4-C5D6-7890-4567-901234567890', Hint: 'Show Search', Value: settings.showSearch ? '1' : '0' },
            { ID: 'F2A3B4C5-D6E7-8901-5678-012345678901', Hint: 'Show Page Numbers', Value: settings.showPageNumbers ? '1' : '0' },
            { ID: 'A3B4C5D6-E7F8-9012-6789-123456789012', Hint: 'Right To Left', Value: settings.rightToLeft ? '1' : '0' },
            { ID: 'B4C5D6E7-F8A9-0123-7890-234567890123', Hint: 'Auto Play', Value: settings.autoPlay ? '1' : '0' },
            { ID: 'C5D6E7F8-A9B0-1234-8901-345678901234', Hint: 'Auto Play Interval', Value: settings.autoPlayInterval },
          ],
        },
      ],
    },
  ],
};

writeYaml(join(outputDir, 'Workwear Flipbook.yml'), flipbookYaml);

// Generate pages and hotspots
const pageIds = [];
for (let i = 0; i < pages.length; i++) {
  const page = pages[i];
  const pageId = `22222222-${String(i).padStart(4, '0')}-4444-5555-666666666666`;
  pageIds.push(pageId);

  const pageYaml = {
    ID: pageId,
    Parent: FLIPBOOK_ID,
    Template: FLIPBOOK_PAGE_TPL_ID,
    Path: `${CONTENT_ROOT}/Workwear Flipbook/Page ${i + 1}`,
    SharedFields: [
      { ID: 'ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e', Hint: '__Sortorder', Value: (i + 1) * 100 },
    ],
    Languages: [
      {
        Language: 'en',
        Versions: [
          {
            Version: 1,
            Fields: [
              { ID: '25bed78c-4957-4165-998a-ca1b52f67497', Hint: '__Created', Value: '20260101T000000Z' },
              { ID: '52807595-0f8f-4b20-8d2a-cb71d28c6103', Hint: '__Owner', Value: 'sitecore\\admin' },
              { ID: '5dd74568-4d4b-44c1-b513-0af5f4cda34f', Hint: '__Created by', Value: 'sitecore\\admin' },
              { ID: '8cdc337e-a112-42fb-bbb4-4143751e123f', Hint: '__Revision', Value: `22222222-${String(i).padStart(4, '0')}-4444-5555-666666666666` },
              { ID: 'badd9cf9-53e0-4d0c-bcc0-2d784c282f6a', Hint: '__Updated by', Value: 'sitecore\\admin' },
              { ID: 'd9cf14b1-fa16-4ba6-9288-e8a174d4d522', Hint: '__Updated', Value: '20260101T000000Z' },
              { ID: 'A0B1C2D3-E4F5-6789-0123-456789012345', Hint: 'Page Label', Value: page.label },
              { ID: 'D3E4F5A6-B7C8-9012-3456-789012345678', Hint: 'Search Text', Value: page.searchText || '' },
              // Image fields - placeholder; user must upload media and update IDs
              { ID: 'A0B1C2D3-E4F5-6789-0123-456789012345', Hint: 'Page Image', Value: '' },
              { ID: 'B1C2D3E4-F5A6-7890-1234-567890123456', Hint: 'Thumbnail', Value: '' },
            ],
          },
        ],
      },
    ],
  };

  writeYaml(join(outputDir, `Page ${i + 1}.yml`), pageYaml);

  // Generate hotspots
  for (let h = 0; h < page.hotspots.length; h++) {
    const hotspot = page.hotspots[h];
    const hotspotId = `33333333-${String(i).padStart(4, '0')}-${String(h).padStart(4, '0')}-7777-888888888888`;

    const hotspotYaml = {
      ID: hotspotId,
      Parent: pageId,
      Template: HOTSPOT_TPL_ID,
      Path: `${CONTENT_ROOT}/Workwear Flipbook/Page ${i + 1}/Hotspot ${h + 1}`,
      SharedFields: [
        { ID: 'ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e', Hint: '__Sortorder', Value: (h + 1) * 100 },
      ],
      Languages: [
        {
          Language: 'en',
          Versions: [
            {
              Version: 1,
              Fields: [
                { ID: '25bed78c-4957-4165-998a-ca1b52f67497', Hint: '__Created', Value: '20260101T000000Z' },
                { ID: '52807595-0f8f-4b20-8d2a-cb71d28c6103', Hint: '__Owner', Value: 'sitecore\\admin' },
                { ID: '5dd74568-4d4b-44c1-b513-0af5f4cda34f', Hint: '__Created by', Value: 'sitecore\\admin' },
                { ID: '8cdc337e-a112-42fb-bbb4-4143751e123f', Hint: '__Revision', Value: `33333333-${String(i).padStart(4, '0')}-${String(h).padStart(4, '0')}-7777-888888888888` },
                { ID: 'badd9cf9-53e0-4d0c-bcc0-2d784c282f6a', Hint: '__Updated by', Value: 'sitecore\\admin' },
                { ID: 'd9cf14b1-fa16-4ba6-9288-e8a174d4d522', Hint: '__Updated', Value: '20260101T000000Z' },
                { ID: 'C8D9E0F1-E2F3-4567-8901-234567890123', Hint: 'Hotspot Type', Value: hotspot.type },
                { ID: 'D9E0F1E2-F3A4-5678-9012-345678901234', Hint: 'Area Left', Value: hotspot.rect.left },
                { ID: 'E0F1E2F3-A4B5-6789-0123-456789012345', Hint: 'Area Top', Value: hotspot.rect.top },
                { ID: 'F1E2F3A4-B5C6-7890-1234-567890123456', Hint: 'Area Width', Value: hotspot.rect.width },
                { ID: 'E2F3A4B5-C6D7-8901-2345-678901234567', Hint: 'Area Height', Value: hotspot.rect.height },
                { ID: 'F3A4B5C6-D7E8-9012-3456-789012345678', Hint: 'Label', Value: hotspot.label || '' },
                // Target Page - will be set by item ID after all pages are created
                { ID: 'A4B5C6D7-E8F9-0123-4567-890123456789', Hint: 'Target Page', Value: '' },
                { ID: 'B5C6D7E8-F9A0-1234-5678-901234567890', Hint: 'Link', Value: hotspot.url ? `<link text="${hotspot.url}" linktype="external" url="${hotspot.url}" target="_blank" />` : '' },
                { ID: 'C6D7E8F9-A0B1-2345-6789-012345678901', Hint: 'Popup Image', Value: '' },
                { ID: 'D7E8F9A0-B1C2-3456-7890-123456789012', Hint: 'Video URL', Value: hotspot.url || '' },
                { ID: 'E8F9A0B1-C2D3-4567-8901-234567890123', Hint: 'Iframe URL', Value: hotspot.url || '' },
                { ID: 'F9A0B1C2-D3E4-5678-9012-345678901234', Hint: 'Audio URL', Value: hotspot.url || '' },
              ],
            },
          ],
        },
      ],
    };

    writeYaml(join(outputDir, `Page ${i + 1}`, `Hotspot ${h + 1}.yml`), hotspotYaml);
  }
}

// Generate TOC entries
for (let t = 0; t < toc.length; t++) {
  const entry = toc[t];
  const tocId = `44444444-${String(t).padStart(4, '0')}-6666-7777-999999999999`;
  const targetPageIndex = entry.targetPage ? entry.targetPage - 1 : -1;
  const targetPageId = targetPageIndex >= 0 ? pageIds[targetPageIndex] : '';

  const tocYaml = {
    ID: tocId,
    Parent: FLIPBOOK_ID,
    Template: TOC_TPL_ID,
    Path: `${CONTENT_ROOT}/Workwear Flipbook/TOC - ${entry.caption.replace(/[^a-zA-Z0-9]/g, '')}`,
    SharedFields: [
      { ID: 'ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e', Hint: '__Sortorder', Value: (t + 1) * 100 },
    ],
    Languages: [
      {
        Language: 'en',
        Versions: [
          {
            Version: 1,
            Fields: [
              { ID: '25bed78c-4957-4165-998a-ca1b52f67497', Hint: '__Created', Value: '20260101T000000Z' },
              { ID: '52807595-0f8f-4b20-8d2a-cb71d28c6103', Hint: '__Owner', Value: 'sitecore\\admin' },
              { ID: '5dd74568-4d4b-44c1-b513-0af5f4cda34f', Hint: '__Created by', Value: 'sitecore\\admin' },
              { ID: '8cdc337e-a112-42fb-bbb4-4143751e123f', Hint: '__Revision', Value: `44444444-${String(t).padStart(4, '0')}-6666-7777-999999999999` },
              { ID: 'badd9cf9-53e0-4d0c-bcc0-2d784c282f6a', Hint: '__Updated by', Value: 'sitecore\\admin' },
              { ID: 'd9cf14b1-fa16-4ba6-9288-e8a174d4d522', Hint: '__Updated', Value: '20260101T000000Z' },
              { ID: 'B0C1D2E3-F4A5-6789-0123-456789012345', Hint: 'Caption', Value: entry.caption },
              { ID: 'C1D2E3F4-A5B6-7890-1234-567890123456', Hint: 'Target Page', Value: targetPageId },
            ],
          },
        ],
      },
    ],
  };

  writeYaml(join(outputDir, `TOC - ${entry.caption.replace(/[^a-zA-Z0-9]/g, '')}.yml`), tocYaml);
}

console.log(`Generated ${pages.length} pages + ${pages.reduce((a, p) => a + p.hotspots.length, 0)} hotspots + ${toc.length} TOC entries in ${outputDir}`);
console.log('Note: Image fields are empty - upload media to Media Library and update after deploy.');
