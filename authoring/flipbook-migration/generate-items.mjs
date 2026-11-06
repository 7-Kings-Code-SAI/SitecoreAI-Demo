#!/usr/bin/env node
/**
 * generate-items.mjs
 *
 * Generates Sitecore serialization YAML (7kc module format) for the Flipbook
 * feature: templates, rendering, available-renderings entry, settings
 * droplist sources, and the flipbook content tree (datasource, pages,
 * hotspots, TOC entries).
 *
 * Usage:
 *   node generate-items.mjs <manifest.json> [items-root]
 *
 * Defaults items-root to ../items/ai-sales-agent/ai-sales-agent
 * (i.e. authoring/items/ai-sales-agent/ai-sales-agent).
 *
 * All item IDs come from item-ids.json next to this script — generated once
 * and reused, so re-runs are idempotent and cross-references stay stable.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const [, , manifestPath, itemsRootArg] = process.argv;
if (!manifestPath) {
  console.error('Usage: node generate-items.mjs <manifest.json> [items-root]');
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const ITEMS_ROOT = itemsRootArg
  ? join(itemsRootArg)
  : join(here, '..', 'items', 'ai-sales-agent', 'ai-sales-agent');
const IDS_PATH = join(here, 'item-ids.json');

/* ------------------------------------------------------------------ */
/* ID registry                                                         */
/* ------------------------------------------------------------------ */

const guid = () => randomUUID().toUpperCase();

function loadIds() {
  if (existsSync(IDS_PATH)) return JSON.parse(readFileSync(IDS_PATH, 'utf8'));

  const fieldIds = (names) =>
    Object.fromEntries(names.map((n) => [n, guid()]));

  const ids = {
    templates: {
      folder: guid(), // Page Content/Flipbook folder item
      'Flipbook': { item: guid(), section: guid(), fields: fieldIds([
        'Title', 'Description', 'Page Width', 'Page Height', 'Flip Style',
        'Theme Color', 'Background Color', 'Show Toolbar', 'Show Thumbnails',
        'Show Table Of Contents', 'Show Search', 'Show Page Numbers',
        'Right To Left', 'Auto Play', 'Auto Play Interval', 'Pages',
        'Table Of Contents',
      ])},
      'Flipbook Page': { item: guid(), section: guid(), fields: fieldIds([
        'Page Image', 'Thumbnail', 'Page Label', 'Search Text', 'Hotspots',
      ])},
      'Flipbook Hotspot': { item: guid(), section: guid(), fields: fieldIds([
        'Hotspot Type', 'Area Left', 'Area Top', 'Area Width', 'Area Height',
        'Label', 'Target Page', 'Link', 'Popup Image', 'Video URL',
        'Iframe URL', 'Audio URL',
      ])},
      'Flipbook TOC Entry': { item: guid(), section: guid(), fields: fieldIds([
        'Caption', 'Target Page',
      ])},
    },
    rendering: guid(),
    availableRendering: guid(),
    settings: {
      flipbook: guid(),
      flipStyleFolder: guid(),
      flipStyleItems: { Flip: guid(), Slide: guid(), Scroll: guid() },
      hotspotTypesFolder: guid(),
      hotspotTypeItems: {
        'Internal Page': guid(),
        'External Link': guid(),
        'Popup Image': guid(),
        'Popup Video': guid(),
        Iframe: guid(),
        Audio: guid(),
      },
    },
    flipbooksFolder: guid(),
    book: guid(),
    pages: manifest.pages.map(() => guid()),
    hotspots: manifest.pages.map((p) => p.hotspots.map(() => guid())),
    toc: manifest.toc.map(() => guid()),
  };

  writeFileSync(IDS_PATH, JSON.stringify(ids, null, 2) + '\n', 'utf8');
  console.log(`Created ${IDS_PATH}`);
  return ids;
}

const ids = loadIds();

/* ------------------------------------------------------------------ */
/* YAML emitter (matches existing 7kc serialization style)             */
/* ------------------------------------------------------------------ */

