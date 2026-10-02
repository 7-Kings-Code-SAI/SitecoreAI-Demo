"use client";

import { useState, useMemo, JSX } from 'react';
import {
  Text,
  RichText,
  Image as JssImage,
  Link as JssLink,
  Field,
  TextField,
  RichTextField,
  ImageField,
  LinkField,
  useSitecore,
} from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

// ============================================================================
// TYPES
// ============================================================================

export interface IntegrationCardFields {
  Label?: Field<string> | TextField | string;
  Category?: Field<string> | TextField | string;
  Title?: Field<string> | TextField | string;
  Logo?: ImageField | string;
  Description?: Field<string> | TextField | RichTextField | string;
  [key: string]: any;
}

export interface IntegrationCardItem {
  id?: string;
  name?: string;
  displayName?: string;
  url?: string;
  fields?: IntegrationCardFields;
  // Support direct flat fields if structured without nested .fields
  Label?: Field<string> | TextField | string;
  Category?: Field<string> | TextField | string;
  Title?: Field<string> | TextField | string;
  Logo?: ImageField | string;
  Description?: Field<string> | TextField | RichTextField | string;
  [key: string]: any;
}

export interface IntegrationsFields {
  Label?: Field<string> | TextField | string;
  Title?: Field<string> | TextField | string;
  Description?: Field<string> | TextField | RichTextField | string;
  FootText?: Field<string> | TextField | RichTextField | string;
  'Foot Text'?: Field<string> | TextField | RichTextField | string;
  'General Link'?: LinkField;
  GeneralLink?: LinkField;
  generalLink?: LinkField;

  // Potential variations of item list names in Sitecore templates
  'Integration Items'?: IntegrationCardItem[] | { value?: IntegrationCardItem[] };
  Integrations?: IntegrationCardItem[] | { value?: IntegrationCardItem[] };
  'Integration Cards'?: IntegrationCardItem[] | { value?: IntegrationCardItem[] };
  Items?: IntegrationCardItem[] | { value?: IntegrationCardItem[] };
  items?: IntegrationCardItem[] | { value?: IntegrationCardItem[] };
  Cards?: IntegrationCardItem[] | { value?: IntegrationCardItem[] };
  cards?: IntegrationCardItem[] | { value?: IntegrationCardItem[] };
  children?: IntegrationCardItem[];
  [key: string]: any;
}

export interface IntegrationsProps extends Partial<ComponentProps> {
  fields?: IntegrationsFields | any;
  rendering?: any;
  params?: any;
}

// ============================================================================
// HELPER FUNCTIONS FOR ROBUST FIELD RESOLUTION
// ============================================================================

/**
 * Searches an object (or item.fields) for the first matching key (case-insensitive).
 */
const resolveField = (obj: any, ...keys: string[]): any => {
  if (!obj) return undefined;

  // Handle array of field objects (e.g. GraphQL fields: [{ name: 'Title', jsonValue: ... }])
  if (Array.isArray(obj)) {
    for (const key of keys) {
      const found = obj.find(
        (f: any) =>
          f?.name?.toLowerCase() === key.toLowerCase() ||
          f?.displayName?.toLowerCase() === key.toLowerCase()
      );
      if (found) return found.jsonValue ?? found.value ?? found;
    }
  }

  // Handle object keyed by field names
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) {
      const val = obj[key];
      return val?.jsonValue ?? val;
    }
    const matchKey = Object.keys(obj).find((k) => k.toLowerCase() === key.toLowerCase());
    if (matchKey && obj[matchKey] !== undefined && obj[matchKey] !== null) {
      const val = obj[matchKey];
      return val?.jsonValue ?? val;
    }
  }

  return undefined;
};

/**
 * Extracts a normalized string representation from any field format.
 */
const extractString = (field: any): string => {
  if (field === null || field === undefined) return '';
  if (typeof field === 'string') return field.trim();
  if (typeof field?.value === 'string') return field.value.trim();
  if (typeof field?.jsonValue?.value === 'string') return field.jsonValue.value.trim();
  if (typeof field?.text === 'string') return field.text.trim();
  return '';
};

