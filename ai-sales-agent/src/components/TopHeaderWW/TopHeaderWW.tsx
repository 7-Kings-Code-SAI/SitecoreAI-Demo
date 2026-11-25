'use client';

import type React from 'react';
import { useRouter } from 'next/router';
import {
  Image as SitecoreImage,
  useSitecore,
  type ImageField,
  type LinkField,
} from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'src/lib/component-props';
import { LinkWW } from 'src/lib/ww/LinkWW';
import { cn, isUrlActiveWW, normalizeLinkFieldWW, useLocaleWW } from 'src/lib/ww/utils';

interface TopHeaderWWChild {
  Icon?: { jsonValue?: ImageField } | ImageField;
  Link?: { jsonValue?: LinkField } | LinkField;
  Text?: { value?: string };
  IsCustomerPortal?: { value?: boolean };
}

export interface TopHeaderWWProps extends ComponentProps {
  fields?: {
    items?: Array<{
      id?: string;
      name?: string;
      displayName?: string;
      fields?: {
        Icon?: { jsonValue?: ImageField } | ImageField | { value?: unknown };
        Link?: { jsonValue?: LinkField } | LinkField | { value?: unknown };
        Text?: { value?: string };
        IsCustomerPortal?: { value?: boolean };
      };
    }>;
    children?: { results?: TopHeaderWWChild[] };
    datasource?: { children?: { results?: TopHeaderWWChild[] } };
    data?: { datasource?: { children?: { results?: TopHeaderWWChild[] } } };
  };
  isPageEditing?: boolean;
}

export const Default: React.FC<TopHeaderWWProps> = (props) => {
  const { fields, rendering } = props;
  const { page } = useSitecore();
  const router = useRouter();
  const isEditing = Boolean(page?.mode?.isEditing);
  const locale = useLocaleWW();

  const flatItems = fields?.items ?? [];
  const nestedItems: TopHeaderWWChild[] =
    fields?.data?.datasource?.children?.results ??
    fields?.datasource?.children?.results ??
    fields?.children?.results ??
    [];

  const itemsSource = flatItems.length > 0 ? flatItems : nestedItems;

  if (itemsSource.length === 0 && !isEditing) {
    return (
      <div className="component top-header-ww">
        <div className="component-content">
          <span className="is-empty-hint text-xs text-neutral-500">
            {rendering?.componentName ?? 'TopHeaderWW'} requires a datasource item assigned.
          </span>
        </div>
      </div>
    );
  }

  const renderItem = (item: any, index: number, itemCount: number) => {
    const isLastItem = index === itemCount - 1;
    const iconSource = item?.fields?.Icon ?? item?.Icon;
    const iconField: ImageField | undefined =
      iconSource?.jsonValue ?? (iconSource as ImageField | undefined);

    const linkSource = item?.fields?.Link ?? item?.Link;
    const rawLinkField = (linkSource?.jsonValue ?? linkSource) as LinkField | undefined;
    const linkValue = rawLinkField?.value as (LinkField['value'] & { description?: string }) | undefined;

    const textSource = item?.fields?.Text ?? item?.Text;
    const textValue = typeof textSource?.value === 'string' ? textSource.value.trim() : '';
    const label = textValue || linkValue?.text || linkValue?.description || linkValue?.href || '';

    if (!linkValue?.href && !label && !isEditing) {
      return null;
    }

    const isCustomerPortalField = item?.fields?.IsCustomerPortal ?? item?.IsCustomerPortal;
    const isCustomerPortalValue = Boolean(
      isCustomerPortalField?.jsonValue?.value ?? isCustomerPortalField?.value,
    );
    const isCustomerPortal =
      isCustomerPortalValue || label.toLowerCase().includes('customer portal');

    if (linkValue?.href) {
      const normalizedLink = normalizeLinkFieldWW(rawLinkField, locale) ?? rawLinkField;
      const href = normalizedLink?.value?.href ?? linkValue.href;
      const isActive = isUrlActiveWW(href, router?.asPath);

      return (
        <LinkWW
          key={item?.id || index}
          field={normalizedLink}
          className={cn(
            'flex items-center gap-[5px] pt-[2px] text-sm font-normal leading-none antialiased transition-colors duration-200 hover:text-[#eb0045]',
            'w-full border-gray-100 py-[14px] lg:w-auto lg:border-b lg:border-none lg:py-0',
            isLastItem ? '' : 'lg:pr-0',
            isActive ? 'text-[#eb0045]' : 'text-black',
          )}
        >
          {isCustomerPortal && (
            <img
              src="/assets/icons/cws_customer_portal.svg"
              alt="Customer Portal"
              className="mb-1 h-[19px] w-4 pt-px"
            />
          )}
          {!isCustomerPortal && iconField?.value?.src && (
            <SitecoreImage field={iconField} className="h-4 w-4" alt="" />
          )}
          {label && <span>{label}</span>}
        </LinkWW>
      );
    }

    return (
      <span
        key={item?.id || index}
        className={cn(
          'flex items-center gap-[5px] pt-[2px] text-sm leading-none text-black antialiased',
          'w-full py-[14px] lg:w-auto lg:py-0',
          isLastItem ? '' : 'lg:pr-0',
        )}
      >
        {isCustomerPortal && (
          <img
            src="/assets/icons/cws_customer_portal.svg"
            alt="Customer Portal"
            className="mb-1 h-[19px] w-4 pt-px"
          />
        )}
        {!isCustomerPortal && iconField?.value?.src && (
          <SitecoreImage field={iconField} className="h-4 w-4" alt="" />
        )}
        {label && <span>{label}</span>}
      </span>
    );
  };

  return (
    <div
      data-component="TopHeaderWW"
      className="flex w-full min-w-0 flex-col items-start lg:ml-auto lg:w-auto lg:flex-row lg:flex-wrap lg:items-center lg:justify-end lg:gap-x-3 lg:gap-y-2 lg:pt-[3px]"
    >
      {itemsSource.map((item: any, index: number) => renderItem(item, index, itemsSource.length))}
    </div>
  );
};

export default Default;
