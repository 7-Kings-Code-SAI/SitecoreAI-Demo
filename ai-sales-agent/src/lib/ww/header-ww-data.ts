import type {
  ComponentPropsCollection,
  Field,
  ImageField,
  LinkField,
} from '@sitecore-content-sdk/nextjs';
import {
  getPlaceholderItems,
  type PlaceholderRenderingItem,
} from './HeaderWW.utils';
import { isUrlActiveWW, normalizeLinkFieldWW, resolveLinkHrefWW } from './utils';

export interface NormalizedHeaderLinkWW {
  id?: string;
  title: string;
  link?: LinkField;
  textField?: Field<string>;
}

export interface NormalizedHeaderGroupWW {
  uid?: string;
  title: string;
  titleField?: Field<string>;
  link?: LinkField;
  links: NormalizedHeaderLinkWW[];
}

export interface NormalizedHeaderNewsWW {
  title: string;
  description: string;
  image?: ImageField;
  link?: LinkField;
  titleField?: Field<string>;
  descriptionField?: Field<string>;
}

export interface NormalizedHeaderSectionWW {
  uid?: string;
  title: string;
  titleField?: Field<string>;
  link?: LinkField;
  news: NormalizedHeaderNewsWW;
  groups: NormalizedHeaderGroupWW[];
}

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | undefined =>
  value && typeof value === 'object' ? (value as UnknownRecord) : undefined;

const getArrayField = (node: UnknownRecord | undefined, name: string): unknown => {
  const fieldsArr = node?.fields;
  if (!Array.isArray(fieldsArr)) return undefined;
  return fieldsArr.find((entry) => asRecord(entry)?.name === name);
};

const getRawField = (node: UnknownRecord | undefined, names: string[]): unknown => {
  if (!node) return undefined;
  for (const name of names) {
    if (node[name] !== undefined) return node[name];
    const fromArray = getArrayField(node, name);
    if (fromArray !== undefined) return fromArray;
  }
  return undefined;
};

export const extractTextFieldWW = (rawField: unknown): Field<string> | undefined => {
  const rec = asRecord(rawField);
  if (!rec) return undefined;
  const jsonVal = asRecord(rec.jsonValue);
  if (jsonVal && 'value' in jsonVal) return jsonVal as unknown as Field<string>;
  if ('value' in rec && typeof rec.value === 'string') return rec as unknown as Field<string>;
  return undefined;
};

export const extractTextValueWW = (rawField: unknown): string => {
  if (typeof rawField === 'string') return rawField.trim();
  const field = extractTextFieldWW(rawField);
  if (typeof field?.value === 'string') return field.value.trim();
  const rec = asRecord(rawField);
  const nested = asRecord(rec?.jsonValue);
  if (typeof nested?.value === 'string') return nested.value.trim();
  return '';
};

export const extractLinkFieldWW = (rawField: unknown): LinkField | undefined => {
  const rec = asRecord(rawField);
  if (!rec) return undefined;
  if (rec.value && typeof rec.value === 'object') return rec as unknown as LinkField;
  if (rec.jsonValue) return extractLinkFieldWW(rec.jsonValue);
  if (rec.link) return extractLinkFieldWW(rec.link);
  return undefined;
};

export const extractImageFieldWW = (rawField: unknown): ImageField | undefined => {
  const rec = asRecord(rawField);
  if (!rec) return undefined;
  if (rec.value && typeof rec.value === 'object') return rec as ImageField;
  if (rec.jsonValue) return extractImageFieldWW(rec.jsonValue);
  if (rec.image) return extractImageFieldWW(rec.image);
  return undefined;
};

const resolveDatasourceNode = (fields: unknown): UnknownRecord | undefined => {
  const rec = asRecord(fields);
  if (!rec) return undefined;
  const dataRec = asRecord(rec.data);
  if (dataRec?.datasource) return asRecord(dataRec.datasource);
  if (rec.datasource) return asRecord(rec.datasource);
  return rec;
};

const getChildrenResults = (node: UnknownRecord | undefined): UnknownRecord[] => {
  if (!node) return [];
  const children = node.children;
  if (Array.isArray(children)) {
    return children.map(asRecord).filter((item): item is UnknownRecord => Boolean(item));
  }
  const results = asRecord(children)?.results;
  if (Array.isArray(results)) {
    return results.map(asRecord).filter((item): item is UnknownRecord => Boolean(item));
  }
  return [];
};

const normalizeLinkNode = (node: UnknownRecord): NormalizedHeaderLinkWW => {
  const link = extractLinkFieldWW(getRawField(node, ['Link', 'link']));
  const textField = extractTextFieldWW(getRawField(node, ['Text', 'text', 'Title', 'title', 'Link Text']));
  const textValue = extractTextValueWW(getRawField(node, ['Text', 'text', 'Title', 'title', 'Link Text']));
  const linkText = typeof link?.value?.text === 'string' ? link.value.text.trim() : '';

  return {
    id: typeof node.id === 'string' ? node.id : undefined,
    title: linkText || textValue,
    link,
    textField,
  };
};

export const normalizeHeaderGroupWW = (
  fields: unknown,
  uid?: string,
): NormalizedHeaderGroupWW => {
  const ds = resolveDatasourceNode(fields);
  const titleField = extractTextFieldWW(getRawField(ds, ['Title', 'title']));
  const link = extractLinkFieldWW(getRawField(ds, ['Link', 'link']));
  const linkText = typeof link?.value?.text === 'string' ? link.value.text.trim() : '';
  const title = extractTextValueWW(getRawField(ds, ['Title', 'title', 'Text', 'text'])) || linkText;

  const links = getChildrenResults(ds)
    .map(normalizeLinkNode)
    .filter((item) => Boolean(item.title || resolveLinkHrefWW(item.link)));

  return {
    uid,
    title,
    titleField,
    link,
    links,
  };
};

