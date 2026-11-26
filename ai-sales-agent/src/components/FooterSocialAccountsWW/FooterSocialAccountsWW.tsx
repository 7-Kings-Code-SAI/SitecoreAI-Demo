'use client';

import type { FC } from 'react';
import { Text as SitecoreText, useSitecore, type LinkField } from '@sitecore-content-sdk/nextjs';
import { LinkWW } from 'src/lib/ww/LinkWW';
import { cn, resolveLinkHrefWW } from 'src/lib/ww/utils';
import type { FooterSocialAccountsWWProps } from './FooterSocialAccountsWW.props';

const getSocialIcon = (href: string): { src: string; width: number; height: number } | null => {
  const url = href.toLowerCase();
  if (url.includes('linkedin'))
    return { src: '/assets/icons/footer/linkedin.svg', width: 23.77, height: 23.79 };
  if (url.includes('facebook'))
    return { src: '/assets/icons/footer/facebook.svg', width: 13.24, height: 28.67 };
  if (url.includes('instagram'))
    return { src: '/assets/icons/footer/instagram.svg', width: 26, height: 26 };
  if (url.includes('youtube'))
    return { src: '/assets/icons/footer/youtube.svg', width: 30.98, height: 21.84 };
  if (url.includes('twitter') || url.includes('x.com'))
    return { src: '/assets/icons/social/x-twitter.svg', width: 26, height: 26 };
  return null;
};

type SocialLinkField = LinkField & { jsonValue?: LinkField; href?: string };

type SocialIconField = {
  value?: { src?: string } | string;
  jsonValue?: { value?: { src?: string } | string };
  src?: string;
};

type SocialItem = {
  id?: string;
  name?: string;
  displayName?: string;
  fields?: {
    Link?: SocialLinkField;
    Icon?: SocialIconField;
  };
  link?: SocialLinkField;
  icon?: SocialIconField;
};

type SocialDatasource = {
  Items?: SocialItem[] | { targetItems?: SocialItem[] };
  items?: SocialItem[] | { targetItems?: SocialItem[] };
  DomainLink?: SocialLinkField;
  domainLink?: SocialLinkField;
  DomainLabel?: { value?: string; jsonValue?: { value?: string } };
  domainLabel?: { value?: string; jsonValue?: { value?: string } };
};

const resolveIconPathOrUrl = (candidate: string): string | undefined => {
  const trimmed = candidate.trim();
  if (!trimmed) return undefined;
  if (/^(\/|https?:\/\/|data:)/i.test(trimmed)) return trimmed;
  return getSocialIcon(trimmed)?.src;
};

const readIconSrc = (iconField?: SocialIconField): string | undefined => {
  if (!iconField) return undefined;
  if (typeof iconField.src === 'string') return resolveIconPathOrUrl(iconField.src);
  const val = iconField.jsonValue?.value ?? iconField.value;
  if (typeof val === 'string') return resolveIconPathOrUrl(val);
  if (val && typeof val === 'object' && typeof val.src === 'string') {
    return resolveIconPathOrUrl(val.src);
  }
  return undefined;
};

export const Default: FC<FooterSocialAccountsWWProps> = ({ className, fields }) => {
  const { page } = useSitecore();
  const isPageEditing = Boolean(page?.mode?.isEditing);

  const fieldsRecord = fields as
    | { data?: { datasource?: SocialDatasource }; datasource?: SocialDatasource }
    | undefined;
  const datasource: SocialDatasource | undefined =
    fieldsRecord?.data?.datasource ??
    fieldsRecord?.datasource ??
    (fields as SocialDatasource | undefined);

  const itemsField = datasource?.Items ?? datasource?.items;
  const items: SocialItem[] = Array.isArray(itemsField)
    ? itemsField
    : (itemsField?.targetItems ?? []);

  if (!items || items.length === 0) {
    if (!isPageEditing) {
      return null;
    }
  }

  const domainLinkRaw = datasource?.DomainLink ?? datasource?.domainLink;
  const domainLink = (domainLinkRaw?.jsonValue ?? domainLinkRaw) as LinkField | undefined;
  const domainLabelField = datasource?.DomainLabel ?? datasource?.domainLabel;
  const hasDomainLink = Boolean(resolveLinkHrefWW(domainLink));
  const hasDomainLabel = Boolean(domainLabelField?.value || domainLabelField?.jsonValue?.value);
  const showDomain =
    hasDomainLink || hasDomainLabel || (isPageEditing && Boolean(domainLink || domainLabelField));

  return (
    <div
      data-component="FooterSocialAccountsWW"
      className="flex flex-col items-center gap-0.5 lg:items-start lg:gap-[21px]"
    >
      <div
        className={cn(
          'mb-0 flex h-[29px] w-max items-start justify-center gap-[14px] pb-0 lg:justify-start',
          className,
        )}
      >
        {items.map((item: SocialItem, index: number) => {
          const linkField = item?.fields?.Link ?? item?.link;
          const resolvedLinkField = (linkField?.jsonValue ?? linkField) as LinkField | undefined;
          const href =
            resolveLinkHrefWW(resolvedLinkField) ??
            linkField?.value?.href ??
            linkField?.jsonValue?.value?.href ??
            linkField?.href;

          const iconField = item?.fields?.Icon ?? item?.icon;
          const iconSrc = readIconSrc(iconField);
          const fallbackIcon = href ? getSocialIcon(href) : null;
          const iconPath = iconSrc || fallbackIcon?.src;
          const iconWidth = fallbackIcon?.width ?? 26;
          const iconHeight = fallbackIcon?.height ?? 26;

          if (!resolvedLinkField || !iconPath) {
            return null;
          }

          return (
            <LinkWW
              key={item?.id || index}
              field={resolvedLinkField}
              target="_blank"
              rel="noopener noreferrer"
              className="group shrink-0 cursor-pointer"
              aria-label={item?.name || item?.displayName || 'Social link'}
            >
              <img
                src={iconPath}
                alt={item?.name || item?.displayName || 'Social icon'}
                width={Math.round(iconWidth)}
                height={Math.round(iconHeight)}
                style={{ width: iconWidth, height: iconHeight }}
                className="block max-w-none object-contain transition-[filter] duration-200 group-hover:brightness-0 group-hover:saturate-100 group-hover:[filter:invert(17%)_sepia(99%)_saturate(7426%)_hue-rotate(346deg)_brightness(95%)_contrast(114%)] motion-reduce:transition-none"
              />
            </LinkWW>
          );
        })}
      </div>
      {showDomain && (
        <div className="text-[12px] leading-[24px] text-black lg:text-[18px]">
          {(hasDomainLink || isPageEditing) && domainLink ? (
            <LinkWW
              field={domainLink}
              className="text-black no-underline transition-colors hover:text-[#eb0045]"
            />
          ) : (
            <SitecoreText field={domainLabelField?.jsonValue ?? domainLabelField} />
          )}
        </div>
      )}
    </div>
  );
};

export default Default;
