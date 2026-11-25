'use client';

import type { FC } from 'react';
import { useRouter } from 'next/router';
import {
  Text as SitecoreText,
  useSitecore,
  type Field,
  type LinkField,
} from '@sitecore-content-sdk/nextjs';
import { LinkWW } from 'src/lib/ww/LinkWW';
import {
  cn,
  isUrlActiveWW,
  normalizeLinkFieldWW,
  resolveLinkHrefWW,
  useLocaleWW,
} from 'src/lib/ww/utils';
import type { GlobalFooterWWProps } from './GlobalFooterWW.props';

export const GlobalFooterWWVariants = {
  Default: 'Default',
  LegalInlineLayout: 'LegalInlineLayout',
} as const;
type GlobalFooterWWVariant = (typeof GlobalFooterWWVariants)[keyof typeof GlobalFooterWWVariants];

type GlobalFooterLinkItem = {
  id?: string;
  fields?: {
    Link?: LinkField & { jsonValue?: LinkField };
    'Link Text'?: Field<string> & { jsonValue?: Field<string> };
  };
  link?: LinkField & { jsonValue?: LinkField };
  'Link Text'?: Field<string> & { jsonValue?: Field<string> };
};

type GlobalFooterLinkGroup =
  | GlobalFooterLinkItem[]
  | {
      targetItems?: GlobalFooterLinkItem[];
      results?: GlobalFooterLinkItem[];
      children?: { results?: GlobalFooterLinkItem[] };
    };

type GlobalFooterTextField = Field<string> & { jsonValue?: Field<string> };

type GlobalFooterDatasource = {
  Copyright?: GlobalFooterTextField;
  copyright?: GlobalFooterTextField;
  LegalInlineText?: GlobalFooterTextField;
  legalInlineText?: GlobalFooterTextField;
  LeftLinks?: GlobalFooterLinkGroup;
  leftLinks?: GlobalFooterLinkGroup;
  RightLinks?: GlobalFooterLinkGroup;
  rightLinks?: GlobalFooterLinkGroup;
  Items?: GlobalFooterLinkGroup;
  items?: GlobalFooterLinkGroup;
  children?: { results?: GlobalFooterLinkItem[] };
};

