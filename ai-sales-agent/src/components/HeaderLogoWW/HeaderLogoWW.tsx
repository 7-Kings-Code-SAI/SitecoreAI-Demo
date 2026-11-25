'use client';

import type React from 'react';
import {
  Image as SitecoreImage,
  useSitecore,
  type ImageField,
  type LinkField,
} from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'src/lib/component-props';
import { LinkWW } from 'src/lib/ww/LinkWW';
import { formatHrefWW, normalizeLinkFieldWW, useLocaleWW } from 'src/lib/ww/utils';

interface HeaderLogoWWFields {
  Image?: { jsonValue?: ImageField } | ImageField;
  Link?: { jsonValue?: LinkField } | LinkField;
}

export interface HeaderLogoWWProps extends ComponentProps {
  fields?: HeaderLogoWWFields;
  isPageEditing?: boolean;
}

export const Default: React.FC<HeaderLogoWWProps> = (props) => {
  const { fields, rendering } = props;
  const { page } = useSitecore();
  const isEditing = Boolean(page?.mode?.isEditing);
  const locale = useLocaleWW();

  const rawImage = fields?.Image as { jsonValue?: ImageField } | ImageField | undefined;
  const imageField: ImageField | undefined =
    rawImage && typeof rawImage === 'object' && 'jsonValue' in rawImage
      ? rawImage.jsonValue
      : (rawImage as ImageField | undefined);

  const rawLink = fields?.Link as { jsonValue?: LinkField } | LinkField | undefined;
  const linkField: LinkField | undefined =
    rawLink && typeof rawLink === 'object' && 'jsonValue' in rawLink
      ? rawLink.jsonValue
      : (rawLink as LinkField | undefined);

  if (!imageField && !linkField && !isEditing) {
    return (
      <div className="component header-logo-ww">
        <div className="component-content">
          <span className="is-empty-hint text-xs text-neutral-500">
            {rendering?.componentName ?? 'HeaderLogoWW'} requires a datasource item assigned.
          </span>
        </div>
      </div>
    );
  }

  const normalizedCustomLink = normalizeLinkFieldWW(linkField, locale);
  const homepageHref =
    normalizedCustomLink?.value?.href || formatHrefWW('/', locale) || `/${locale}`;

  // In Page Builder the logo is rendered via <Placeholder> (no InHeader param), so treat it as nested to avoid the white box/border/shadow.
  const isNestedInHeader = props.params?.InHeader === '1' || isEditing;
  const isHeaderLogo = !isNestedInHeader;

  const innerContent = (
    <div className={isHeaderLogo ? 'flex items-end' : 'flex h-10 items-center md:h-11 lg:h-12'}>
      {imageField?.value?.src ? (
        <SitecoreImage
          field={imageField}
          className="h-8 w-auto max-w-[336px] md:h-8.5 lg:h-12"
          alt="CWS Workwear"
          width={582}
          height={82}
          loading="lazy"
        />
      ) : (
        <>
          <div className="flex w-16 items-center justify-center bg-[#eb0045] md:w-[68px] lg:w-[72px]">
            <span className="text-lg font-bold tracking-tight text-black italic md:text-xl">
              CWS
            </span>
          </div>
          <div className="flex w-16 items-center justify-center bg-[#f9e244] px-1.5 md:w-[68px] md:px-2 lg:w-[72px]">
            <span className="text-[9px] font-bold tracking-wider text-black uppercase md:text-[10px]">
              WORKWEAR
            </span>
          </div>
        </>
      )}
    </div>
  );

  const resolvedLinkField: LinkField = normalizedCustomLink?.value?.href
    ? normalizedCustomLink
    : ({ value: { href: homepageHref, text: 'CWS Home' } } as LinkField);

  const logoLink = (
    <LinkWW
      field={resolvedLinkField}
      className={`flex no-underline ${isHeaderLogo ? 'items-end' : 'items-center'}`}
      aria-label="CWS Home"
      target="_self"
    >
      {innerContent}
    </LinkWW>
  );

  if (isHeaderLogo) {
    return (
      <div
        className="w-full border-b border-[#ebebeb] bg-white shadow-[0_0_5px_rgba(0,0,0,0.16)] lg:shadow-[0_0_10px_rgba(0,0,0,0.16)]"
        data-component="HeaderLogoWW"
      >
        <div className="mx-auto w-full max-w-[1360px] px-[8px] pt-0 pb-[0.2rem] lg:px-[16px] xl:px-[10px]">
          {logoLink}
        </div>
      </div>
    );
  }

  return <div data-component="HeaderLogoWW">{logoLink}</div>;
};

export default Default;
