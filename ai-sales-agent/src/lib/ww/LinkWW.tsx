'use client';

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react';
import { Link as SdkLink, useSitecore, type LinkField } from '@sitecore-content-sdk/nextjs';
import { normalizeLinkFieldWW, resolveLinkHrefWW, useLocaleWW } from './utils';

export interface LinkWWProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  field?: LinkField;
  children?: ReactNode;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
}

/**
 * Shared Sitecore link wrapper for WW components.
 * Preserves Content SDK inline editing chromes in Pages and normalizes internal hrefs via AI Demo's locale normalizer.
 */
export function LinkWW({ field, children, className, onClick, target, rel, ...rest }: LinkWWProps) {
  const { page } = useSitecore();
  const locale = useLocaleWW();
  const isEditing = Boolean(page?.mode?.isEditing);

  const normalizedField = normalizeLinkFieldWW(field, locale);
  const href = resolveLinkHrefWW(normalizedField);
  const text = (normalizedField?.value as { text?: string } | undefined)?.text;
  const fieldTarget = (normalizedField?.value as { target?: string } | undefined)?.target;
  const title = (normalizedField?.value as { title?: string } | undefined)?.title;
  const effectiveTarget = target ?? (fieldTarget || undefined);
  const displayContent = children ?? text;

  if (isEditing && normalizedField) {
    return (
      <SdkLink field={normalizedField} className={className} onClick={onClick} {...rest}>
        {children}
      </SdkLink>
    );
  }

  if (!href || href === '#' || href === '/#') {
    return (
      <span className={className} title={title}>
        {displayContent}
      </span>
    );
  }

  const isExternal =
    normalizedField?.value?.linktype === 'external' ||
    href.startsWith('http://') ||
    href.startsWith('https://');
  const computedTarget = effectiveTarget ?? (isExternal ? '_blank' : undefined);
  const computedRel =
    rel ?? (computedTarget === '_blank' ? 'noopener noreferrer' : undefined);

  return (
    <a
      href={href}
      className={className}
      target={computedTarget}
      rel={computedRel}
      title={title}
      onClick={onClick}
      {...rest}
    >
      {displayContent}
    </a>
  );
}

export default LinkWW;