const GlobalFooterWWLayout: FC<GlobalFooterWWProps & { variant: GlobalFooterWWVariant }> = ({
  fields,
  variant,
}) => {
  const { page } = useSitecore();
  const router = useRouter();
  const isPageEditing = Boolean(page?.mode?.isEditing);
  const locale = useLocaleWW();

  const fieldsRecord = fields as
    | { data?: { datasource?: GlobalFooterDatasource }; datasource?: GlobalFooterDatasource }
    | undefined;
  const datasource: GlobalFooterDatasource | undefined =
    fieldsRecord?.data?.datasource ??
    fieldsRecord?.datasource ??
    (fields as GlobalFooterDatasource | undefined);

  const isLegalInlineLayout = variant === GlobalFooterWWVariants.LegalInlineLayout;

  const copyrightField = datasource?.Copyright ?? datasource?.copyright;
  const copyright = copyrightField?.value ?? copyrightField?.jsonValue?.value;
  const legalInlineTextField = datasource?.LegalInlineText ?? datasource?.legalInlineText;
  const legalInlineText =
    legalInlineTextField?.value ?? legalInlineTextField?.jsonValue?.value;
  const showLegalInlineText =
    (isLegalInlineLayout || Boolean(legalInlineText?.trim())) &&
    (Boolean(legalInlineText?.trim()) || (isPageEditing && Boolean(legalInlineTextField)));

  const readLinks = (field: GlobalFooterLinkGroup | undefined): GlobalFooterLinkItem[] => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    return field.targetItems || field.results || field.children?.results || [];
  };

  const leftLinks = readLinks(datasource?.LeftLinks ?? datasource?.leftLinks);
  const rightFromField = readLinks(datasource?.RightLinks ?? datasource?.rightLinks);
  const legacyLinks = readLinks(datasource?.Items ?? datasource?.items);
  const rightLinks =
    rightFromField.length > 0
      ? rightFromField
      : legacyLinks.length > 0
        ? legacyLinks
        : (datasource?.children?.results ?? []);

  const renderLink = (link: GlobalFooterLinkItem, index: number) => {
    const rawLinkContainer = link?.fields?.Link ?? link?.link;
    const rawLinkField =
      (rawLinkContainer && typeof rawLinkContainer === 'object' && 'jsonValue' in rawLinkContainer
        ? rawLinkContainer.jsonValue
        : rawLinkContainer) as LinkField | undefined;
    const linkField = rawLinkField
      ? (normalizeLinkFieldWW(rawLinkField, locale) ?? rawLinkField)
      : undefined;
    const linkTitleField = link?.fields?.['Link Text'] ?? link?.['Link Text'];

    if (!linkField && !linkTitleField && !isPageEditing) return null;

    const hasLinkText =
      Boolean(linkTitleField?.value) || Boolean(linkTitleField?.jsonValue?.value);
    const href = resolveLinkHrefWW(linkField);
    const isActive = href ? isUrlActiveWW(href, router?.asPath, locale) : false;

    return (
      <LinkWW
        key={link?.id || index}
        field={linkField}
        className={cn(
          'no-underline transition-colors duration-200 hover:text-[#eb0045]',
          isActive ? 'text-[#eb0045]' : 'text-black',
        )}
      >
        {hasLinkText && linkTitleField ? (
          <SitecoreText field={linkTitleField?.jsonValue ?? linkTitleField} />
        ) : undefined}
      </LinkWW>
    );
  };

  if (!copyright && leftLinks.length === 0 && rightLinks.length === 0 && !isPageEditing) {
    return null;
  }

  return (
    <div className="w-full bg-transparent" data-component="GlobalFooterWW">
      <div
        className={cn(
          'mx-auto flex w-full text-xs font-normal',
          'max-w-[1440px] flex-row flex-wrap items-center justify-center gap-x-5 gap-y-1 px-4 pt-1 pb-4 text-center text-[8px] text-black md:text-[10px]',
          'lg:flex-nowrap lg:justify-start lg:gap-x-6 lg:px-[33px] lg:pt-4 lg:pb-4 lg:text-left lg:text-[12px]',
          isLegalInlineLayout && 'py-6 lg:py-8',
        )}
      >
        {rightLinks.length > 0 && (
          <nav
            className="contents lg:order-3 lg:ml-auto lg:flex lg:items-center lg:gap-8"
            aria-label="Legal and utility links"
          >
            {rightLinks.map(renderLink)}
          </nav>
        )}

        {leftLinks.length > 0 && (
          <nav
            className="contents lg:order-2 lg:ml-[69px] lg:flex lg:items-center lg:gap-6"
            aria-label="Legal links"
          >
            {leftLinks.map(renderLink)}
          </nav>
        )}

        {(copyrightField || isPageEditing || showLegalInlineText) && (
          <div className="flex basis-full flex-col items-center text-black lg:order-1 lg:basis-auto lg:items-start">
            {(copyrightField || isPageEditing) && (
              <div>
                <SitecoreText field={copyrightField?.jsonValue ?? copyrightField} />
              </div>
            )}
            {showLegalInlineText && (
              <div className="mt-1 text-[12px] font-normal text-gray-500 [&_*]:text-[12px] [&_*]:text-gray-500">
                <SitecoreText field={legalInlineTextField?.jsonValue ?? legalInlineTextField} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const Default: FC<GlobalFooterWWProps> = (props) => (
  <GlobalFooterWWLayout {...props} variant={GlobalFooterWWVariants.Default} />
);

export const LegalInlineLayout: FC<GlobalFooterWWProps> = (props) => (
  <GlobalFooterWWLayout {...props} variant={GlobalFooterWWVariants.LegalInlineLayout} />
);

export default Default;
