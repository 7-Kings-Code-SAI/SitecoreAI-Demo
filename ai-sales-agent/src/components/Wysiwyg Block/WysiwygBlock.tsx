'use client';

import { RichText, useSitecore } from '@sitecore-content-sdk/nextjs';
import { type FC, type JSX } from 'react';

import type { WysiwygBlockProps, WysiwygBlockFields } from './wysiwyg-block.props';

export type { WysiwygBlockFields };



const cn = (...classes: (string | boolean | undefined | null)[]): string =>
  classes.filter(Boolean).join(' ');

// Extract and merge all field dictionaries from props, rendering, or GraphQL datasource
const extractFields = (props: any): Record<string, any> => {
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
    if (Array.isArray(src)) {
      for (const item of src) {
        if (item?.name) merged[item.name] = item;
      }
    } else if (typeof src === 'object') {
      for (const [key, value] of Object.entries(src)) {
        if (value !== undefined && value !== null) {
          if (!merged[key] || (value as any)?.metadata) {
            merged[key] = value;
          }
        }
      }
    }
  }
  return merged;
};

// Find rich text content field across common Sitecore field names
const findRichTextField = (fields: Record<string, any>): any => {
  if (!fields) return undefined;

  const candidates = [
    'content', 'text', 'richtext', 'rich text', 'body', 
    'description', 'html', 'wysiwyg', 'maincontent'
  ];

  for (const [k, v] of Object.entries(fields)) {
    if (candidates.includes(k.toLowerCase()) && v != null) {
      return v;
    }
  }

  const ignore = new Set([
    'variant', 'styles', 'renderingidentifier', 'data', 'datasource', 'item',
  ]);

  for (const [k, v] of Object.entries(fields)) {
    if (ignore.has(k.toLowerCase())) continue;
    if (v && typeof v === 'object' && ('value' in v || 'metadata' in v || 'jsonValue' in v)) {
      return v;
    }
  }

  return undefined;
};

// Normalize Sitecore field while preserving metadata & editable for Page Builder
const normalizeField = (raw: any): any => {
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw === 'string') return { value: raw };
  if (typeof raw !== 'object') return undefined;

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

export const WysiwygBlock: FC<WysiwygBlockProps> = (
  props
): JSX.Element | null => {
  const { className, params } = props;
  const { page } = useSitecore();
  const isPageEditing = Boolean(page?.mode?.isEditing);

  // Extract background color from params.Styles (e.g., "#f9e244")
  const backgroundColor = params?.Styles?.trim() || params?.styles?.trim() || undefined;

  // Extract all fields and resolve rich text content
  const fields = extractFields(props);
  const contentField = normalizeField(findRichTextField(fields));



  if (!contentField && !isPageEditing) {
    return null;
  }

  return (
    <section
      className={cn(
        className,
        'relative w-full font-sans transition-colors duration-200 px-6',
        backgroundColor
          ? 'mx-auto w-[calc(100%-20px)] mb-12 max-w-7xl p-4 rounded-xl'
          : 'pt-3 pb-8'
      )}
      data-component="WysiwygBlock"

      style={backgroundColor ? { backgroundColor } : undefined}
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="rte-content text-black leading-relaxed [&_h4]:m-0! [&_h4]:text-[18px]! lg:[&_h4]:text-[22px]!">
          {contentField ? (
            typeof contentField === 'string' ? (
              <div dangerouslySetInnerHTML={{ __html: contentField }} />
            ) : (
              <RichText field={contentField} />
            )
          ) : isPageEditing ? (
            <div className="rounded border border-dashed border-blue-300 bg-blue-50/50 p-6 text-center text-sm text-blue-600">
              [Rich Text field not assigned]
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export const Default: FC<WysiwygBlockProps> = (props) => (
  <WysiwygBlock {...props} />
);

export default Default;
