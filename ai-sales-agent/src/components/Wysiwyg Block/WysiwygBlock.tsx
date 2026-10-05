'use client';

import React, { FC, JSX } from 'react';
import {
  Link as JssLink,
  RichText,
  useSitecore,
} from '@sitecore-content-sdk/nextjs';
import type { WysiwygBlockProps, WysiwygBlockFields } from './wysiwyg-block.props';
export type { WysiwygBlockFields };

export const WYSIWYG_BLOCK_DESIGN_VARIANTS = {
  Default: 'Default',
  BrandBackground: 'Brand Background',
} as const;

export type WysiwygBlockVariant =
  (typeof WYSIWYG_BLOCK_DESIGN_VARIANTS)[keyof typeof WYSIWYG_BLOCK_DESIGN_VARIANTS];

// Extract and merge all field dictionaries from props and rendering
const extractAllFields = (props: any): Record<string, any> => {
  const merged: Record<string, any> = {};

  const sources = [
    props?.rendering?.fields?.data?.datasource,
    props?.rendering?.fields?.data?.item,
    props?.fields?.data?.datasource,
    props?.fields?.data?.item,
    props?.rendering?.data?.datasource,
    props?.rendering?.fields,
    props?.fields,
  ];

  for (const src of sources) {
    if (!src) continue;

    // Handle array of fields (e.g. [{ name: 'Content', jsonValue: ... }])
    if (Array.isArray(src)) {
      for (const item of src) {
        if (item?.name) {
          merged[item.name] = item;
        }
      }
    } else if (typeof src === 'object') {
      for (const [key, value] of Object.entries(src)) {
        if (value !== undefined && value !== null) {
          // If we already have a value, prefer one that has metadata
          if (!merged[key] || (value as any)?.metadata) {
            merged[key] = value;
          }
        }
      }
    }
  }

  return merged;
};

// Find the Rich Text content field across all possible naming conventions
const findRichTextField = (fields: Record<string, any>): any => {
  if (!fields || typeof fields !== 'object') return undefined;

  const candidates = [
    'content',
    'Content',
    'RichText',
    'richText',
    'Rich Text',
    'rich_text',
    'Text',
    'text',
    'Body',
    'body',
    'Description',
    'description',
    'HTML',
    'html',
    'Wysiwyg',
    'wysiwyg',
    'Copy',
    'copy',
    'MainContent',
    'mainContent',
    'Main Content',
  ];

  // 1. Direct candidate matching (exact and case-insensitive)
  for (const key of candidates) {
    if (fields[key] !== undefined && fields[key] !== null) {
      return fields[key];
    }
    const match = Object.keys(fields).find((k) => k.toLowerCase() === key.toLowerCase());
    if (match && fields[match] !== undefined && fields[match] !== null) {
      return fields[match];
    }
  }

  // 2. Fallback: inspect remaining fields for rich text / metadata structures
  const nonContentKeys = new Set([
    'anchorid',
    'anchor_id',
    'ctalink',
    'cta_link',
    'openinbrowser',
    'download',
    'isshowmodel',
    'variant',
    'styles',
    'renderingidentifier',
    'data',
    'datasource',
    'item',
  ]);

  for (const [k, v] of Object.entries(fields)) {
    if (nonContentKeys.has(k.toLowerCase())) continue;
    if (v && typeof v === 'object') {
      if ('value' in v || 'metadata' in v || 'jsonValue' in v) {
        return v;
      }
    }
  }

  return undefined;
};

// Find the CTA link field
const findLinkField = (fields: Record<string, any>): any => {
  if (!fields || typeof fields !== 'object') return undefined;

  const candidates = [
    'CTALink',
    'ctaLink',
    'CTA Link',
    'cta_link',
    'Link',
    'link',
    'ButtonLink',
    'buttonLink',
    'Button Link',
  ];

  for (const key of candidates) {
    if (fields[key] !== undefined && fields[key] !== null) {
      return fields[key];
    }
    const match = Object.keys(fields).find((k) => k.toLowerCase() === key.toLowerCase());
    if (match && fields[match] !== undefined && fields[match] !== null) {
      return fields[match];
    }
  }

  return undefined;
};

