'use client';

import type React from 'react';
import { createContext, useContext, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Placeholder,
  Text as SitecoreText,
  useSitecore,
} from '@sitecore-content-sdk/nextjs';
import {
  getHeaderWWTone,
  headerWWLayout,
} from 'src/lib/ww/HeaderWW.styles';
import {
  placeholderHasItems,
  resolveHeaderPlaceholderName,
} from 'src/lib/ww/HeaderWW.utils';
import {
  newsHasContentWW,
  normalizeHeaderSectionWW,
  sectionHasActiveLinkWW,
  sectionHasRenderableLinksWW,
} from 'src/lib/ww/header-ww-data';
import { LinkWW } from 'src/lib/ww/LinkWW';
import { MegaMenuFeaturedNewsWW } from 'src/lib/ww/MegaMenuFeaturedNewsWW';
import { ChevronRightIcon } from 'src/lib/ww/icons';
import {
  cn,
  normalizeLinkFieldWW,
  resolveLinkHrefWW,
  useLocaleWW,
} from 'src/lib/ww/utils';
import type { HeaderMenuWWProps } from './HeaderMenuWW.props';

export interface HeaderWWNavContextValue {
  isSolidHeader: boolean;
  activeMenuUid: string | null;
  setActiveMenuUid: (uid: string | null) => void;
}

export const HeaderWWNavContext = createContext<HeaderWWNavContextValue | null>(null);

export const Default: React.FC<HeaderMenuWWProps> = (props) => {
  const { fields, rendering, params } = props;
  const { page } = useSitecore();
  const router = useRouter();
  const locale = useLocaleWW();
  const isPageEditing = Boolean(page?.mode?.isEditing);
  const navContext = useContext(HeaderWWNavContext);

  const [localOpen, setLocalOpen] = useState(false);

  const menuUid = rendering?.uid ?? 'header-menu-ww';
  const isOpen = navContext ? navContext.activeMenuUid === menuUid : localOpen;
  const setIsOpen = (next: boolean) => {
    if (navContext) {
      navContext.setActiveMenuUid(next ? menuUid : null);
    } else {
      setLocalOpen(next);
    }
  };

  const renderingPlaceholders = rendering?.placeholders as Record<string, unknown> | undefined;
  const dynamicPlaceholderId = params?.DynamicPlaceholderId ?? rendering?.params?.DynamicPlaceholderId;
  const megaMenuGroupsPlaceholderName = resolveHeaderPlaceholderName(
    renderingPlaceholders,
    ['mega-menu-groups-ww', 'mega-menu-groups'],
    dynamicPlaceholderId,
  );
  const hasGroupsPlaceholder = placeholderHasItems(renderingPlaceholders, [
    'mega-menu-groups-ww',
    'mega-menu-groups',
  ]);

  const section = normalizeHeaderSectionWW(fields, renderingPlaceholders, undefined, menuUid);
  const sectionLink = normalizeLinkFieldWW(section.link, locale);
  const sectionHref = resolveLinkHrefWW(sectionLink);
  const showFeaturedNews = newsHasContentWW(section.news, locale) || isPageEditing;
  const hasMenu =
    hasGroupsPlaceholder || sectionHasRenderableLinksWW(section, locale) || isPageEditing;
  const isRouteActive = sectionHasActiveLinkWW(section, router?.asPath, locale);

  const tone = getHeaderWWTone(navContext ? navContext.isSolidHeader : true);
  const layout = headerWWLayout;

  if (!section.title && !sectionHref && !isPageEditing) {
    return null;
  }

  const triggerClasses = cn(
    'relative inline-flex h-full cursor-pointer items-center gap-1 px-0 pl-0 font-semibold no-underline transition-all duration-200',
    'after:absolute after:right-0 after:bottom-[-3px] after:left-0 after:h-[2px] after:origin-left after:transition-all after:duration-300',
    tone.navLink,
    layout.navItem,
    isOpen
      ? cn(tone.navActive, 'after:scale-x-100')
      : isRouteActive
        ? cn(tone.navActive, 'after:scale-x-50')
        : cn('after:scale-x-0', tone.navIdle),
  );

  return (
    <div
      className="relative flex h-full items-center gap-1 md:pb-1"
      data-component="HeaderMenuWW"
      onMouseEnter={
        !isPageEditing && !navContext && hasMenu ? () => setIsOpen(true) : undefined
      }
      onMouseLeave={
        !isPageEditing && !navContext && hasMenu ? () => setIsOpen(false) : undefined
      }
    >
      {sectionHref || (isPageEditing && sectionLink) ? (
        <LinkWW field={sectionLink} className={triggerClasses}>
          {isPageEditing && section.titleField ? (
            <SitecoreText field={section.titleField} />
          ) : (
            section.title
          )}
        </LinkWW>
      ) : (
        <button
          type="button"
          className={triggerClasses}
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
        >
          {isPageEditing && section.titleField ? (
            <SitecoreText field={section.titleField} />
          ) : (
            section.title || 'Menu'
          )}
        </button>
      )}

      {isPageEditing && (
        <button
          type="button"
          className="inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded border border-neutral-300 bg-white/90 text-black hover:border-[#eb0045] hover:text-[#eb0045]"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? `Close ${section.title} mega menu` : `Edit ${section.title} mega menu`}
          aria-expanded={isOpen}
          title={isOpen ? 'Close mega menu' : 'Edit mega menu'}
        >
          <ChevronRightIcon
            size={12}
            strokeWidth={2.5}
            className={cn('transition-transform duration-150', isOpen ? 'rotate-90' : 'rotate-0')}
          />
        </button>
      )}

      {hasMenu && (
        <div
          data-nav-menu
          data-nav-parent={section.title}
          className={cn(
            'pointer-events-auto fixed top-[var(--header-offset,72px)] right-0 left-0 z-[55] mx-auto w-full max-w-[1360px] border-t border-[#eb0045]',
            isOpen ? 'block' : 'hidden',
          )}
        >
          <div
            className={cn(
              'mx-auto max-w-[1360px] border-b-[6px] border-[#f9e244] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.1)]',
              showFeaturedNews ? 'md:min-h-[320px]' : 'md:min-h-[300px]',
            )}
          >
            <div style={{ padding: '44px 32px 34px 24px' }}>
              <div
                className={cn(
                  'flex flex-col gap-10 transition-[width] duration-300 ease-out lg:flex-row lg:items-start lg:justify-between',
                  !showFeaturedNews
                    ? 'w-full min-[1440px]:w-[998px] lg:w-[712px] xl:w-[918px]'
                    : 'w-full',
                  showFeaturedNews && 'lg:gap-12',
                )}
              >
                <div
                  className={cn(
                    'flex min-w-0 flex-1 flex-col gap-6',
                    showFeaturedNews && 'lg:max-w-[calc(100%-308px)]',
                  )}
                >
                  <Placeholder name={megaMenuGroupsPlaceholderName} rendering={props.rendering} />
                </div>
                {showFeaturedNews ? (
                  <aside
                    className="w-full shrink-0 lg:w-[260px]"
                    aria-label={section.title ? `${section.title} — featured` : 'Featured'}
                  >
                    <MegaMenuFeaturedNewsWW news={section.news} locale={locale} />
                  </aside>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Default;