const SYSTEM_FIELD_IDS = {
  created: '25bed78c-4957-4165-998a-ca1b52f67497',
  owner: '52807595-0f8f-4b20-8d2a-cb71d28c6103',
  createdBy: '5dd74568-4d4b-44c1-b513-0af5f4cda34f',
  revision: '8cdc337e-a112-42fb-bbb4-4143751e123f',
  updatedBy: 'badd9cf9-53e0-4d0c-bcc0-2d784c282f6a',
  updated: 'd9cf14b1-fa16-4ba6-9288-e8a174d4d522',
  sortorder: 'ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e',
  sharedRevision: 'dbbbeca1-21c7-4906-9dd2-493c1efa59a2',
};

const NOW = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const OWNER = 'sitecore\\admin';

/** Emit a scalar value in Sitecore YAML style. */
function yamlValue(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  const s = String(v).replace(/\r\n/g, '\n');
  if (s.includes('\n')) return '|\n' + s.split('\n').map((l) => '        ' + l).join('\n');
  // Quote when the scalar could be misread (leading special char, colon+space,
  // looks like a number/bool, contains quotes or braces-heavy content).
  if (/^[{\[&*!|>'"%@`]/.test(s) || /:\s/.test(s) || s === '' ||
      /^(true|false|null|yes|no|on|off)$/i.test(s) ||
      /^-?[\d.]+$/.test(s) || s.includes('"')) {
    return JSON.stringify(s);
  }
  return s;
}

function fieldEntry(id, hint, value, indent = '    ') {
  const v = yamlValue(value);
  if (v.startsWith('|')) {
    // block scalar: "Value: |" then indented lines already embedded
    return `${indent}- ID: "${id}"\n${indent}  Hint: ${hint}\n${indent}  Value: ${v}`;
  }
  return `${indent}- ID: "${id}"\n${indent}  Hint: ${hint}\n${indent}  Value: ${v}`;
}

/**
 * Build one serialized item file body.
 * @param {object} p
 * @param {string} p.id item GUID
 * @param {string} p.parent parent item GUID
 * @param {string} p.template template item GUID
 * @param {string} p.path informational item path
 * @param {Array<{id,hint,value}>} [p.sharedFields]
 * @param {Array<{id,hint,value}>} p.fields versioned fields
 * @param {number} [p.sortorder]
 */
function itemYaml(p) {
  const lines = ['---'];
  lines.push(`ID: "${p.id}"`);
  lines.push(`Parent: "${p.parent}"`);
  lines.push(`Template: "${p.template}"`);
  lines.push(`Path: "${p.path}"`);

  const shared = [];
  if (p.sortorder !== undefined) {
    shared.push({ id: SYSTEM_FIELD_IDS.sortorder, hint: '__Sortorder', value: p.sortorder });
  }
  shared.push({ id: SYSTEM_FIELD_IDS.sharedRevision, hint: '__Shared revision', value: p.id });
  for (const f of p.sharedFields ?? []) shared.push(f);

  if (shared.length) {
    lines.push('SharedFields:');
    for (const f of shared) lines.push(fieldEntry(f.id, f.hint, f.value, ''));
  }

  const sysFields = [
    { id: SYSTEM_FIELD_IDS.created, hint: '__Created', value: NOW },
    { id: SYSTEM_FIELD_IDS.owner, hint: '__Owner', value: OWNER },
    { id: SYSTEM_FIELD_IDS.createdBy, hint: '__Created by', value: OWNER },
    { id: SYSTEM_FIELD_IDS.revision, hint: '__Revision', value: p.id },
    { id: SYSTEM_FIELD_IDS.updatedBy, hint: '__Updated by', value: OWNER },
    { id: SYSTEM_FIELD_IDS.updated, hint: '__Updated', value: NOW },
    ...(p.fields ?? []),
  ];

  lines.push('Languages:');
  lines.push('- Language: en');
  lines.push('  Versions:');
  lines.push('  - Version: 1');
  lines.push('    Fields:');
  for (const f of sysFields) lines.push(fieldEntry(f.id, f.hint, f.value, '    '));
  lines.push('');
  return lines.join('\n');
}

function writeYaml(relPath, content) {
  const abs = join(ITEMS_ROOT, relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, 'utf8');
}

/* ------------------------------------------------------------------ */
/* Constants — stock Sitecore template/item IDs                        */
/* ------------------------------------------------------------------ */

const TPL = {
  template: 'ab86861a-6030-46c5-b394-e8f99e8b87db',      // Template
  section: 'e269fbb5-3750-427a-9149-7aa950b49301',      // Template section
  field: '455a3e98-a627-4b40-8035-e683a0331ac7',        // Template field
  folder: '0437fee2-44c9-46a6-abe9-28858d9fee8c',       // Node (folder under templates)
  baseTemplate: '{1930BBEB-7805-471A-A3BE-4858AC7CF696}',
};
const RENDERING_TPL = '04646a89-996f-4ee7-878a-ffdbf1f0ef0d'; // Controller View rendering
const AVAIL_RENDERINGS_TPL = '76da0a8d-fc7e-42b2-af1e-205b49e43f98';
const PARAMS_TEMPLATE = '{4247AAD4-EBDE-4994-998F-E067A51B1FE4}';

// Existing parents (from serialized items)
const PARENT = {
  templatesRoot: 'e0fa1ef0-51a2-46bd-bfe4-fa5d6c0bcc77',       // /sitecore/templates/Project/ai-sales-agent
  pageContentTemplates: '067e85f3-7723-4c40-92e4-5bd0db976815', // .../Page Content
  renderingsPageContent: 'c5b2e906-d69e-4dd9-9da0-3407a261875d',// /sitecore/layout/Renderings/Project/ai-sales-agent/Page Content
  availableRenderings: '2318cb50-469e-4ed1-889d-7baf8f1c4f37', // .../Presentation/Available Renderings
  settings: 'a1f2ffb4-94b0-4278-b6cf-c071e24a745f',             // /sitecore/content/ai-sales-agent/ai-sales-agent/Settings
  data: '26f2b3a6-e7ef-4d5f-83aa-2d8da5fac5d6',                 // .../Data
  dataFolderTemplate: 'a87a00b1-e6db-45ab-8b54-636fec3b5523',   // stock folder template used by Data/* folders
};

const TPL_PATH_ROOT = '/sitecore/templates/Project/ai-sales-agent/Page Content/Flipbook';
const CONTENT_ROOT = '/sitecore/content/ai-sales-agent/ai-sales-agent';
const FLIPBOOKS_PATH = `${CONTENT_ROOT}/Data/Flipbooks`;
const SETTINGS_PATH = `${CONTENT_ROOT}/Settings/Flipbook`;

/* ------------------------------------------------------------------ */
/* Field specs                                                        */
/* ------------------------------------------------------------------ */

const F = (tplKey, name, type, source, sort) => ({
  id: ids.templates[tplKey].fields[name],
  name,
  type,
  source,
  sort,
});

const flipbookFields = [
  F('Flipbook', 'Title', 'Single-Line Text'),
  F('Flipbook', 'Description', 'Multi-Line Text'),
  F('Flipbook', 'Page Width', 'Number'),
  F('Flipbook', 'Page Height', 'Number'),
  F('Flipbook', 'Flip Style', 'Droplist', `${SETTINGS_PATH}/Flip Style`),
  F('Flipbook', 'Theme Color', 'Single-Line Text'),
  F('Flipbook', 'Background Color', 'Single-Line Text'),
  F('Flipbook', 'Show Toolbar', 'Checkbox'),
  F('Flipbook', 'Show Thumbnails', 'Checkbox'),
  F('Flipbook', 'Show Table Of Contents', 'Checkbox'),
  F('Flipbook', 'Show Search', 'Checkbox'),
  F('Flipbook', 'Show Page Numbers', 'Checkbox'),
  F('Flipbook', 'Right To Left', 'Checkbox'),
  F('Flipbook', 'Auto Play', 'Checkbox'),
  F('Flipbook', 'Auto Play Interval', 'Number'),
  F('Flipbook', 'Pages', 'Multilist',
    `query:${FLIPBOOKS_PATH}//*[@@templateid='${ids.templates['Flipbook Page'].item}']`),
  F('Flipbook', 'Table Of Contents', 'Multilist',
    `query:${FLIPBOOKS_PATH}//*[@@templateid='${ids.templates['Flipbook TOC Entry'].item}']`),
];

const pageFields = [
  F('Flipbook Page', 'Page Image', 'Single-Line Text'),
  F('Flipbook Page', 'Thumbnail', 'Single-Line Text'),
  F('Flipbook Page', 'Page Label', 'Single-Line Text'),
  F('Flipbook Page', 'Search Text', 'Multi-Line Text'),
  F('Flipbook Page', 'Hotspots', 'Multilist',
    `query:${FLIPBOOKS_PATH}//*[@@templateid='${ids.templates['Flipbook Hotspot'].item}']`),
];

const hotspotFields = [
  F('Flipbook Hotspot', 'Hotspot Type', 'Droplist', `${SETTINGS_PATH}/Hotspot Types`),
  F('Flipbook Hotspot', 'Area Left', 'Number'),
  F('Flipbook Hotspot', 'Area Top', 'Number'),
  F('Flipbook Hotspot', 'Area Width', 'Number'),
  F('Flipbook Hotspot', 'Area Height', 'Number'),
  F('Flipbook Hotspot', 'Label', 'Single-Line Text'),
  F('Flipbook Hotspot', 'Target Page', 'Droplink', FLIPBOOKS_PATH),
  F('Flipbook Hotspot', 'Link', 'General Link'),
  F('Flipbook Hotspot', 'Popup Image', 'Single-Line Text'),
  F('Flipbook Hotspot', 'Video URL', 'Single-Line Text'),
  F('Flipbook Hotspot', 'Iframe URL', 'Single-Line Text'),
  F('Flipbook Hotspot', 'Audio URL', 'Single-Line Text'),
];

const tocFields = [
  F('Flipbook TOC Entry', 'Caption', 'Single-Line Text'),
  F('Flipbook TOC Entry', 'Target Page', 'Droplink', FLIPBOOKS_PATH),
];

/* ------------------------------------------------------------------ */
/* 1. Templates                                                        */
/* ------------------------------------------------------------------ */

const TEMPLATES_YML_ROOT = join('templates', 'ai-sales-agent', 'Page Content', 'Flipbook');

// Component folder item (Node template) under Page Content
writeYaml(join(TEMPLATES_YML_ROOT + '.yml'), itemYaml({
  id: ids.templates.folder,
  parent: PARENT.pageContentTemplates,
  template: TPL.folder,
  path: `${TPL_PATH_ROOT}`,
  sortorder: 500,
}));

function emitTemplate(tplKey, fieldSpecs) {
  const t = ids.templates[tplKey];
  const tplPath = `${TPL_PATH_ROOT}/${tplKey}`;

  writeYaml(join(TEMPLATES_YML_ROOT, tplKey + '.yml'), itemYaml({
    id: t.item,
    parent: ids.templates.folder,
    template: TPL.template,
    path: tplPath,
    sharedFields: [{
      id: '12c33f3f-86c5-43a5-aeb4-5598cec45116', // __Base template
      hint: '__Base template',
      value: TPL.baseTemplate,
    }],
  }));

  // Content section item
  writeYaml(join(TEMPLATES_YML_ROOT, tplKey, 'Content.yml'), itemYaml({
    id: t.section,
    parent: t.item,
    template: TPL.section,
    path: `${tplPath}/Content`,
  }));

  fieldSpecs.forEach((f, i) => {
    const sharedFields = [
      { id: 'ab162cc0-dc80-4abf-8871-998ee5d7ba32', hint: 'Type', value: f.type },
    ];
    if (f.source) {
      sharedFields.push({
        id: '1eb8ae32-e190-44a6-968d-ed904c794ebf', hint: 'Source', value: f.source,
      });
    }
    writeYaml(
      join(TEMPLATES_YML_ROOT, tplKey, 'Content', `${f.name}.yml`),
      itemYaml({
        id: f.id,
        parent: t.section,
        template: TPL.field,
        path: `${tplPath}/Content/${f.name}`,
        sharedFields,
        sortorder: (i + 1) * 100,
      })
    );
  });
}

emitTemplate('Flipbook', flipbookFields);
emitTemplate('Flipbook Page', pageFields);
emitTemplate('Flipbook Hotspot', hotspotFields);
emitTemplate('Flipbook TOC Entry', tocFields);

/* ------------------------------------------------------------------ */
/* 2. Rendering + Available Renderings                                 */
/* ------------------------------------------------------------------ */

writeYaml(join('renderings', 'ai-sales-agent', 'Page Content', 'Flipbook.yml'), itemYaml({
  id: ids.rendering,
  parent: PARENT.renderingsPageContent,
  template: RENDERING_TPL,
  path: '/sitecore/layout/Renderings/Project/ai-sales-agent/Page Content/Flipbook',
  sharedFields: [
    { id: '037fe404-dd19-4bf7-8e30-4dadf68b27b0', hint: 'componentName', value: 'Flipbook' },
    {
      id: '1a7c85e5-dc0b-490d-9187-bb1dbcb4c72f', hint: 'Datasource Template',
      value: `/sitecore/templates/Project/ai-sales-agent/Page Content/Flipbook/Flipbook`,
    },
    { id: 'a77e8568-1ab3-44f1-a664-b7c37ec7810d', hint: 'Parameters Template', value: PARAMS_TEMPLATE },
    { id: '06d5295c-ed2f-4a54-9bf2-26228d113318', hint: '__Icon', value: 'Control/32x32/book.png' },
  ],
}));

writeYaml(join('content', 'ai-sales-agent', 'ai-sales-agent',
  'Presentation', 'Available Renderings', 'Flipbook.yml'), itemYaml({
  id: ids.availableRendering,
  parent: PARENT.availableRenderings,
  template: AVAIL_RENDERINGS_TPL,
  path: `${CONTENT_ROOT}/Presentation/Available Renderings/Flipbook`,
  sharedFields: [{
    id: '715ae6c0-71c8-4744-ab4f-65362d20ad65',
    hint: 'Renderings',
    value: `{${ids.rendering}}`,
  }],
}));

/* ------------------------------------------------------------------ */
/* 3. Settings droplist sources                                        */
/* ------------------------------------------------------------------ */

const settingsItem = (id, parent, name, path, sort) => itemYaml({
  id, parent, template: PARENT.dataFolderTemplate, path, sortorder: sort,
});

writeYaml(join('content', 'ai-sales-agent', 'ai-sales-agent',
  'Settings', 'Flipbook.yml'), settingsItem(
  ids.settings.flipbook, PARENT.settings, 'Flipbook', `${SETTINGS_PATH}`, 100));

writeYaml(join('content', 'ai-sales-agent', 'ai-sales-agent',
  'Settings', 'Flipbook', 'Flip Style.yml'), settingsItem(
  ids.settings.flipStyleFolder, ids.settings.flipbook, 'Flip Style',
  `${SETTINGS_PATH}/Flip Style`, 100));

['Flip', 'Slide', 'Scroll'].forEach((name, i) => {
  writeYaml(join('content', 'ai-sales-agent', 'ai-sales-agent',
    'Settings', 'Flipbook', 'Flip Style', `${name}.yml`), settingsItem(
    ids.settings.flipStyleItems[name], ids.settings.flipStyleFolder, name,
    `${SETTINGS_PATH}/Flip Style/${name}`, (i + 1) * 100));
});

writeYaml(join('content', 'ai-sales-agent', 'ai-sales-agent',
  'Settings', 'Flipbook', 'Hotspot Types.yml'), settingsItem(
  ids.settings.hotspotTypesFolder, ids.settings.flipbook, 'Hotspot Types',
  `${SETTINGS_PATH}/Hotspot Types`, 200));

Object.keys(ids.settings.hotspotTypeItems).forEach((name, i) => {
  writeYaml(join('content', 'ai-sales-agent', 'ai-sales-agent',
    'Settings', 'Flipbook', 'Hotspot Types', `${name}.yml`), settingsItem(
    ids.settings.hotspotTypeItems[name], ids.settings.hotspotTypesFolder, name,
    `${SETTINGS_PATH}/Hotspot Types/${name}`, (i + 1) * 100));
});

/* ------------------------------------------------------------------ */
/* 4. Flipbook content tree                                            */
/* ------------------------------------------------------------------ */

const BOOK_NAME = 'Workwear - Food and Beverage';
const BOOK_PATH = `${FLIPBOOKS_PATH}/${BOOK_NAME}`;
const s = manifest.settings;

writeYaml(join('content', 'ai-sales-agent', 'ai-sales-agent',
  'Data', 'Flipbooks.yml'), itemYaml({
  id: ids.flipbooksFolder,
  parent: PARENT.data,
  template: PARENT.dataFolderTemplate,
  path: FLIPBOOKS_PATH,
  sortorder: 1500,
}));

// Datasource item
const FID = ids.templates['Flipbook'].fields;
const boolStr = (b) => (b ? '1' : '0');

writeYaml(join('content', 'ai-sales-agent', 'ai-sales-agent',
  'Data', 'Flipbooks', `${BOOK_NAME}.yml`), itemYaml({
  id: ids.book,
  parent: ids.flipbooksFolder,
  template: ids.templates['Flipbook'].item,
  path: BOOK_PATH,
  sortorder: 100,
  fields: [
    { id: FID.Title, hint: 'Title', value: s.title },
    { id: FID.Description, hint: 'Description', value: '' },
    { id: FID['Page Width'], hint: 'Page Width', value: manifest.pageWidth },
    { id: FID['Page Height'], hint: 'Page Height', value: manifest.pageHeight },
    { id: FID['Flip Style'], hint: 'Flip Style', value: s.flipStyle },
    { id: FID['Theme Color'], hint: 'Theme Color', value: s.themeColor },
    { id: FID['Background Color'], hint: 'Background Color', value: s.backgroundColor },
    { id: FID['Show Toolbar'], hint: 'Show Toolbar', value: boolStr(s.showToolbar) },
    { id: FID['Show Thumbnails'], hint: 'Show Thumbnails', value: boolStr(s.showThumbnails) },
    { id: FID['Show Table Of Contents'], hint: 'Show Table Of Contents', value: boolStr(s.showTableOfContents) },
    { id: FID['Show Search'], hint: 'Show Search', value: boolStr(s.showSearch) },
    { id: FID['Show Page Numbers'], hint: 'Show Page Numbers', value: boolStr(s.showPageNumbers) },
    { id: FID['Right To Left'], hint: 'Right To Left', value: boolStr(s.rightToLeft) },
    { id: FID['Auto Play'], hint: 'Auto Play', value: boolStr(s.autoPlay) },
    { id: FID['Auto Play Interval'], hint: 'Auto Play Interval', value: s.autoPlayInterval },
    {
      id: FID.Pages, hint: 'Pages',
      value: ids.pages.map((g) => `{${g}}`).join('\n'),
    },
    {
      id: FID['Table Of Contents'], hint: 'Table Of Contents',
      value: ids.toc.map((g) => `{${g}}`).join('\n'),
    },
  ],
}));

// Pages + hotspots
const normalizeUrl = (u) => {
  if (!u) return '';
  const t = String(u).trim();
  if (!t) return '';
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
};

const assetPath = (p) => {
  if (!p) return '';
  const base = String(p).split('/').pop();
  if (p.includes('/large/')) return `/flipbook/large/${base}`;
  if (p.includes('/thumb/') || p.includes('/tem/')) return `/flipbook/thumb/${base}`;
  return '';
};

manifest.pages.forEach((page, i) => {
  const pageId = ids.pages[i];
  const pageName = `Page ${String(i + 1).padStart(2, '0')}`;
  const PFID = ids.templates['Flipbook Page'].fields;

  const hotspotIds = page.hotspots.map((_, h) => ids.hotspots[i][h]);

  writeYaml(join('content', 'ai-sales-agent', 'ai-sales-agent',
    'Data', 'Flipbooks', BOOK_NAME, `${pageName}.yml`), itemYaml({
    id: pageId,
    parent: ids.book,
    template: ids.templates['Flipbook Page'].item,
    path: `${BOOK_PATH}/${pageName}`,
    sortorder: (i + 1) * 100,
    fields: [
      { id: PFID['Page Image'], hint: 'Page Image', value: assetPath(page.image) },
      { id: PFID.Thumbnail, hint: 'Thumbnail', value: assetPath(page.thumb) },
      { id: PFID['Page Label'], hint: 'Page Label', value: page.label },
      { id: PFID['Search Text'], hint: 'Search Text', value: page.searchText ?? '' },
      {
        id: PFID.Hotspots, hint: 'Hotspots',
        value: hotspotIds.map((g) => `{${g}}`).join('\n'),
      },
    ],
  }));

  page.hotspots.forEach((h, hi) => {
    const HFID = ids.templates['Flipbook Hotspot'].fields;
    const targetPageId =
      h.type === 'internalPage' && h.targetIndex != null && h.targetIndex >= 0
        ? ids.pages[h.targetIndex]
        : null;

    const fields = [
      { id: HFID['Hotspot Type'], hint: 'Hotspot Type', value: hotspotTypeName(h.type) },
      { id: HFID['Area Left'], hint: 'Area Left', value: h.rect.left },
      { id: HFID['Area Top'], hint: 'Area Top', value: h.rect.top },
      { id: HFID['Area Width'], hint: 'Area Width', value: h.rect.width },
      { id: HFID['Area Height'], hint: 'Area Height', value: h.rect.height },
      { id: HFID.Label, hint: 'Label', value: '' },
      {
        id: HFID['Target Page'], hint: 'Target Page',
        value: targetPageId ? `{${targetPageId}}` : '',
      },
      {
        id: HFID.Link, hint: 'Link',
        value: h.type === 'externalLink' && h.url
          ? `<link text="" linktype="external" url="${normalizeUrl(h.url)}" anchor="" target="_blank" />`
          : '',
      },
      { id: HFID['Popup Image'], hint: 'Popup Image', value: '' },
      { id: HFID['Video URL'], hint: 'Video URL', value: '' },
      { id: HFID['Iframe URL'], hint: 'Iframe URL', value: '' },
      { id: HFID['Audio URL'], hint: 'Audio URL', value: '' },
    ];

    writeYaml(join('content', 'ai-sales-agent', 'ai-sales-agent',
      'Data', 'Flipbooks', BOOK_NAME, pageName,
      `Hotspot ${hi + 1}.yml`), itemYaml({
      id: hotspotIds[hi],
      parent: pageId,
      template: ids.templates['Flipbook Hotspot'].item,
      path: `${BOOK_PATH}/${pageName}/Hotspot ${hi + 1}`,
      sortorder: (hi + 1) * 100,
      fields,
    }));
  });
});

function hotspotTypeName(type) {
  return {
    internalPage: 'Internal Page',
    externalLink: 'External Link',
    popupImage: 'Popup Image',
    popupVideo: 'Popup Video',
    iframe: 'Iframe',
    audio: 'Audio',
  }[type] ?? 'External Link';
}

// TOC entries
manifest.toc.forEach((entry, t) => {
  const TFID = ids.templates['Flipbook TOC Entry'].fields;
  const targetIndex = entry.targetPage ? entry.targetPage - 1 : -1;
  const targetPageId =
    targetIndex >= 0 && targetIndex < ids.pages.length ? ids.pages[targetIndex] : null;
  const captionSlug = entry.caption.replace(/[^a-zA-Z0-9]+/g, ' ').trim();

  writeYaml(join('content', 'ai-sales-agent', 'ai-sales-agent',
    'Data', 'Flipbooks', BOOK_NAME, `TOC - ${captionSlug}.yml`), itemYaml({
    id: ids.toc[t],
    parent: ids.book,
    template: ids.templates['Flipbook TOC Entry'].item,
    path: `${BOOK_PATH}/TOC - ${captionSlug}`,
    sortorder: (manifest.pages.length + t + 1) * 100,
    fields: [
      { id: TFID.Caption, hint: 'Caption', value: entry.caption },
      {
        id: TFID['Target Page'], hint: 'Target Page',
        value: targetPageId ? `{${targetPageId}}` : '',
      },
    ],
  }));
});

console.log('Generated Flipbook items under', ITEMS_ROOT);
console.log(`  templates: 4 template items + ${flipbookFields.length + pageFields.length + hotspotFields.length + tocFields.length} fields`);
console.log(`  content: 1 datasource + ${manifest.pages.length} pages + ${manifest.pages.reduce((a, p) => a + p.hotspots.length, 0)} hotspots + ${manifest.toc.length} TOC entries`);