// Normalize Sitecore field object while strictly preserving metadata & editable
const normalizeFieldWithMetadata = (raw: any): any => {
  if (raw === null || raw === undefined) return undefined;

  if (typeof raw === 'string') {
    return { value: raw };
  }

  if (typeof raw !== 'object') {
    return undefined;
  }

  // If raw wraps jsonValue (common in GraphQL / Metadata Edit Mode),
  // unwrap jsonValue but MERGE the parent's metadata and editable back in!
  if (raw.jsonValue !== undefined) {
    const inner =
      typeof raw.jsonValue === 'object' && raw.jsonValue !== null
        ? raw.jsonValue
        : { value: raw.jsonValue };

    return {
      ...inner,
      metadata: raw.metadata ?? inner.metadata,
      editable: raw.editable ?? inner.editable,
    };
  }

  return raw;
};

// Check if a URL points to a downloadable file
const isFileMediaUrl = (url: string): boolean => {
  if (!url) return false;
  const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase();
  return /\.(pdf|docx?|xlsx?|pptx?|zip|rar|csv|txt)$/i.test(cleanUrl);
};

// Extract filename from a URL
const filenameFromMediaUrl = (url: string): string => {
  if (!url) return '';
  try {
    const pathname = url.split('?')[0].split('#')[0];
    const segments = pathname.split('/');
    return decodeURIComponent(segments[segments.length - 1] || '');
  } catch {
    return '';
  }
};

// Trigger browser download safely
const triggerDownload = (downloadUrl: string, filename: string): void => {
  if (typeof document === 'undefined') return;
  const hidden = document.createElement('a');
  hidden.href = downloadUrl;
  hidden.setAttribute('download', filename);
  hidden.style.display = 'none';
  document.body.appendChild(hidden);
  try {
    hidden.click();
  } finally {
    document.body.removeChild(hidden);
  }
};