/**
 * Determines whether a field contains rich HTML content.
 */
const isRichText = (field: any): boolean => {
  const str = extractString(field);
  return /<[a-z][\s\S]*>/i.test(str);
};

/**
 * Normalizes field into a Sitecore-compatible TextField object.
 */
const toTextField = (field: any): { value?: string; metadata?: any } | undefined => {
  if (!field) return undefined;
  if (field.value !== undefined || field.metadata !== undefined) return field;
  if (field.jsonValue) return field.jsonValue;
  if (typeof field === 'string') return { value: field };
  return undefined;
};

/**
 * Normalizes field into a Sitecore-compatible ImageField object.
 */
const toImageField = (field: any): ImageField | undefined => {
  if (!field) return undefined;
  if (field.value !== undefined || field.metadata !== undefined || field.src !== undefined) {
    return field;
  }
  if (field.jsonValue) return field.jsonValue;
  if (typeof field === 'string' && field.trim().length > 0) {
    return { value: { src: field, alt: 'Integration Logo' } };
  }
  return undefined;
};

/**
 * Normalizes field into a Sitecore-compatible LinkField object.
 */
const toLinkField = (field: any): LinkField | undefined => {
  if (!field) return undefined;
  if (field.value !== undefined || (field as any).metadata !== undefined || field.href !== undefined) {
    return field;
  }
  if (field.jsonValue) return field.jsonValue;
  if (typeof field === 'string' && field.trim().length > 0) {
    return { value: { href: field, text: '' } };
  }
  return undefined;
};

/**
 * Checks if a link field has a valid URL, text, or authoring metadata.
 */
const hasLinkValue = (field?: LinkField): boolean => {
  if (!field) return false;
  const val = field.value || (field as any);
  return Boolean(val?.href || val?.text || (field as any)?.metadata);
};

/**
 * Renders an authored logo image with non-distorting container containment and graceful fallback.
 */
