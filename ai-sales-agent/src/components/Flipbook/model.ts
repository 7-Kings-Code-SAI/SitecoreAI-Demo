/**
 * Normalized, framework-free flipbook model.
 *
 * Sitecore delivers field values in several shapes depending on whether the
 * data came from the Content SDK GraphQL layer (`{ jsonValue }`) or the
 * Layout Service (`{ value }`). The helpers below unwrap all of them so the
 * viewer only deals with plain values.
 */

export type HotspotType =
  | 'internalPage'
  | 'externalLink'
  | 'popupImage'
  | 'popupVideo'
  | 'iframe'
  | 'audio';

export type FlipStyle = 'flip' | 'slide' | 'scroll';

export interface FlipbookImage {
  src: string;
  alt?: string;
}

/** Hotspot rectangle in percentages (0-100) of the page box. */
export interface HotspotRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface FlipbookHotspot {
  id: string;
  type: HotspotType;
  rect: HotspotRect;
  label?: string;
  /** Item ID of the target Flipbook Page (internalPage). */
  targetPageId?: string;
  /** Resolved page index once the model is built. */
  targetIndex?: number;
  /** External / iframe / media URL. */
  url?: string;
  popupImage?: FlipbookImage;
}

export interface FlipbookPage {
  id: string;
  index: number;
  label: string;
  image: FlipbookImage;
  thumb?: FlipbookImage;
  searchText?: string;
  hotspots: FlipbookHotspot[];
}

export interface FlipbookTocEntry {
  id: string;
  caption: string;
  targetPageId?: string;
  targetIndex?: number;
}

export interface FlipbookSettings {
  title?: string;
  description?: string;
  pageWidth: number;
  pageHeight: number;
  flipStyle: FlipStyle;
  themeColor: string;
  backgroundColor: string;
  showToolbar: boolean;
  showThumbnails: boolean;
  showTableOfContents: boolean;
  showSearch: boolean;
  showPageNumbers: boolean;
  rightToLeft: boolean;
  autoPlay: boolean;
  autoPlayInterval: number;
}

export interface FlipbookModel {
  settings: FlipbookSettings;
  pages: FlipbookPage[];
  toc: FlipbookTocEntry[];
}

/* ------------------------------------------------------------------ */
/* Field unwrapping helpers                                            */
/* ------------------------------------------------------------------ */

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null;

/** Unwrap `{ jsonValue }`, `{ value }`, or return the raw value. */
export const unwrapField = (field: unknown): unknown => {
  if (!isRecord(field)) return field;
  if ('jsonValue' in field) return (field as { jsonValue: unknown }).jsonValue;
  if ('value' in field) return (field as { value: unknown }).value;
  return field;
};

const asString = (field: unknown): string | undefined => {
  const value = unwrapField(field);
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return undefined;
};

const asNumber = (field: unknown, fallback = 0): number => {
  const value = unwrapField(field);
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asBoolean = (field: unknown, fallback = false): boolean => {
  const value = unwrapField(field);
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes'].includes(normalized)) return true;
    if (['0', 'false', 'no', ''].includes(normalized)) return false;
  }
  return fallback;
};

const asImage = (field: unknown): FlipbookImage | undefined => {
  const value = unwrapField(field);
  if (!isRecord(value)) return undefined;

  // GraphQL ImageField shape: { value: { src, alt } } already unwrapped,
  // or media item shape { thumbnailUrl/src }.
  const src =
    (value as { src?: string }).src ??
    (value as { url?: string }).url ??
    (value as { thumbnailUrl?: string }).thumbnailUrl;

  if (!src || typeof src !== 'string') return undefined;

  return {
    src,
    alt:
      typeof (value as { alt?: string }).alt === 'string'
        ? (value as { alt: string }).alt
        : undefined,
  };
};

/** Extract an item reference ID from droptree / link / item values. */
const normalizeId = (id: string): string => id.replace(/[{}]/g, '').toLowerCase();

const asItemRef = (field: unknown): string | undefined => {
  const value = unwrapField(field);
  if (typeof value === 'string') {
    // Could be a raw ID, a path, or a URL — only treat GUID-ish values as IDs.
    return /^\{?[0-9a-f-]{36}\}?$/i.test(value.trim())
      ? normalizeId(value.trim())
      : undefined;
  }
  if (isRecord(value)) {
    const candidate =
      (value as { id?: unknown }).id ??
      (value as { itemId?: unknown }).itemId ??
      (value as { targetItem?: unknown }).targetItem;
    if (typeof candidate === 'string') return normalizeId(candidate);
    if (isRecord(candidate) && typeof candidate.id === 'string') {
      return normalizeId(candidate.id);
    }
  }
  return undefined;
};

