# Flipbook migration — FlipHTML5 export → Sitecore + Next.js

This folder contains the tooling to migrate a FlipHTML5 static export into
Sitecore content items rendered by the `Flipbook` Next.js component
(`ai-sales-agent/src/components/Flipbook/`).

## What was implemented in the front end

| File | Purpose |
|---|---|
| `src/components/Flipbook/Flipbook.tsx` | Sitecore rendering entry point |
| `src/components/Flipbook/model.ts` | Normalizes Sitecore field shapes (GraphQL `jsonValue` / Layout Service `value`) into a clean `FlipbookModel` |
| `src/components/Flipbook/FlipbookViewer.tsx` | Viewer: flip/slide/scroll modes, spreads, deep-linking (`#p=N`), keyboard + swipe, autoplay |
| `src/components/Flipbook/panels.tsx` | Toolbar, TOC panel, thumbnail strip, search panel |
| `src/components/Flipbook/popups.tsx` | Popup host for image/video/iframe/audio/external-link hotspots |
| `src/components/Flipbook/Flipbook.module.css` | Flip leaf animation + panel styles |

Behavior parity with the FlipHTML5 export:

- **Pages** are full-page images; navigation flips spreads of two (Flip mode),
  slides one page at a time (Slide), or scrolls (Scroll) — matching
  `FlipStyle`/`phoneFlipStyle`/`autoDoublePage` semantics.
- **Hotspots** map to `openPage` (internal page jump) and `link`
  (external URL), plus popup image/video, iframe and audio actions —
  the same action types the yzReader keymap defines.
- **TOC**: the printed TOC page's hotspots become `internalPage` hotspots;
  the optional TOC panel is driven by `Table Of Contents` multilist items
  (equivalent of the runtime `ols` outline, which was empty in the export).
- **Search**: `Search Text` per page powers the search panel (client-side,
  no `text_position[N].js` polygons — word-level highlight boxes are a
  possible later enhancement).
- **Deep links**: `#p=N` hash is read on load and updated on navigation,
  matching `updateURLForPage=yes` + share-link `#p=` behavior.

## Sitecore implementation steps (XM Cloud-compatible)

### 1. Deploy serialized templates via CLI

The templates and rendering are provided as Sitecore serialized YAML files
under `authoring/items/ai-sales-agent/ai-sales-agent/`:

```
authoring/items/ai-sales-agent/ai-sales-agent/
  templates/ai-sales-agent.Page Content/Flipbook/
    Flipbook.yml                     → Flipbook datasource template
    Flipbook/Content/*.yml           → Settings fields
    Flipbook Page.yml                → Page template
    Flipbook Page/Content/*.yml      → Page fields (Image, Thumbnail, Search Text, Hotspots)
    Flipbook Hotspot.yml             → Hotspot template
    Flipbook Hotspot/Content/*.yml   → Hotspot fields (Type, Area, Label, Target Page, Link, URLs)
    Flipbook TOC Entry.yml           → TOC entry template
    Flipbook TOC Entry/Content/*.yml → Caption, Target Page
  renderings/ai-sales-agent.Page Content/
    Flipbook.yml                     → Controller rendering (componentName=Flipbook)
  content/ai-sales-agent/ai-sales-agent/Presentation/Available Renderings/
    Flipbook.yml                     → Available Renderings entry
```

Deploy to XM Cloud:

```bash
cd ai-sales-agent
npx jss deploy items --includeContent
```

This creates (or updates) the templates, rendering, and available renderings entry
without requiring PowerShell Extensions.

### 2. Upload media

Upload the 44 page images (`files/large/*.webp`) and thumbnails
(`files/thumb/*.webp`) to the Media Library, e.g.
`/sitecore/media library/Project/ai-sales-agent/Flipbook/`.

### 3. Extract the flipbook export

```bash
node authoring/flipbook-migration/extract-flipbook.mjs \
  "C:\Users\m.hamza\Downloads\Workwear - Food Beverage Flipbook en-DE" \
  flipbook-manifest.json
```

Produces `flipbook-manifest.json`: 44 pages, decoded hotspots
(`openPage` → `internalPage` + target index, `link` → `externalLink` + URL),
per-page search text, and TOC entries.

### 4. Import content via SPE (CM, if SPE is available)

If your XM Cloud tenant has SPE installed and you have elevation rights,
run `authoring/spe-scripts/flipbook-import.ps1` to create the datasource
item tree.

If SPE is not available in XM Cloud, you have two options:

- **Option A**: Author the datasource item manually in the Content Editor:
  - Create a `Flipbook` item under `/sitecore/content/ai-sales-agent/ai-sales-agent/Data/Flipbooks/`
  - Add `Flipbook Page` children (44) with Page Image, Thumbnail, Search Text
  - Add `Flipbook Hotspot` children under each page for interactive links
  - Add `Flipbook TOC Entry` children for the TOC panel
- **Option B**: Generate content serialization YAML (similar to the templates)
  from the manifest and deploy via `npx jss deploy items`. This can be
  automated if you'd like to provide the `flipbook-manifest.json` for that step.

### 5. Add the rendering to a page

Presentation Details → add **Flipbook** → pick the Flipbook datasource item.

### 6. Verify

- `npm run dev` regenerates `.sitecore/component-map.ts` (includes `Flipbook`).
- Check `#p=7` deep link, TOC entries, page-5-style hotspots, external links
  (they open in a popup confirm → new tab), thumbnails, search.

## Known gaps / next steps

- **Pixel-perfect search highlight boxes** (`text_position[N].js` polygons)
  are not ported; search currently jumps to the page with a text snippet.
  To restore highlights, precompute word boxes at import or measure text at
  runtime.
- **Page-flip realism**: the CSS 3D leaf animation approximates turn.js;
  for a closer match consider `page-flip` (StPageFlip) — it was avoided to
  keep zero new dependencies.
- **Multilist field resolution** depends on the component's GraphQL query
  including child item fields; verify in Experience Editor that `Pages`,
  `Hotspots`, and `Table Of Contents` resolve. If the SDK query only returns
  IDs, extend the component query or switch these fields to child-items
  traversal in `[[...path]].tsx`.
- BGM, watermark, page curl shading, and sound effects from the original
  config are not implemented (they were largely unused/disabled in the
  export anyway: `FlipSound=false`, `watermarkInfo.isShowMark=false`,
  `BGMInfo=[]`).
- **Flip Style / Hotspot Type droplist values** are not pre-populated in YAML;
  after deploy, you may need to manually create the droplist source items
  under `/sitecore/content/ai-sales-agent/ai-sales-agent/Settings/Flipbook/`
  (`Flip Style - Flip/Slide/Scroll`, `Hotspot Types - Internal Page/External Link/…`)
  and update the field Source values in the template. This is a known limitation
  of pure YAML deployment without SPE — drop-source items are content, not
  templates, so they can't be included in the template serialization alone.
