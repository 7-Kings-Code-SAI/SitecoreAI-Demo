'use client';

import type { LinkField } from '@sitecore-content-sdk/nextjs';
import { useSitecore } from '@sitecore-content-sdk/nextjs';
import { useRouter } from 'next/router';
import { normalizeHref } from 'src/lib/useLinkNormalizer';

export type ClassValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, boolean | null | undefined>
  | ClassValue[];

/** Lightweight conditional className joiner without extra runtime dependencies. */
export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];

  const append = (val: ClassValue) => {
    if (!val && val !== 0) return;
    if (typeof val === 'string' || typeof val === 'number') {
      const str = String(val).trim();
      if (str) classes.push(str);
      return;
    }
    if (Array.isArray(val)) {
      val.forEach(append);
      return;
    }
    if (typeof val === 'object') {
      for (const [key, enabled] of Object.entries(val)) {
        if (enabled && key) classes.push(key);
      }
    }
  };

  inputs.forEach(append);
  return classes.join(' ');
}

/** Resolves the active locale from Sitecore layout route or Next.js router. */
export function useLocaleWW(): string {
  const { page } = useSitecore();
  const router = useRouter();
  return (
    page?.layout?.sitecore?.route?.itemLanguage ||
    page?.locale ||
    (router?.locale && router.locale !== 'default' ? router.locale : null) ||
    'en'
  );
}

/** Formats a raw href with the active locale prefix while ignoring placeholder `#` links. */
export function formatHrefWW(href: string | null | undefined, locale: string): string | undefined {
  if (!href) return undefined;
  const trimmed = href.trim();
  if (!trimmed || trimmed === '#' || trimmed === '/#') return undefined;
  return normalizeHref(trimmed, locale) || trimmed;
}

/** Returns a safe LinkField href string when present. */
export function resolveLinkHrefWW(link?: LinkField | { value?: { href?: string }; href?: string }): string | undefined {
  if (!link || typeof link !== 'object') return undefined;
  const rec = link as { value?: { href?: string; url?: string }; href?: string; url?: string };
  const raw = rec.value?.href ?? rec.href ?? rec.value?.url ?? rec.url;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

/** Clones a Sitecore LinkField with its `value.href` normalized for the current locale. */
export function normalizeLinkFieldWW(
  link: LinkField | undefined,
  locale: string,
): LinkField | undefined {
  if (!link) return undefined;
  const rawHref = resolveLinkHrefWW(link);
  if (!rawHref) return link;

  const isExternal =
    link.value?.linktype === 'external' ||
    rawHref.startsWith('http://') ||
    rawHref.startsWith('https://') ||
    rawHref.startsWith('mailto:') ||
    rawHref.startsWith('tel:');

  if (isExternal) {
    // Same-origin full URLs can still be normalized cleanly by normalizeHref
    const sameOriginNormalized = normalizeHref(rawHref, locale);
    if (!sameOriginNormalized) return link;
    return {
      ...link,
      value: {
        ...link.value,
        href: sameOriginNormalized,
      },
    };
  }

  const normalized = formatHrefWW(rawHref, locale);
  if (!normalized || normalized === rawHref) return link;

  return {
    ...link,
    value: {
      ...link.value,
      href: normalized,
    },
  };
}

/** Strips query, hash, and trailing slashes for active route matching. */
const cleanComparePath = (url: string): string => {
  const withoutQuery = url.split('?')[0].split('#')[0].trim().toLowerCase();
  if (withoutQuery.length > 1) return withoutQuery.replace(/\/+$/, '');
  return withoutQuery;
};

/** Checks whether a candidate href matches the active Next.js router path. */
export function isUrlActiveWW(
  href: string | undefined,
  asPath: string | undefined,
  locale?: string,
): boolean {
  if (!href || !asPath) return false;
  if (
    href.startsWith('mailto:') ||
    href.startsWith('tel:') ||
    href.startsWith('http://') ||
    href.startsWith('https://')
  ) {
    return false;
  }
  const normalizedTarget = cleanComparePath(href);
  const normalizedCurrent = cleanComparePath(asPath);
  if (!normalizedTarget || normalizedTarget === '#') return false;
  if (normalizedTarget === normalizedCurrent) return true;

  if (locale && locale !== 'default') {
    const localePrefix = `/${locale.toLowerCase()}`;
    const targetWithoutLocale = normalizedTarget.startsWith(localePrefix)
      ? normalizedTarget.slice(localePrefix.length) || '/'
      : normalizedTarget;
    const currentWithoutLocale = normalizedCurrent.startsWith(localePrefix)
      ? normalizedCurrent.slice(localePrefix.length) || '/'
      : normalizedCurrent;
    return targetWithoutLocale === currentWithoutLocale;
  }

  return false;
}