/** Normalize a multilist field into an array of `{ id, fields }` items. */
const asMultilist = (field: unknown): Array<{ id?: string; fields: UnknownRecord }> => {
  const value = unwrapField(field);
  const list = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray((value as { targetItems?: unknown[] }).targetItems)
      ? (value as { targetItems: unknown[] }).targetItems
      : isRecord(value) && Array.isArray((value as { items?: unknown[] }).items)
        ? (value as { items: unknown[] }).items
        : [];

  return list
    .filter(isRecord)
    .map((item) => {
      const rawFields = (item as { fields?: unknown }).fields;
      const fields: UnknownRecord = {};

      if (Array.isArray(rawFields)) {
        // GraphQL shape: fields: [{ name, jsonValue }]
        for (const f of rawFields) {
          if (isRecord(f) && typeof f.name === 'string') {
            fields[f.name] = f.jsonValue;
          }
        }
      } else if (isRecord(rawFields)) {
        // Layout service shape: fields: { 'Field Name': { value } }
        Object.assign(fields, rawFields);
      }

      const idRaw =
        (item as { id?: unknown }).id ??
        (item as { itemId?: unknown }).itemId ??
        (item as { uid?: unknown }).uid;

      return {
        id: typeof idRaw === 'string' ? normalizeId(idRaw) : undefined,
        fields,
      };
    });
};

/* ------------------------------------------------------------------ */
/* Normalization                                                       */
/* ------------------------------------------------------------------ */

const HOTSPOT_TYPE_MAP: Record<string, HotspotType> = {
  'internal page': 'internalPage',
  internalpage: 'internalPage',
  'external link': 'externalLink',
  externallink: 'externalLink',
  'popup image': 'popupImage',
  popupimage: 'popupImage',
  'popup video': 'popupVideo',
  popupvideo: 'popupVideo',
  iframe: 'iframe',
  audio: 'audio',
  'play audio': 'audio',
  playaudio: 'audio',
};

const normalizeHotspotType = (raw: string | undefined): HotspotType => {
  if (!raw) return 'externalLink';
  return HOTSPOT_TYPE_MAP[raw.trim().toLowerCase()] ?? 'externalLink';
};

const normalizeHotspot = (
  item: { id?: string; fields: UnknownRecord },
  index: number
): FlipbookHotspot => {
  const f = item.fields;
  const type = normalizeHotspotType(asString(f['Hotspot Type'] ?? f.Type));

  // General Link field: { href, linktype, url, ... }
  const linkValue = unwrapField(f.Link);
  const linkHref = isRecord(linkValue)
    ? (linkValue as { href?: string }).href
    : undefined;

  const url =
    asString(f['Video URL']) ??
    asString(f['Iframe URL']) ??
    asString(f['Audio URL']) ??
    linkHref ??
    (isRecord(linkValue) ? (linkValue as { url?: string }).url : undefined);

  const rect = {
    left: asNumber(f['Area Left'], 0),
    top: asNumber(f['Area Top'], 0),
    width: asNumber(f['Area Width'], 100),
    height: asNumber(f['Area Height'], 100),
  };

  return {
    id: item.id ?? `hotspot-${index}`,
    type,
    rect,
    label: asString(f.Label) ?? asString(f.Caption),
    targetPageId: asItemRef(f['Target Page']),
    url: typeof url === 'string' ? url : undefined,
    popupImage: type === 'popupImage' ? asImage(f['Popup Image']) : undefined,
  };
};

const normalizePage = (
  item: { id?: string; fields: UnknownRecord },
  index: number
): FlipbookPage => {
  const f = item.fields;
  const hotspots = asMultilist(f.Hotspots ?? f['Hotspots']).map((h, hi) =>
    normalizeHotspot(h, hi)
  );

  const image =
    asImage(f['Page Image']) ??
    asImage(f.Image) ??
    asImage(f['Thumbnail']);

  return {
    id: item.id ?? `page-${index}`,
    index,
    label: asString(f['Page Label']) ?? String(index + 1),
    image: image ?? { src: '' },
    thumb: asImage(f.Thumbnail),
    searchText: asString(f['Search Text']),
    hotspots,
  };
};

