'use client';

import type React from 'react';
import {
  Image as SitecoreImage,
  Text as SitecoreText,
  useSitecore,
} from '@sitecore-content-sdk/nextjs';
import { LinkWW } from 'src/lib/ww/LinkWW';
import { cn, normalizeLinkFieldWW, resolveLinkHrefWW } from 'src/lib/ww/utils';
import { newsHasContentWW, type NormalizedHeaderNewsWW } from './header-ww-data';

export interface MegaMenuFeaturedNewsWWProps {
  news: NormalizedHeaderNewsWW;
  locale: string;
}

export const MegaMenuFeaturedNewsWW: React.FC<MegaMenuFeaturedNewsWWProps> = ({
  news,
  locale,
}) => {
  const { page } = useSitecore();
  const isEditing = Boolean(page?.mode?.isEditing);

  const imageSrc = news.image?.value?.src?.trim();
  const imageAlt =
    (typeof news.image?.value?.alt === 'string' && news.image.value.alt.trim()) ||
    news.title ||
    '';
  const newsLinkField = normalizeLinkFieldWW(news.link, locale);
  const href = resolveLinkHrefWW(newsLinkField);

  if (!newsHasContentWW(news, locale) && !isEditing) {
    return null;
  }

  const cardClass = cn(
    'relative mx-auto w-full max-w-[500px] overflow-hidden rounded-sm bg-neutral-200 shadow-md transition-shadow',
    'aspect-[500/412]',
    'lg:mx-0 lg:aspect-auto lg:h-[206px] lg:w-[260px] lg:max-w-none lg:shrink-0',
    'group-hover:shadow-lg',
  );

  const cardBody = (
    <div className={cardClass}>
      {isEditing && news.image ? (
        <SitecoreImage
          field={news.image}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      ) : imageSrc ? (
        <img
          src={imageSrc}
          alt={imageAlt}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div
          className="absolute inset-0 bg-gradient-to-br from-neutral-700 to-neutral-900"
          aria-hidden="true"
        />
      )}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent"
        aria-hidden="true"
      />
      <div className="relative z-10 flex h-full flex-col justify-end">
        <div className="relative w-full overflow-hidden px-3 pt-4 pb-2.5">
          <div
            className="pointer-events-none absolute inset-0 z-0 -translate-x-full bg-[#f9e244] transition-transform duration-250 ease-[cubic-bezier(0.33,1,0.68,1)] group-hover:translate-x-0 motion-reduce:duration-0"
            aria-hidden="true"
          />
          <div className="relative z-10 flex flex-col gap-1 text-white transition-colors duration-300 group-hover:text-black">
            {isEditing && news.titleField ? (
              <SitecoreText
                field={news.titleField}
                tag="p"
                className="block min-h-[15px] cursor-pointer text-xs leading-[15px] font-bold hyphens-manual"
                style={{ fontFamily: 'suisse_intlbold, sans-serif', fontWeight: '400' }}
              />
            ) : news.title ? (
              <p
                className="block h-[15px] cursor-pointer text-xs leading-[15px] font-bold hyphens-manual"
                style={{ fontFamily: 'suisse_intlbold, sans-serif', fontWeight: '400' }}
              >
                {news.title}
              </p>
            ) : null}
            {isEditing && news.descriptionField ? (
              <SitecoreText
                field={news.descriptionField}
                tag="p"
                className="line-clamp-2 min-h-[30px] text-xs leading-[15px] font-normal opacity-95 hyphens-manual group-hover:opacity-100"
                style={{ fontFamily: 'suisse_intlregular, sans-serif', fontWeight: '400' }}
              />
            ) : news.description ? (
              <p
                className="line-clamp-2 h-[30px] text-xs leading-[15px] font-normal opacity-95 hyphens-manual group-hover:opacity-100"
                style={{ fontFamily: 'suisse_intlregular, sans-serif', fontWeight: '400' }}
              >
                {news.description}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      {href ? (
        <span
          className="pointer-events-none absolute right-3 bottom-3 z-10 block h-4 w-4"
          aria-hidden="true"
        >
          <img
            src="/assets/icons/up-right-arrow-white-megamenu.svg"
            alt=""
            className="absolute inset-0 h-4 w-4"
            loading="lazy"
          />
          <span className="absolute inset-0 origin-bottom-right scale-0 opacity-0 transition-[transform,opacity] delay-[250ms] duration-200 ease-in-out group-hover:scale-100 group-hover:opacity-100 motion-reduce:delay-0 motion-reduce:duration-0">
            <img
              src="/assets/icons/up-right-arrow-white-megamenu.svg"
              alt=""
              className="absolute inset-0 h-4 w-4 brightness-0 group-hover:[animation:bouncingArrow_1s_ease-in-out_250ms_forwards] motion-reduce:[animation:none]"
              loading="lazy"
            />
          </span>
        </span>
      ) : null}
    </div>
  );

  if ((href || isEditing) && newsLinkField) {
    return (
      <LinkWW
        field={newsLinkField}
        className="group block shrink-0 rounded-sm no-underline outline-none focus-visible:ring-2 focus-visible:ring-[#eb0045]"
      >
        {cardBody}
      </LinkWW>
    );
  }

  return <div className="group block shrink-0">{cardBody}</div>;
};

export default MegaMenuFeaturedNewsWW;
