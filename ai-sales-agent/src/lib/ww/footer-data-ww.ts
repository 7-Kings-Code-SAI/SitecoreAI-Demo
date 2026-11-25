import type {
  FooterWWDatasource,
  FooterWWLinkGroup,
  FooterWWLinkItem,
} from 'src/components/FooterWW/FooterWW.props';

export interface NormalizedFooterWWLink {
  id?: string;
  text: string;
  href: string;
}

export interface NormalizedFooterWWLinkColumn {
  id?: string;
  title?: string;
  links: NormalizedFooterWWLink[];
}

export interface FooterWWContactFields {
  phoneNumber?: string;
  workingHours?: string;
  messageLabel?: string;
  pressContactHtml?: string;
  prAgencyHtml?: string;
  contactTitle?: string;
}

export interface ResolvedFooterWWContent {
  contact: FooterWWContactFields;
  linkColumns: NormalizedFooterWWLinkColumn[];
  hasContactContent: boolean;
  hasContent: boolean;
}

type FieldRecord = Record<string, unknown>;

const asRecord = (value: unknown): FieldRecord | undefined =>
  value && typeof value === 'object' ? (value as FieldRecord) : undefined;

const fieldValue = (field: unknown): unknown => {
  const rec = asRecord(field);
  if (!rec) return undefined;
  const jsonVal = asRecord(rec.jsonValue);
  return rec.value ?? jsonVal?.value ?? rec.jsonValue;
};

const fieldString = (field: unknown): string | undefined => {
  const v = fieldValue(field);
  return asNonEmptyString(typeof v === 'string' ? v : asRecord(v)?.value);
};

const asNonEmptyString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
};

export const resolveFooterDatasourceWW = (fields: unknown): FooterWWDatasource | undefined => {
  const root = fields as
    | { data?: { datasource?: FooterWWDatasource }; datasource?: FooterWWDatasource }
    | FooterWWDatasource
    | undefined;

  if (!root || typeof root !== 'object') return undefined;
  const ds =
    'data' in root && root.data?.datasource
      ? root.data.datasource
      : 'datasource' in root && root.datasource
        ? root.datasource
        : (root as FooterWWDatasource);

  const rawFields = (ds as { fields?: Array<{ name?: string; jsonValue?: unknown }> })?.fields;
  if (!Array.isArray(rawFields)) return ds;

  const mapped: Record<string, unknown> = { ...(ds as Record<string, unknown>) };
  for (const field of rawFields) {
    if (field?.name) {
      mapped[field.name] = field.jsonValue;
    }
  }
  return mapped as FooterWWDatasource;
};

const getLinkFieldValue = (linkItem: FooterWWLinkItem | undefined) => {
  const rawItem = asRecord(linkItem);
  const rawFields = asRecord(rawItem?.fields);
  const linkField = asRecord(rawItem?.link ?? rawFields?.Link ?? rawItem?.Link);
  if (!linkField) return undefined;

  const nestedLink = asRecord(linkField.link);
  const nestedJson = asRecord(linkField.jsonValue);
  return (nestedLink?.value ??
    nestedJson?.value ??
    linkField.jsonValue ??
    linkField.value ??
    linkField) as { text?: string; href?: string } | undefined;
};

const normalizeLink = (
  linkItem: FooterWWLinkItem | undefined,
  fallbackId: string,
): NormalizedFooterWWLink | undefined => {
  const linkValue = getLinkFieldValue(linkItem);
  const text = asNonEmptyString(linkValue?.text);
  const href = asNonEmptyString(linkValue?.href);
  if (!text || !href) return undefined;

  return { id: linkItem?.id ?? fallbackId, text, href };
};

const normalizeLinkColumn = (
  group: FooterWWLinkGroup,
  index: number,
): NormalizedFooterWWLinkColumn | undefined => {
  const rawGroup = asRecord(group);
  const rawFields = asRecord(rawGroup?.fields);
  const title = fieldString(rawGroup?.title ?? rawFields?.Title ?? rawGroup?.Title);
  const childrenRec = asRecord(rawGroup?.children);
  const childResults = childrenRec?.results ?? rawFields?.children ?? [];
  const links = (Array.isArray(childResults) ? (childResults as FooterWWLinkItem[]) : [])
    .map((linkItem, linkIndex) => normalizeLink(linkItem, `${index}-${linkIndex}`))
    .filter((link): link is NormalizedFooterWWLink => Boolean(link));

  if (!title && links.length === 0) return undefined;

  return {
    id: group.id ?? `footer-column-${index}`,
    title,
    links,
  };
};

/** Resolves FooterWW content from GraphQL children/results shapes. */
export const resolveFooterContentWW = (fields: unknown): ResolvedFooterWWContent => {
  const datasource = resolveFooterDatasourceWW(fields);

  const rawDs = asRecord(datasource);
  const contact: FooterWWContactFields = {
    phoneNumber: fieldString(rawDs?.phoneNumber ?? rawDs?.['Phone Number']),
    workingHours: fieldString(rawDs?.workingHours ?? rawDs?.['Working Hours']),
    messageLabel: fieldString(rawDs?.messageLabel ?? rawDs?.['Message Label']),
    pressContactHtml: fieldString(rawDs?.pressContact ?? rawDs?.['Press Contact']),
    prAgencyHtml: fieldString(rawDs?.prAgency ?? rawDs?.['PR Agency']),
    contactTitle: fieldString(rawDs?.contactTitle ?? rawDs?.ContactTitle),
  };

  const linkColumns = (datasource?.children?.results ?? [])
    .map((group, index) => normalizeLinkColumn(group, index))
    .filter((column): column is NormalizedFooterWWLinkColumn => Boolean(column));

  const hasContactContent = Boolean(
    contact.phoneNumber ||
      contact.workingHours ||
      contact.messageLabel ||
      contact.pressContactHtml ||
      contact.prAgencyHtml ||
      contact.contactTitle,
  );

  return {
    contact,
    linkColumns,
    hasContactContent,
    hasContent: hasContactContent || linkColumns.length > 0,
  };
};