const normalizeTocEntry = (
  item: { id?: string; fields: UnknownRecord },
  index: number
): FlipbookTocEntry => {
  const f = item.fields;
  return {
    id: item.id ?? `toc-${index}`,
    caption:
      asString(f.Caption) ??
      asString(f.Title) ??
      asString(f.Name) ??
      `Page ${index + 1}`,
    targetPageId: asItemRef(f['Target Page']),
  };
};

/**
 * Build a normalized FlipbookModel from the raw rendering `fields` prop.
 * Handles both `fields.data.datasource` (GraphQL) and flat layout-service
 * field shapes.
 */
export const normalizeFlipbook = (fields: unknown): FlipbookModel => {
  const root = (isRecord(fields) ? fields : {}) as UnknownRecord;

  // GraphQL path: fields.data.datasource
  const datasource = isRecord(root.data)
    ? (root.data as UnknownRecord).datasource
    : undefined;

  let source: UnknownRecord = root;
  if (isRecord(datasource)) {
    const dsFields = (datasource as { fields?: unknown }).fields;
    if (Array.isArray(dsFields)) {
      // GraphQL: fields: [{ name, jsonValue }]
      source = {};
      for (const f of dsFields) {
        if (isRecord(f) && typeof f.name === 'string') {
          source[f.name] = f.jsonValue;
        }
      }
    } else {
      // Datasource object with direct properties
      source = { ...(datasource as UnknownRecord) };
      if (isRecord((datasource as UnknownRecord).fields)) {
        Object.assign(
          source,
          (datasource as { fields: UnknownRecord }).fields
        );
      }
    }
    // Also merge top-level datasource props that are not inside `fields`
    for (const [key, value] of Object.entries(datasource as UnknownRecord)) {
      if (key !== 'fields' && !(key in source)) source[key] = value;
    }
  }

  const flipStyleRaw = (asString(source['Flip Style']) ?? 'Flip').toLowerCase();
  const flipStyle: FlipStyle =
    flipStyleRaw === 'slide' ? 'slide' : flipStyleRaw === 'scroll' ? 'scroll' : 'flip';

  const pageWidth = asNumber(source['Page Width'], 1167) || 1167;
  const pageHeight = asNumber(source['Page Height'], 825) || 825;

  const pages = asMultilist(source.Pages ?? source['Pages']).map((p, i) =>
    normalizePage(p, i)
  );

  // Resolve internalPage targets and TOC targets to page indexes by item id.
  const idToIndex = new Map<string, number>();
  pages.forEach((page) => {
    if (page.id) idToIndex.set(page.id, page.index);
  });

  for (const page of pages) {
    for (const hotspot of page.hotspots) {
      if (hotspot.type === 'internalPage' && hotspot.targetPageId) {
        hotspot.targetIndex = idToIndex.get(hotspot.targetPageId);
      }
    }
  }

  const toc = asMultilist(
    source['Table Of Contents'] ?? source.TableOfContents
  ).map((t, i) => {
    const entry = normalizeTocEntry(t, i);
    if (entry.targetPageId) {
      entry.targetIndex = idToIndex.get(entry.targetPageId);
    }
    return entry;
  });

  return {
    settings: {
      title: asString(source.Title),
      description: asString(source.Description),
      pageWidth,
      pageHeight,
      flipStyle,
      themeColor: asString(source['Theme Color']) ?? '#397AF3',
      backgroundColor: asString(source['Background Color']) ?? '#1b2930',
      showToolbar: asBoolean(source['Show Toolbar'], true),
      showThumbnails: asBoolean(source['Show Thumbnails'], true),
      showTableOfContents: asBoolean(source['Show Table Of Contents'], true),
      showSearch: asBoolean(source['Show Search'], true),
      showPageNumbers: asBoolean(source['Show Page Numbers'], true),
      rightToLeft: asBoolean(source['Right To Left'], false),
      autoPlay: asBoolean(source['Auto Play'], false),
      autoPlayInterval: asNumber(source['Auto Play Interval'], 5) || 5,
    },
    pages,
    toc,
  };
};

/** Find a page index by its 1-based page label/number. */
export const findPageIndexByLabel = (
  model: FlipbookModel,
  label: string | number
): number => {
  const target = String(label);
  const byLabel = model.pages.findIndex((p) => p.label === target);
  if (byLabel >= 0) return byLabel;
  const numeric = parseInt(target, 10);
  if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= model.pages.length) {
    return numeric - 1;
  }
  return -1;
};
