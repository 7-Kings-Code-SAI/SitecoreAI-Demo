'use client';

import type React from 'react';
import { useRouter } from 'next/router';
import { Text as SitecoreText, useSitecore } from '@sitecore-content-sdk/nextjs';
import { LinkWW } from 'src/lib/ww/LinkWW';
import { ChevronRightIcon } from 'src/lib/ww/icons';
import {
  normalizeHeaderGroupWW,
  type NormalizedHeaderGroupWW,
} from 'src/lib/ww/header-ww-data';
import {
  cn,
  isUrlActiveWW,
  normalizeLinkFieldWW,
  resolveLinkHrefWW,
  useLocaleWW,
} from 'src/lib/ww/utils';
import type { HeaderMenuGroupWWProps } from './HeaderMenuGroupWW.props';

export interface HeaderMenuGroupViewWWProps {
  group: NormalizedHeaderGroupWW;
  locale: string;
  asPath?: string;
  isPageEditing?: boolean;
  onNavigate?: () => void;
}

export const HeaderMenuGroupViewWW: React.FC<HeaderMenuGroupViewWWProps> = ({
  group,
  locale,
  asPath,
  isPageEditing = false,
  onNavigate,
}) => {
  const categoryLink = normalizeLinkFieldWW(group.link, locale);
  const categoryHref = resolveLinkHrefWW(categoryLink);

  if (!group.title && group.links.length === 0 && !isPageEditing) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3" data-component="HeaderMenuGroupWW">
      {(group.title || (isPageEditing && (group.titleField || categoryLink))) && (
        <div className="mb-2">
          {(categoryHref || (isPageEditing && categoryLink)) ? (
            <LinkWW
              field={categoryLink}
              className="inline-flex items-center gap-1.5 text-base font-semibold tracking-wide no-underline transition-colors duration-200 hover:text-[#eb0045]"
              onClick={onNavigate}
            >
              {isPageEditing && group.titleField ? (
                <SitecoreText field={group.titleField} />
              ) : (
                group.title
              )}
              <ChevronRightIcon size={16} strokeWidth={2.5} />
            </LinkWW>
          ) : (
            <h4 className="inline-flex items-center gap-1.5 text-base font-bold tracking-wide">
              {isPageEditing && group.titleField ? (
                <SitecoreText field={group.titleField} />
              ) : (
                group.title
              )}
              <ChevronRightIcon size={16} strokeWidth={2.5} />
            </h4>
          )}
        </div>
      )}

      {group.links.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 lg:grid-cols-5 lg:gap-x-7">
          {group.links.map((item, childIndex) => {
            const itemLink = normalizeLinkFieldWW(item.link, locale);
            const itemHref = resolveLinkHrefWW(itemLink);

            if (!item.title && !itemHref && !isPageEditing) return null;

            return itemHref || (isPageEditing && itemLink) ? (
              <LinkWW
                key={item.id || childIndex}
                field={itemLink}
                className={cn(
                  'block text-[16px] leading-[16px] font-normal break-words no-underline antialiased transition-colors duration-200 hover:text-[#eb0045]',
                  itemHref && isUrlActiveWW(itemHref, asPath, locale)
                    ? 'text-[#eb0045]'
                    : 'text-black',
                )}
                onClick={onNavigate}
              >
                {item.title || (isPageEditing && item.textField ? <SitecoreText field={item.textField} /> : undefined)}
              </LinkWW>
            ) : (
              <span key={item.id || childIndex} className="leading-[16px]">
                {item.title}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const Default: React.FC<HeaderMenuGroupWWProps> = (props) => {
  const { fields, group, rendering } = props;
  const { page } = useSitecore();
  const router = useRouter();
  const locale = useLocaleWW();
  const isPageEditing = Boolean(page?.mode?.isEditing);

  const normalizedGroup = group ?? normalizeHeaderGroupWW(fields, rendering?.uid);

  if (!normalizedGroup.title && normalizedGroup.links.length === 0) {
    if (!isPageEditing) return null;

    return (
      <div className="rounded border border-dashed border-neutral-300 p-3 text-xs text-neutral-500">
        {rendering?.componentName ?? 'HeaderMenuGroupWW'} requires a datasource item assigned.
      </div>
    );
  }

  return (
    <HeaderMenuGroupViewWW
      group={normalizedGroup}
      locale={locale}
      asPath={router?.asPath}
      isPageEditing={isPageEditing}
    />
  );
};

export default Default;