const IntegrationLogo = ({
  logoField,
  title,
}: {
  logoField?: any;
  title?: string;
}): JSX.Element => {
  const imgField = toImageField(logoField);
  const src = imgField?.value?.src || (imgField as any)?.src || '';
  const alt = imgField?.value?.alt || title || 'Integration logo';

  if (src || (imgField as any)?.metadata) {
    return (
      <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-[14px] border border-slate-200/90 bg-white p-2 shadow-2xs transition-transform duration-200 group-hover:scale-105">
        <JssImage
          field={imgField}
          alt={alt}
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  // Graceful fallback icon if no logo is uploaded
  const initial = title ? title.trim().charAt(0).toUpperCase() : '★';
  return (
    <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-[14px] border border-slate-200/90 bg-slate-50 text-base font-bold text-slate-600 shadow-2xs transition-transform duration-200 group-hover:scale-105">
      {initial}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const Integrations = (props: IntegrationsProps): JSX.Element | null => {
  const { page } = useSitecore();
  const isEditing = Boolean(page?.mode?.isEditing);

  // 1. Resolve root fields
  const fields = props.fields || props.rendering?.fields || {};
  const datasource = fields?.data?.datasource || fields;

  const headerLabel = resolveField(datasource, 'Label', 'label', 'Label Text', 'Badge Label', 'Tag Label', 'Eyebrow');
  const headerTitle = resolveField(datasource, 'Title', 'title', 'Main Title', 'Heading', 'Heading Title');
  const headerDescription = resolveField(datasource, 'Description', 'description', 'Intro', 'Sub Heading', 'SubTitle');
  const footText = resolveField(datasource, 'FootText', 'footText', 'Foot Text', 'foot_text', 'Footnote', 'footnote');
  const generalLink = resolveField(datasource, 'General Link', 'generalLink', 'GeneralLink', 'general_link', 'CTA Link', 'CTA');
  const generalLinkField = toLinkField(generalLink);

  // 2. Resolve items collection dynamically from all potential Sitecore data keys
  const items: IntegrationCardItem[] = useMemo(() => {
    const rawCards =
      resolveField(
        datasource,
        'Integration Items',
        'Integrations',
        'Integration Cards',
        'Items',
        'items',
        'Cards',
        'cards',
        'children'
      ) ||
      datasource?.children?.results ||
      props.rendering?.fields?.items ||
      [];

    if (Array.isArray(rawCards)) return rawCards;
    if (Array.isArray(rawCards?.value)) return rawCards.value;
    if (Array.isArray(rawCards?.targetItems)) return rawCards.targetItems;
    if (Array.isArray(rawCards?.results)) return rawCards.results;
    return [];
  }, [datasource, props.rendering?.fields?.items]);

  // 3. Extract unique categories from items dynamically
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      const itemFields = item.fields || item;
      const catField = resolveField(itemFields, 'Category', 'category', 'Category Name', 'categoryName');
      const catStr = extractString(catField);
      if (catStr) {
        set.add(catStr);
      }
    });
    return Array.from(set);
  }, [items]);

  // 4. Filtering and Search state
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filter items based on active category and search query
  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      const itemFields = item.fields || item;

      // 1. Category filter
      if (activeCategory !== 'All') {
        const catField = resolveField(itemFields, 'Category', 'category', 'Category Name', 'categoryName');
        const catStr = extractString(catField);
        if (catStr.toLowerCase() !== activeCategory.toLowerCase()) {
          return false;
        }
      }

      // 2. Search query filter
      if (query) {
        const titleField = resolveField(itemFields, 'Title', 'title', 'Card Title', 'Platform Name', 'Name');
        const descField = resolveField(itemFields, 'Description', 'description', 'Card Description', 'Card description');
        const catField = resolveField(itemFields, 'Category', 'category', 'Category Name', 'categoryName');
        const labelField = resolveField(itemFields, 'Label', 'label', 'Card Label', 'Status', 'Status Label');

        const title = extractString(titleField).toLowerCase();
        const desc = extractString(descField).toLowerCase();
        const cat = extractString(catField).toLowerCase();
        const label = extractString(labelField).toLowerCase();

        const matches =
          title.includes(query) ||
          desc.includes(query) ||
          cat.includes(query) ||
          label.includes(query);

        if (!matches) return false;
      }

      return true;
    });
  }, [items, activeCategory, searchQuery]);

  const hasHeaderContent =
    Boolean(extractString(headerLabel)) ||
    Boolean(extractString(headerTitle)) ||
    Boolean(extractString(headerDescription)) ||
    isEditing;

  return (
    <section
      className="relative w-full overflow-hidden bg-[#f8fafc] py-16 md:py-24 font-sans text-slate-800"
      data-component="integrations"
    >
      {/* Subtle top light blue gradient atmosphere matching design aesthetic */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-blue-50/70 via-sky-50/20 to-transparent"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ================================================================= */}
        {/* 1. COMPONENT HEADER (Centered)                                    */}
        {/* ================================================================= */}
        {hasHeaderContent && (
          <div className="mx-auto mb-10 flex max-w-3xl flex-col items-center text-center md:mb-12">
            {/* Header Badge / Pill */}
            {(extractString(headerLabel) || isEditing) && (
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-200/90 bg-sky-50/90 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-sky-600 shadow-[0_1px_2px_rgba(2,132,199,0.06)] md:text-[13px]">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500"
                  aria-hidden="true"
                />
                <Text field={toTextField(headerLabel)} />
              </div>
            )}

            {/* Main Title */}
            {(extractString(headerTitle) || isEditing) && (
              <h2 className="mb-3.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-[32px] md:leading-[38px]">
                <Text field={toTextField(headerTitle)} />
              </h2>
            )}

            {/* Description */}
            {(extractString(headerDescription) || isEditing) && (
              <div className="mx-auto max-w-2xl text-center text-sm leading-relaxed text-slate-600 sm:text-base">
                {isRichText(headerDescription) ? (
                  <RichText field={toTextField(headerDescription)} />
                ) : (
                  <Text field={toTextField(headerDescription)} tag="p" />
                )}
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* Page Builder Authoring Guidance Banner (Editing Mode Only)       */}
        {/* ================================================================= */}
        {isEditing && (
          <div className="mb-8 mx-auto max-w-xl rounded-xl border border-sky-200 bg-sky-50/90 px-4 py-2.5 text-center text-xs text-sky-800">
            <span className="font-semibold">Page Builder Mode:</span> You can edit each card&apos;s <strong>Category</strong> directly on the cards below. It is hidden on the production site and used to populate the category filters.
          </div>
        )}

        {/* ================================================================= */}
        {/* 2. SEARCH & FILTER SECTION (Matching Screenshot)                  */}
        {/* ================================================================= */}
        <div className="mb-10 flex flex-wrap items-center justify-center gap-3 md:mb-12">
          {/* Search Input Bar */}
          <div className="relative flex items-center">
            <span className="pointer-events-none absolute left-4 text-slate-400">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search integrations..."
              className="h-11 w-64 rounded-full border border-slate-200/90 bg-white pl-10 pr-9 text-xs text-slate-800 placeholder-slate-400 shadow-2xs outline-none transition-all duration-200 focus:border-[#30A3FF] focus:ring-2 focus:ring-[#30A3FF]/20 sm:w-80 md:w-96 sm:text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* 'All' button */}
          <button
            type="button"
            onClick={() => setActiveCategory('All')}
            className={`h-11 cursor-pointer rounded-full border px-5 text-xs font-semibold transition-all duration-200 sm:text-sm ${
              activeCategory === 'All'
                ? 'border-[#30A3FF] bg-[#30A3FF] text-white shadow-sm shadow-[#30A3FF]/25'
                : 'border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            All
          </button>

          {/* Category Filter Buttons */}
          {categories.map((category) => {
            const isActive = activeCategory.toLowerCase() === category.toLowerCase();
            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`h-11 cursor-pointer rounded-full border px-5 text-xs font-semibold transition-all duration-200 sm:text-sm ${
                  isActive
                    ? 'border-[#30A3FF] bg-[#30A3FF] text-white shadow-sm shadow-[#30A3FF]/25'
                    : 'border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* ================================================================= */}
        {/* 3. INTEGRATION CARD GRID                                          */}
        {/* ================================================================= */}
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:gap-7 md:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item, index) => {
              const itemFields = item.fields || item;

              const cardLabel = resolveField(itemFields, 'Label', 'label', 'Card Label', 'Status', 'Status Label');
              const cardTitle = resolveField(itemFields, 'Title', 'title', 'Card Title', 'Platform Name', 'Name');
              const cardLogo = resolveField(itemFields, 'Logo', 'logo', 'Card Logo', 'Logo Image', 'Image', 'Icon');
              const cardDesc = resolveField(itemFields, 'Description', 'description', 'Card Description', 'Card description');
              const cardCategory = resolveField(itemFields, 'Category', 'category', 'Category Name', 'categoryName');

              const titleString = extractString(cardTitle);

              return (
                <div
                  key={item.id || item.name || `integration-${index}`}
                  className="group relative flex min-h-[175px] flex-col justify-between rounded-[20px] border border-slate-200/80 bg-white p-6 shadow-xs transition-all duration-200 hover:border-blue-300/80 hover:shadow-md"
                >
                  <div>
                    {/* Top Row: Logo (Top-Left) & Status Badge (Top-Right) */}
                    <div className="mb-4 flex items-center justify-between gap-3">
                      {/* Logo Container */}
                      <IntegrationLogo logoField={cardLogo} title={titleString} />

                      {/* Status Label (Green Pill) */}
                      {(extractString(cardLabel) || isEditing) && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 shadow-2xs">
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
                            aria-hidden="true"
                          />
                          <Text field={toTextField(cardLabel)} />
                        </span>
                      )}
                    </div>

                    {/* Card Title */}
                    {(extractString(cardTitle) || isEditing) && (
                      <h3 className="mb-2 text-[15px] font-bold tracking-tight text-slate-900 sm:text-[16px] leading-snug">
                        <Text field={toTextField(cardTitle)} />
                      </h3>
                    )}

                    {/* Card Description */}
                    {(extractString(cardDesc) || isEditing) && (
                      <div className="text-[13px] leading-relaxed text-slate-600 sm:text-[14px]">
                        {isRichText(cardDesc) ? (
                          <RichText field={toTextField(cardDesc)} />
                        ) : (
                          <Text field={toTextField(cardDesc)} tag="p" />
                        )}
                      </div>
                    )}

                    {/* Category field - Editable in Page Builder only, hidden on production side */}
                    {isEditing && (
                      <div className="mt-4 pt-3 border-t border-dashed border-sky-200/90">
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-700">
                            <svg className="h-3 w-3 text-sky-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                            </svg>
                            Category (Page Builder):
                          </span>
                          <span className="text-[9px] font-medium text-slate-400">Hidden in live view</span>
                        </div>
                        <div className="inline-flex min-w-[120px] items-center rounded-lg border border-sky-200 bg-sky-50/80 px-2.5 py-1 text-xs font-semibold text-sky-900">
                          <Text field={toTextField(cardCategory) || (cardCategory ? cardCategory : { value: '' })} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : searchQuery ? (
          <div className="mx-auto max-w-md rounded-2xl border border-slate-200/90 bg-white p-8 text-center shadow-xs">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-800">No integrations found</p>
            <p className="mt-1 text-xs text-slate-500">
              No integrations match &ldquo;{searchQuery}&rdquo;
              {activeCategory !== 'All' ? ` in ${activeCategory}` : ''}.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('All');
              }}
              className="mt-4 inline-flex cursor-pointer items-center justify-center rounded-full bg-[#30A3FF] px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-600"
            >
              Clear filters
            </button>
          </div>
        ) : (
          /* Empty or Authoring Guidance State */
          isEditing && (
            <div className="rounded-2xl border border-dashed border-sky-300 bg-sky-50/50 p-8 text-center text-sm text-sky-800">
              <p className="font-semibold">Authoring Mode: Integrations Grid</p>
              <p className="mt-1 text-sky-700">
                No integration items have been added to the datasource yet. Add items under your Integrations datasource to display cards.
              </p>
            </div>
          )
        )}

        {/* ================================================================= */}
        {/* 4. FOOTER / BOTTOM CTA SECTION                                    */}
        {/* ================================================================= */}
        {(extractString(footText) || hasLinkValue(generalLinkField) || isEditing) && (
          <div className="mt-16 flex flex-col items-center text-center md:mt-24">
            {/* Thin horizontal divider above the FootText */}
            <div
              className="mb-8 w-full border-t border-slate-200/80 md:mb-10"
              aria-hidden="true"
            />

            {/* FootText */}
            {(extractString(footText) || isEditing) && (
              <div className="mb-6 max-w-4xl px-4 text-center text-xs font-normal leading-relaxed text-slate-500 sm:text-sm md:whitespace-nowrap">
                {isRichText(footText) ? (
                  <RichText field={toTextField(footText)} />
                ) : (
                  <Text field={toTextField(footText)} tag="p" />
                )}
              </div>
            )}

            {/* General Link (Centered CTA Button) */}
            {(hasLinkValue(generalLinkField) || isEditing) && (
              <div className="flex justify-center">
                <JssLink
                  field={generalLinkField as any}
                  className="inline-flex cursor-pointer items-center justify-center rounded-full bg-[#30A3FF] px-7 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition-all duration-200 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/35 active:scale-98 sm:px-8 sm:py-3.5 sm:text-base"
                >
                  {!generalLinkField?.value?.text && isEditing ? (
                    <span>[Click to configure General Link]</span>
                  ) : undefined}
                </JssLink>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export const Default = Integrations;
export default Integrations;
