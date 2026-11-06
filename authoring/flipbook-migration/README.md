# Flipbook migration — FlipHTML5 export → Sitecore + Next.js

This folder contains the tooling to migrate a FlipHTML5 static export into
Sitecore content items rendered by the `Flipbook` Next.js component
(`ai-sales-agent/src/components/Flipbook/`).

## Pipeline (XM Cloud — no PowerShell/SPE required)

SPE is not available on XM Cloud, so everything is deployed through **Sitecore
CLI item serialization** (`dotnet sitecore ser push`), the same mechanism the
repo already uses for all templates/renderings/content under
`authoring/items/`.

### 1. Extract the export → manifest

```bash
node authoring/flipbook-migration/extract-flipbook.mjs \
  "<path-to-flipbook-export-folder>" \
  authoring/flipbook-migration/flipbook-manifest.json
```

Produces `flipbook-manifest.json`: pages, local image paths
(`files/large/*.webp`, `files/thumb/*.webp`), decoded hotspots
(`openPage` → `internalPage`, `link` → `externalLink`, plus iframe/audio/
popup action types), per-page search text, TOC entries, and reader settings.

### 2. Copy images into the Next.js app

```bash
cp "<export>/files/large/"*.webp ai-sales-agent/public/flipbook/large/
cp "<export>/files/thumb/"*.webp ai-sales-agent/public/flipbook/thumb/
```

Page/thumbnail/popup images are stored as **text fields containing the asset
path** (`/flipbook/large/<file>.webp`) and served from the app's `public/`
folder — no Media Library upload needed. `model.ts` also still accepts real
Sitecore Image fields if you ever switch back.

### 3. Generate serialization YAML

```bash
node authoring/flipbook-migration/generate-items.mjs \
  authoring/flipbook-migration/flipbook-manifest.json
```

Writes into `authoring/items/ai-sales-agent/ai-sales-agent/`:

- **Templates** — `templates/.../Page Content/Flipbook/`:
  `Flipbook` (datasource), `Flipbook Page`, `Flipbook Hotspot`,
  `Flipbook TOC Entry`, each with a `Content` section and field items.
- **Rendering** — `renderings/.../Page Content/Flipbook.yml`
  (Controller rendering, `componentName=Flipbook`, datasource template set).
- **Available Renderings** — `content/.../Presentation/Available Renderings/Flipbook.yml`.
- **Settings** — `content/.../Settings/Flipbook/` droplist sources
  (`Flip Style`: Flip/Slide/Scroll; `Hotspot Types`: Internal Page,
  External Link, Popup Image, Popup Video, Iframe, Audio).
- **Content** — `content/.../Data/Flipbooks/<Book Name>/`:
  1 Flipbook datasource + 44 `Flipbook Page` children (each with a
  `Hotspots` multilist) + hotspot items + TOC entries. All `en` only;
  other site languages fall back to `en`.

All item IDs are fixed in `item-ids.json` (generated once, reused on
re-runs), so template/content/rendering cross-references are deterministic.

### 4. Deploy

```bash
cd <repo root>
dotnet tool restore
dotnet sitecore login --authority https://auth.sitecorecloud.io \
  --cm https://<your-cm-host>.sitecorecloud.io
dotnet sitecore ser push
```

The `content` module declares `references: ["7kc.ai-sales-agent.templates"]`,
so templates are pushed before content automatically.

### 5. Use it

- `npm run dev` in `ai-sales-agent` — `Flipbook` is already in
  `.sitecore/component-map.ts`.
- Add the **Flipbook** rendering to a page (Presentation Details →
  `headless-main` placeholder) and pick the datasource
  `Data/Flipbooks/<Book Name>`, or serialize the page's
  `__Final Renderings` to automate that too.

## Field → model mapping

Handled by `normalizeFlipbook()` in `src/components/Flipbook/model.ts`.
Field names in the templates must match `Flipbook.props.ts`.

- `Pages` / `Hotspots` / `Table Of Contents` are **Multilist** fields
  (newline-separated `{GUID}` values in serialization).
- `Target Page` (hotspot + TOC) is a **Droplink** to a Flipbook Page item.
- `Flip Style` / `Hotspot Type` are **Droplists** — the stored value is the
  source item's *name* (`Flip`, `Internal Page`, ...).
- `Page Image` / `Thumbnail` / `Popup Image` are **Single-Line Text** asset
  paths; `Link` is a standard **General Link** field.
- Hotspot `Area *` numbers are percentages (0–100) of the page box.

## Known gaps / next steps

- **Multilist resolution**: verify in Experience Editor that `Pages`,
  `Hotspots`, and `Table Of Contents` resolve to child items with fields
  (same pattern as `FAQSection`'s `FAQ Items`). If they don't, add a
  `getComponentServerProps` data fetcher to `Flipbook.tsx` that queries the
  datasource via `SitecoreClient`.
- **Pixel-perfect search highlights** (`text_position[N].js` polygons) are
  not ported; search jumps to the page with a text snippet.
- **Page-flip realism** approximates turn.js with CSS 3D; BGM, watermark,
  page-curl shading and sound effects from the original config were unused
  and are not implemented.
- `generate-content-yaml.mjs` is an earlier draft kept for reference —
  `generate-items.mjs` is the current generator.
- `spe-scripts/flipbook-*.ps1` target XM/XP + SPE and are **not usable on
  XM Cloud**; kept for non-cloud environments only.