export const WysiwygBlock: FC<WysiwygBlockProps & { variant?: string }> = (props): JSX.Element | null => {
  const { className, params, variant = WYSIWYG_BLOCK_DESIGN_VARIANTS.Default } = props;
  const { page } = useSitecore();

  // Extract all fields from every possible location
  const allFields = extractAllFields(props);

  // Normalize rich text content and link fields
  const contentField = normalizeFieldWithMetadata(findRichTextField(allFields));
  const ctaLinkField = normalizeFieldWithMetadata(findLinkField(allFields));

  // Determine if in Page Builder editing mode
  const isPageEditing = Boolean(
    page?.mode?.isEditing ||
    contentField?.metadata ||
    ctaLinkField?.metadata ||
    params?.isEditing
  );

  // Background color from params.Styles (e.g., "#f9e244") or params.styles
  const rawStyles = params?.Styles?.trim() || params?.styles?.trim() || '';
  const isHexOrRgbColor = /^#(?:[0-9a-fA-F]{3}){1,2}$|^rgb/i.test(rawStyles);
  const backgroundColor = isHexOrRgbColor ? rawStyles : undefined;

  // Detect active variant
  const activeVariant =
    variant ||
    params?.Variant ||
    params?.variant ||
    params?.renderingVariant ||
    WYSIWYG_BLOCK_DESIGN_VARIANTS.Default;

  const isBrand =
    activeVariant === WYSIWYG_BLOCK_DESIGN_VARIANTS.BrandBackground ||
    String(activeVariant).toLowerCase() === 'brand background' ||
    String(activeVariant).toLowerCase() === 'brandbackground';

  // Component-level flags
  const isOpenInBrowser = Boolean(
    allFields?.OpenInBrowser?.value === true ||
    allFields?.openInBrowser?.value === true
  );
  const isDownload = Boolean(
    allFields?.Download?.value === true ||
    allFields?.download?.value === true
  );

  // CTA link values
  const ctaLinkHref =
    ctaLinkField?.value?.href ||
    ctaLinkField?.value?.url ||
    (ctaLinkField as any)?.href ||
    '';

  const ctaLinkText =
    ctaLinkField?.value?.text ||
    (ctaLinkField as any)?.text ||
    '';

  const hasCtaLink = Boolean(
    ctaLinkHref ||
    ctaLinkText ||
    ctaLinkField?.metadata ||
    ctaLinkField?.editable
  );

  // Anchor ID for on-page navigation
  const anchorId =
    allFields?.anchorId?.value ||
    allFields?.AnchorId?.value ||
    (typeof allFields?.anchorId === 'string' ? allFields?.anchorId : '') ||
    (typeof allFields?.AnchorId === 'string' ? allFields?.AnchorId : '') ||
    '';

  // Check if content exists
  const hasContent = Boolean(
    contentField?.value ||
    (contentField as any)?.text ||
    contentField?.metadata ||
    contentField?.editable
  );

  // If not in editing mode and no content, don't render empty section
  if (!hasContent && !isPageEditing && !hasCtaLink) {
    return null;
  }

  const handleRichTextClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const anchor = (e.target as HTMLElement).closest('a');
    if (!anchor) return;

    const href = anchor.getAttribute('href')?.trim() || '';
    if (!href) return;

    // Handle media file links within Rich Text
    if (isFileMediaUrl(href)) {
      const linkText = anchor.innerText || anchor.textContent || 'file';
      if (isOpenInBrowser) {
        e.preventDefault();
        window.open(href, '_blank', 'noopener,noreferrer');
        if (isDownload) {
          const urlFilename = filenameFromMediaUrl(href) || linkText || 'file';
          triggerDownload(href, urlFilename);
        }
        return;
      }
      if (isDownload) {
        e.preventDefault();
        const urlFilename = filenameFromMediaUrl(href) || linkText || 'file';
        triggerDownload(href, urlFilename);
        return;
      }
    }
  };

  const renderCtaLink = () => {
    if (!hasCtaLink || !ctaLinkField) return null;

    const isMedia = isFileMediaUrl(ctaLinkHref);
    const ariaLabel = ctaLinkText || 'Learn More';
    const target = (ctaLinkField as any)?.value?.target || (isMedia && isOpenInBrowser ? '_blank' : '_self');

    const btnClass = isBrand
      ? 'inline-flex items-center justify-center gap-2 rounded-full border border-blue-200 bg-white px-7 py-3.5 text-sm font-semibold text-[#0099FF] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-50/60 hover:shadow-md cursor-pointer no-underline'
      : 'inline-flex items-center justify-center gap-2 rounded-full bg-[#0099FF] px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0088EE] hover:shadow-md cursor-pointer no-underline';

    if (isMedia) {
      if (isOpenInBrowser) {
        const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
          if (isDownload && !e.defaultPrevented) {
            const urlFilename = filenameFromMediaUrl(ctaLinkHref) || ctaLinkText || 'file';
            triggerDownload(ctaLinkHref, urlFilename);
          }
        };
        return (
          <div className="mt-8">
            <a
              href={ctaLinkHref}
              className={btnClass}
              onClick={handleClick}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={ariaLabel}
            >
              <span>{ctaLinkText || 'Download File'}</span>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        );
      }
      if (isDownload) {
        const urlFilename = filenameFromMediaUrl(ctaLinkHref) || ctaLinkText || 'file';
        return (
          <div className="mt-8">
            <button
              type="button"
              className={btnClass}
              onClick={() => triggerDownload(ctaLinkHref, urlFilename)}
              aria-label={ariaLabel}
            >
              <span>{ctaLinkText || 'Download'}</span>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          </div>
        );
      }
    }

    // Standard Sitecore General Link via JssLink
    return (
      <div className="mt-8">
        <JssLink
          field={ctaLinkField as any}
          className={btnClass}
          target={target}
          rel={target === '_blank' ? 'noopener noreferrer' : undefined}
          aria-label={ariaLabel}
        />
      </div>
    );
  };

  // Section background styles and classes
  const sectionBgClass = backgroundColor
    ? ''
    : isBrand
    ? 'bg-gradient-to-b from-[#F0F7FF] via-[#F8FBFF] to-white border-y border-[#E2EDF8]'
    : 'bg-white';

  return (
    <section
      data-component="WysiwygBlock"
      id={anchorId || undefined}
      className={`relative w-full pt-3 font-sans transition-colors duration-200 ${sectionBgClass} ${className || ''}`}
      style={backgroundColor ? { backgroundColor } : undefined}
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-4">
        <div
          onClick={handleRichTextClick}
          className="rte-content text-black leading-relaxed min-h-[50px]
            [&_h1]:text-3xl sm:[&_h1]:text-4xl [&_h1]:font-extrabold [&_h1]:tracking-tight [&_h1]:text-black [&_h1]:mb-6
            [&_h2]:text-2xl sm:[&_h2]:text-3xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-black [&_h2]:mt-9.5! [&_h2:first-of-type]:mt-0! [&_h2]:mb-4
            [&_h3]:text-xl sm:[&_h3]:text-2xl [&_h3]:font-bold [&_h3]:text-black [&_h3]:mt-6 [&_h3]:mb-3
            [&_h4]:m-0! [&_h4]:text-[18px]! lg:[&_h4]:text-[22px]! [&_h4]:font-semibold [&_h4]:text-black
            [&_h5]:text-base sm:[&_h5]:text-lg [&_h5]:font-semibold [&_h5]:text-black [&_h5]:mt-4 [&_h5]:mb-2
            [&_h6]:text-sm sm:[&_h6]:text-base [&_h6]:font-semibold [&_h6]:text-black [&_h6]:mt-3 [&_h6]:mb-2
            [&_p]:text-base sm:[&_p]:text-[17px] [&_p]:leading-relaxed [&_p]:text-black [&_p]:mb-5
            [&_strong]:text-black
            [&_b]:text-black
            [&_a]:text-[#0099FF] [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-[#0088EE]
            [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-6 [&_ul]:text-black
            [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-6 [&_ol]:text-black
            [&_li]:text-black [&_li]:mb-2
            [&_ol_li]:!font-normal [&_ol_li_*]:!font-normal [&_ol_li::marker]:!font-normal
            [&_blockquote]:border-l-4 [&_blockquote]:border-[#0099FF] [&_blockquote]:bg-blue-50/40 [&_blockquote]:rounded-r-lg [&_blockquote]:p-4 sm:[&_blockquote]:p-6 [&_blockquote]:italic [&_blockquote]:text-black [&_blockquote]:my-6
            [&_table]:w-full [&_table]:my-6 [&_table]:border-collapse [&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:p-3 sm:[&_th]:p-4 [&_th]:text-left [&_th]:font-semibold [&_th]:text-black [&_td]:border [&_td]:border-slate-200 [&_td]:p-3 sm:[&_td]:p-4 [&_td]:text-black
            [&_img]:rounded-2xl [&_img]:max-w-full [&_img]:h-auto [&_img]:my-6 [&_img]:shadow-sm"
        >
          {contentField ? (
            <RichText field={contentField} />
          ) : isPageEditing ? (
            <div className="rounded-xl border border-dashed border-blue-300 bg-blue-50/40 p-8 text-center text-sm text-blue-600">
              No Rich Text field found. Please select or create a datasource item for this WysiwygBlock component in Page Builder.
            </div>
          ) : null}
        </div>

        {renderCtaLink()}
      </div>
    </section>
  );
};

export const Default: FC<WysiwygBlockProps> = (props) => (
  <WysiwygBlock {...props} variant={WYSIWYG_BLOCK_DESIGN_VARIANTS.Default} />
);

export const BrandBackground: FC<WysiwygBlockProps> = (props) => (
  <WysiwygBlock {...props} variant={WYSIWYG_BLOCK_DESIGN_VARIANTS.BrandBackground} />
);

export default Default;