const mergeRenderingFields = (
  rendering: PlaceholderRenderingItem,
  componentPropsMap: ComponentPropsCollection | undefined,
): unknown => {
  const serverProps = rendering.uid ? asRecord(componentPropsMap?.[rendering.uid]) : undefined;
  return serverProps?.fields ?? rendering.fields;
};

const normalizeNewsFromNode = (node: UnknownRecord | undefined): NormalizedHeaderNewsWW => {
  const titleRaw = getRawField(node, ['News Title', 'newsTitle']);
  const descRaw = getRawField(node, ['News Description', 'newsDescription']);
  const imageRaw = getRawField(node, ['News Image', 'newsImage']);
  const linkRaw = getRawField(node, ['News Link', 'newsLink']);

  return {
    title: extractTextValueWW(titleRaw),
    description: extractTextValueWW(descRaw),
    image: extractImageFieldWW(imageRaw),
    link: extractLinkFieldWW(linkRaw),
    titleField: extractTextFieldWW(titleRaw),
    descriptionField: extractTextFieldWW(descRaw),
  };
};

export const normalizeHeaderSectionWW = (
  fields: unknown,
  placeholders?: Record<string, unknown>,
  componentPropsMap?: ComponentPropsCollection,
  uid?: string,
): NormalizedHeaderSectionWW => {
  const ds = resolveDatasourceNode(fields);
  const titleField = extractTextFieldWW(getRawField(ds, ['Title', 'title']));
  const link = extractLinkFieldWW(getRawField(ds, ['Link', 'link']));
  const linkText = typeof link?.value?.text === 'string' ? link.value.text.trim() : '';
  const title = extractTextValueWW(getRawField(ds, ['Title', 'title', 'Text', 'text'])) || linkText;

  const groupRenderings = getPlaceholderItems(placeholders, [
    'mega-menu-groups-ww',
    'mega-menu-groups',
  ]);

  const groups: NormalizedHeaderGroupWW[] =
    groupRenderings.length > 0
      ? groupRenderings.map((groupRendering) =>
          normalizeHeaderGroupWW(
            mergeRenderingFields(groupRendering, componentPropsMap),
            groupRendering.uid,
          ),
        )
      : getChildrenResults(ds).map((childNode) => normalizeHeaderGroupWW(childNode));

  return {
    uid,
    title,
    titleField,
    link,
    news: normalizeNewsFromNode(ds),
    groups,
  };
};

export const resolveHeaderSectionsWW = (
  renderingPlaceholders: Record<string, unknown> | undefined,
  fields: unknown,
  componentPropsMap: ComponentPropsCollection | undefined,
): NormalizedHeaderSectionWW[] => {
  const navRenderings = getPlaceholderItems(renderingPlaceholders, [
    'header-nav-ww',
    'header-nav',
  ]).filter(
    (item) =>
      !item.componentName ||
      item.componentName === 'HeaderMenuWW' ||
      item.componentName === 'HeaderMenu',
  );

  if (navRenderings.length > 0) {
    return navRenderings.map((menuRendering) =>
      normalizeHeaderSectionWW(
        mergeRenderingFields(menuRendering, componentPropsMap),
        menuRendering.placeholders,
        componentPropsMap,
        menuRendering.uid,
      ),
    );
  }

  const ds = resolveDatasourceNode(fields);
  return getChildrenResults(ds).map((sectionNode) =>
    normalizeHeaderSectionWW(sectionNode, undefined, componentPropsMap),
  );
};

export const newsHasContentWW = (news: NormalizedHeaderNewsWW | undefined, locale: string): boolean => {
  if (!news) return false;
  const href = resolveLinkHrefWW(normalizeLinkFieldWW(news.link, locale));
  const imgSrc = news.image?.value?.src?.trim();
  return Boolean(news.title || news.description || imgSrc || href);
};

export const sectionHasRenderableLinksWW = (
  section: NormalizedHeaderSectionWW | undefined,
  locale: string,
): boolean => {
  if (!section) return false;
  return section.groups.some((group) => {
    const groupHref = resolveLinkHrefWW(normalizeLinkFieldWW(group.link, locale));
    if (groupHref && group.title) return true;
    return group.links.some((item) => {
      const itemHref = resolveLinkHrefWW(normalizeLinkFieldWW(item.link, locale));
      return Boolean(itemHref && item.title);
    });
  });
};

export const sectionHasActiveLinkWW = (
  section: NormalizedHeaderSectionWW | undefined,
  asPath: string | undefined,
  locale: string,
): boolean => {
  if (!section) return false;

  const sectionHref = resolveLinkHrefWW(normalizeLinkFieldWW(section.link, locale));
  if (sectionHref && isUrlActiveWW(sectionHref, asPath, locale)) return true;

  return section.groups.some((group) => {
    const groupHref = resolveLinkHrefWW(normalizeLinkFieldWW(group.link, locale));
    if (groupHref && isUrlActiveWW(groupHref, asPath, locale)) return true;

    return group.links.some((item) => {
      const itemHref = resolveLinkHrefWW(normalizeLinkFieldWW(item.link, locale));
      return Boolean(itemHref && isUrlActiveWW(itemHref, asPath, locale));
    });
  });
};
