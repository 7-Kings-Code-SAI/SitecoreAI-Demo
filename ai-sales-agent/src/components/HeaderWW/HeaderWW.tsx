'use client';

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { useRouter } from 'next/router';
import {
  Placeholder,
  useComponentProps,
  useSitecore,
  type LinkField,
} from '@sitecore-content-sdk/nextjs';
import { useI18n } from 'next-localization';
import HeaderLogoWW from '../HeaderLogoWW/HeaderLogoWW';
import type { HeaderNavigationNodeWW, HeaderWWProps } from './HeaderWW.props';
import {
  getHeaderWWSpacer,
  getHeaderWWTone,
  headerWWLayout,
} from 'src/lib/ww/HeaderWW.styles';
import { isHeaderWWTransparentPage } from 'src/lib/ww/HeaderWW.utils';
import styles from './HeaderWW.module.css';
import { LinkWW } from 'src/lib/ww/LinkWW';
import { CheckIcon, ChevronRightIcon } from 'src/lib/ww/icons';
import {
  cn,
  isUrlActiveWW,
  normalizeLinkFieldWW,
  resolveLinkHrefWW,
  useLocaleWW,
} from 'src/lib/ww/utils';

const getField = (node: any, name: string): any =>
  node?.fields?.find?.((f: any) => f.name === name) ?? node?.[name];

const getNodeTitle = (node?: any): string => {
  if (!node) return '';
  const f = getField(node, 'Title');
  const textField = getField(node, 'Text');
  const linkField = getField(node, 'Link');
  return (
    f?.value ||
    f?.jsonValue?.value ||
    textField?.value ||
    textField?.jsonValue?.value ||
    node?.title?.value ||
    linkField?.jsonValue?.value?.text ||
    linkField?.value?.text ||
    node?.link?.link?.value?.text ||
    node?.link?.value?.text ||
    ''
  ).trim();
};

const toLinkField = (f: any): LinkField | undefined => {
  if (f?.jsonValue?.value) return f.jsonValue;
  if (f?.link?.value) return f.link;
  if (f?.value) return f;
  return undefined;
};

const getNodeLink = (node?: any): LinkField | undefined =>
  node ? (toLinkField(getField(node, 'Link')) ?? toLinkField(node.link)) : undefined;

const getNewsLink = (node?: any): LinkField | undefined =>
  node ? (toLinkField(getField(node, 'News Link')) ?? toLinkField(node.newsLink)) : undefined;

const getChildNodes = (node?: any): any[] => {
  if (!node) return [];
  const ch = node.children;
  return Array.isArray(ch) ? ch : (ch?.results ?? []);
};

const getLinkFieldFromUnion = (value: unknown): LinkField | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const field = value as Record<string, unknown>;
  if (field.value && typeof field.value === 'object') return value as LinkField;
  if (field.jsonValue) return getLinkFieldFromUnion(field.jsonValue);
  if (field.link) return getLinkFieldFromUnion(field.link);
  return undefined;
};

const sectionHasFeaturedNews = (section?: any): boolean => {
  if (!section) return false;
  const title = (getField(section, 'News Title')?.value || section.newsTitle?.value || '').trim();
  const desc = (
    getField(section, 'News Description')?.value ||
    section.newsDescription?.value ||
    ''
  ).trim();
  const img =
    getField(section, 'News Image')?.jsonValue?.value?.src || section.newsImage?.image?.value?.src;
  const href = resolveLinkHrefWW(getNewsLink(section));
  return Boolean(title || desc || img || href);
};

const MegaMenuFeaturedNewsWW: React.FC<{
  section: any;
  locale: string;
}> = ({ section, locale }) => {
  const title = (getField(section, 'News Title')?.value || section.newsTitle?.value || '').trim();
  const description = (
    getField(section, 'News Description')?.value ||
    section.newsDescription?.value ||
    ''
  ).trim();
  const imgVal =
    getField(section, 'News Image')?.jsonValue?.value || section.newsImage?.image?.value;
  const imageSrc = imgVal?.src?.trim();
  const imageAlt = (imgVal?.alt && imgVal.alt.trim()) || title || '';
  const newsLinkField = normalizeLinkFieldWW(getNewsLink(section), locale);
  const href = resolveLinkHrefWW(newsLinkField);

  if (!title && !description && !imageSrc && !href) return null;

  const cardClass = cn(
    'relative mx-auto w-full max-w-[500px] overflow-hidden rounded-sm bg-neutral-200 shadow-md transition-shadow',
    'aspect-[500/412]',
    'lg:mx-0 lg:aspect-auto lg:h-[206px] lg:w-[260px] lg:max-w-none lg:shrink-0',
    'group-hover:shadow-lg',
  );

  const cardBody = (
    <div className={cardClass}>
      {imageSrc ? (
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
            {title ? (
              <p
                className="block h-[15px] cursor-pointer text-xs leading-[15px] font-bold hyphens-manual"
                style={{ fontFamily: 'suisse_intlbold, sans-serif', fontWeight: '400' }}
              >
                {title}
              </p>
            ) : null}
            {description ? (
              <p
                className="line-clamp-2 h-[30px] text-xs leading-[15px] font-normal opacity-95 hyphens-manual group-hover:opacity-100"
                style={{ fontFamily: 'suisse_intlregular, sans-serif', fontWeight: '400' }}
              >
                {description}
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

  if (href && newsLinkField) {
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

const hasActiveDescendantLink = (
  node: HeaderNavigationNodeWW | undefined,
  asPath: string | undefined,
  locale: string,
): boolean => {
  if (!node) return false;

  const patched = normalizeLinkFieldWW(getNodeLink(node), locale);
  const nodeHref = resolveLinkHrefWW(patched);

  if (nodeHref && isUrlActiveWW(nodeHref, asPath, locale)) return true;

  const children = getChildNodes(node);
  for (const child of children) {
    if (hasActiveDescendantLink(child, asPath, locale)) return true;
  }

  return false;
};

const HeaderWWContent: React.FC<HeaderWWProps> = (props) => {
  const { fields, rendering } = props;
  const { page } = useSitecore();
  const router = useRouter();
  const locale = useLocaleWW();
  const i18n = useI18n();

  const translateOrFallback = (key: string, fallback: string): string => {
    try {
      const value = i18n?.t?.(key);
      return value && value !== key ? value : fallback;
    } catch {
      return fallback;
    }
  };

  const isPageEditing = Boolean(page?.mode?.isEditing);
  const isTransparentPage = isHeaderWWTransparentPage((page as any)?.layout?.sitecore?.route);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileMenuDir, setMobileMenuDir] = useState<'forward' | 'back'>('forward');
  const [activeMenuIndex, setActiveMenuIndex] = useState<number | null>(null);
  const [activeSectionIndex, setActiveSectionIndex] = useState<number | null>(null);
  const [expandedMobileMenus, setExpandedMobileMenus] = useState<number[]>([]);
  const [isSticky, setIsSticky] = useState(false);
  const [hasScrolledFromHero, setHasScrolledFromHero] = useState(false);
  const [isHeroSolid, setIsHeroSolid] = useState(false);
  const [isMobileLanguageOpen, setIsMobileLanguageOpen] = useState(false);
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const navBarRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const topBarRef = useRef<HTMLDivElement>(null);
  const buttonStackRef = useRef<HTMLDivElement>(null);
  const megaMenuCloseTimerRef = useRef<number | null>(null);
  const [failedFlagImages, setFailedFlagImages] = useState<Set<string>>(new Set());

  const cancelMegaMenuClose = () => {
    if (megaMenuCloseTimerRef.current !== null) {
      window.clearTimeout(megaMenuCloseTimerRef.current);
      megaMenuCloseTimerRef.current = null;
    }
  };

  const scheduleMegaMenuClose = () => {
    cancelMegaMenuClose();
    megaMenuCloseTimerRef.current = window.setTimeout(() => {
      setActiveMenuIndex(null);
      megaMenuCloseTimerRef.current = null;
    }, 180);
  };

  const renderingPlaceholders = rendering?.placeholders as Record<string, unknown> | undefined;
  const renderingPlaceholderKeys = Object.keys(renderingPlaceholders ?? {});
  const getPlaceholderLeafName = (placeholderName: string) =>
    placeholderName.split('/').filter(Boolean).pop() ?? placeholderName;

  const resolveHeaderPlaceholderName = (candidateBaseNames: string[]): string => {
    const dynamicPlaceholderId =
      props?.params?.DynamicPlaceholderId ?? props?.rendering?.params?.DynamicPlaceholderId;

    for (const baseName of candidateBaseNames) {
      const normalizedBaseName = baseName.toLowerCase();
      const matchedPlaceholderName = renderingPlaceholderKeys.find((placeholderKey) => {
        const leafName = getPlaceholderLeafName(placeholderKey).toLowerCase();
        return leafName === normalizedBaseName || leafName.startsWith(`${normalizedBaseName}-`);
      });

      if (matchedPlaceholderName) {
        const leafName = getPlaceholderLeafName(matchedPlaceholderName);
        if (leafName.includes('{*}') && dynamicPlaceholderId) {
          return leafName.replace('{*}', String(dynamicPlaceholderId));
        }
        return leafName;
      }
    }

    const primaryBaseName = candidateBaseNames[0];
    return dynamicPlaceholderId ? `${primaryBaseName}-${dynamicPlaceholderId}` : primaryBaseName;
  };

  const placeholderHasItems = (candidateBaseNames: string[]): boolean =>
    Object.entries(renderingPlaceholders ?? {}).some(([placeholderName, placeholderItems]) => {
      const placeholderLeafName = getPlaceholderLeafName(placeholderName).toLowerCase();
      const matches = candidateBaseNames.some((baseName) => {
        const normalizedBaseName = baseName.toLowerCase();
        return (
          placeholderLeafName === normalizedBaseName ||
          placeholderLeafName.startsWith(`${normalizedBaseName}-`)
        );
      });
      if (!matches) return false;
      if (Array.isArray(placeholderItems)) return placeholderItems.length > 0;
      return Boolean(placeholderItems);
    });

  const getPlaceholderItems = (candidateBaseNames: string[]): any[] => {
    const matchingEntry = Object.entries(renderingPlaceholders ?? {}).find(([placeholderName]) => {
      const placeholderLeafName = getPlaceholderLeafName(placeholderName).toLowerCase();
      return candidateBaseNames.some((baseName) => {
        const normalizedBaseName = baseName.toLowerCase();
        return (
          placeholderLeafName === normalizedBaseName ||
          placeholderLeafName.startsWith(`${normalizedBaseName}-`)
        );
      });
    });

    if (!matchingEntry) return [];
    const [, placeholderItems] = matchingEntry;
    return Array.isArray(placeholderItems)
      ? placeholderItems
      : placeholderItems
        ? [placeholderItems]
        : [];
  };

  const headerLogoPlaceholderName = resolveHeaderPlaceholderName(['header-logo-ww', 'header-logo']);
  const topHeaderPlaceholderName = resolveHeaderPlaceholderName(['top-header-ww', 'top-header']);

  const datasource = fields?.data?.datasource ?? fields?.datasource ?? (fields as any);
  const navigationSections: any[] = getChildNodes(datasource);
  const languages: any[] = Array.isArray(datasource?.languages)
    ? datasource.languages
    : (datasource?.languages?.results ?? []);

  const contactButtonText =
    datasource?.ContactLabel?.value ||
    datasource?.contactButtonText?.value ||
    translateOrFallback('header-contactButton-label', 'Contact');
  const backButtonText = datasource?.backButtonText?.value || 'Back';
  const closeMenuAriaLabel = datasource?.closeMenuAriaLabel?.value || 'Close menu';
  const openMenuAriaLabel = datasource?.openMenuAriaLabel?.value || 'Open menu';
  const backToNavigationAriaLabel =
    datasource?.backToNavigationAriaLabel?.value || 'Back to main navigation';

  const hasTopHeaderPlaceholder = placeholderHasItems(['top-header-ww', 'top-header']);
  const hasHeaderLogoPlaceholder = placeholderHasItems(['header-logo-ww', 'header-logo']);

  const hasNavigation = navigationSections.length > 0;
  const hasDesktopNavigation = navigationSections.some((section) => Boolean(getNodeTitle(section)));
  const showMainNavigationBar = isPageEditing || hasDesktopNavigation;
  const desktopHeaderOffset = showMainNavigationBar ? 106 : 52;

  const headerLogoRendering = getPlaceholderItems(['header-logo-ww', 'header-logo']).find(
    (placeholderRendering) =>
      placeholderRendering?.componentName === 'HeaderLogoWW' ||
      placeholderRendering?.componentName === 'HeaderLogo',
  );
  const headerLogoComponentProps = useComponentProps<{ fields?: Record<string, unknown> }>(
    headerLogoRendering?.uid,
  );

  const showMobileMenuToggle = hasNavigation || hasTopHeaderPlaceholder;
  const showMobileHeaderControls = showMobileMenuToggle;

  const isSolidHeader: boolean =
    !isTransparentPage || isHeroSolid || isMobileMenuOpen || activeMenuIndex !== null;

  const isHeroState: boolean =
    isTransparentPage && !isPageEditing && !hasScrolledFromHero && !isSolidHeader;
  const tone = getHeaderWWTone(isSolidHeader);
  const layout = headerWWLayout;

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    let previousMobileViewport = window.innerWidth < 1024;
    const updateScrollLock = () => {
      const isMobileViewport = window.innerWidth < 1024;
      document.body.style.overflow = isMobileViewport ? 'hidden' : previousOverflow;
      if (previousMobileViewport !== isMobileViewport) {
        setIsMobileMenuOpen(false);
      }
      previousMobileViewport = isMobileViewport;
    };
    updateScrollLock();
    window.addEventListener('resize', updateScrollLock);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('resize', updateScrollLock);
    };
  }, [isMobileMenuOpen]);

  const rawLoginLink =
    datasource?.LoginLink ?? datasource?.loginLink ?? fields?.LoginLink ?? fields?.loginLink;
  const loginLink = normalizeLinkFieldWW(getLinkFieldFromUnion(rawLoginLink), locale);
  const loginText =
    loginLink?.value?.text || translateOrFallback('header-loginButton-label', 'Log in');

  const rawContactLink =
    datasource?.ContactLink ?? datasource?.contactLink ?? fields?.ContactLink ?? fields?.contactLink;
  const contactLink = normalizeLinkFieldWW(getLinkFieldFromUnion(rawContactLink), locale);

  const renderLoginButton = (className: string, onClick?: () => void) =>
    loginLink?.value?.href ? (
      <LinkWW field={loginLink} className={className} onClick={onClick} data-tracking="header-login">
        {loginText}
      </LinkWW>
    ) : null;

  const handleContactClick = () => {
    if (isPageEditing) return;
    const contactTarget = document.querySelector('#contact, [data-component="FooterWW"], footer');
    contactTarget?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const findActiveSection = () => {
      for (let i = 0; i < navigationSections.length; i++) {
        const section = navigationSections[i];
        if (!section) continue;
        if (hasActiveDescendantLink(section, router?.asPath, locale)) {
          return i;
        }
      }
      return -1;
    };

    const activeIndex = findActiveSection();
    setActiveSectionIndex(activeIndex >= 0 ? activeIndex : null);
  }, [navigationSections, router?.asPath, locale]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setExpandedMobileMenus([]);
    setIsMobileLanguageOpen(false);
    setHasScrolledFromHero(false);
  }, [router?.asPath]);

  useEffect(() => {
    const handleScroll = () => {
      const isPastThreshold = window.scrollY > 50;
      setIsSticky(isPastThreshold);
      if (isPastThreshold && isTransparentPage) {
        setHasScrolledFromHero(true);
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isTransparentPage]);

  useEffect(() => {
    if (!isTransparentPage) return;
    const apply = (step: number) => {
      setHasScrolledFromHero(step > 0 || window.scrollY > 50);
      setIsHeroSolid(step >= 3);
    };
    apply(Number(document.documentElement.dataset.heroStep ?? 0));
    const onStep = (e: Event) => apply((e as CustomEvent<{ step: number }>).detail?.step ?? 0);
    window.addEventListener('hero-step', onStep);
    return () => window.removeEventListener('hero-step', onStep);
  }, [isTransparentPage]);

  useEffect(() => {
    const applyHeaderOffset = () => {
      if (headerRef.current) {
        const headerHeight = Math.ceil(headerRef.current.getBoundingClientRect().height);
        document.documentElement.style.setProperty('--header-offset', `${headerHeight}px`);
      } else {
        const isDesktop = window.innerWidth >= 1024;
        const headerOffset = isDesktop ? desktopHeaderOffset : 52;
        document.documentElement.style.setProperty('--header-offset', `${headerOffset}px`);
      }
    };

    applyHeaderOffset();
    const observer = new ResizeObserver(applyHeaderOffset);
    if (headerRef.current) observer.observe(headerRef.current);
    window.addEventListener('resize', applyHeaderOffset);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', applyHeaderOffset);
      document.documentElement.style.removeProperty('--header-offset');
    };
  }, [desktopHeaderOffset]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setActiveMenuIndex(null);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const navBarEl = navBarRef.current;

      if (
        megaMenuRef.current &&
        !megaMenuRef.current.contains(target) &&
        (!navBarEl || !navBarEl.contains(target))
      ) {
        setActiveMenuIndex(null);
      }
    };

    if (activeMenuIndex !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [activeMenuIndex]);

  const toggleMobileSubmenu = (index: number) => {
    setMobileMenuDir('forward');
    setExpandedMobileMenus((prev) => (prev[0] === index ? [] : [index]));
  };

  const sectionHasRenderableLinks = (section: HeaderNavigationNodeWW | undefined): boolean => {
    if (!section) return false;
    const primaryItems = getChildNodes(section);
    return primaryItems.some((primaryItem) => {
      const primaryTitle = getNodeTitle(primaryItem);
      const primaryLink = normalizeLinkFieldWW(getNodeLink(primaryItem), locale);
      const primaryHref = resolveLinkHrefWW(primaryLink);
      const primaryText = primaryLink?.value?.text || primaryTitle;

      if (primaryHref && primaryText) return true;

      const childLinks = getChildNodes(primaryItem);
      return childLinks.some((childLink) => {
        const itemTitle = getNodeTitle(childLink);
        const itemLink = normalizeLinkFieldWW(getNodeLink(childLink), locale);
        const itemHref = resolveLinkHrefWW(itemLink);
        if (!itemHref) return false;
        const displayText = itemLink?.value?.text || itemTitle;
        return Boolean(displayText);
      });
    });
  };

  const renderMegaMenu = (index: number) => {
    const section = navigationSections[index];
    const primaryItems = getChildNodes(section);

    if (!section || primaryItems.length === 0) return null;
    if (!sectionHasRenderableLinks(section)) return null;

    const showFeaturedNews = sectionHasFeaturedNews(section);
    const megaMenuSectionTitle = getNodeTitle(section);

    return (
      <div
        ref={megaMenuRef}
        data-nav-menu
        data-nav-parent={megaMenuSectionTitle}
        className="pointer-events-auto fixed top-[var(--header-offset,72px)] right-0 left-0 z-[55] mx-auto w-full max-w-[1360px] border-t border-[#eb0045]"
        style={{ animation: 'slideDown 0.15s ease-out' }}
        onMouseEnter={() => {
          cancelMegaMenuClose();
          setActiveMenuIndex(index);
        }}
        onMouseLeave={(event: ReactMouseEvent<HTMLDivElement>) => {
          const nextTarget = event.relatedTarget;
          const navBarEl = navBarRef.current;
          if (navBarEl && nextTarget instanceof Node && navBarEl.contains(nextTarget)) {
            return;
          }
          scheduleMegaMenuClose();
        }}
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
                {primaryItems.map((primaryItem, categoryIndex) => {
                  const categoryTitle = getNodeTitle(primaryItem);
                  const categoryLink = normalizeLinkFieldWW(getNodeLink(primaryItem), locale);
                  const childLinks = getChildNodes(primaryItem);

                  return (
                    <div key={categoryIndex} className="flex flex-col gap-3">
                      {categoryTitle && (
                        <div className="mb-2">
                          {resolveLinkHrefWW(categoryLink) ? (
                            <LinkWW
                              field={categoryLink}
                              className="inline-flex items-center gap-1.5 text-base font-semibold tracking-wide no-underline transition-colors duration-200 hover:text-[#eb0045]"
                            >
                              {categoryTitle}
                              <ChevronRightIcon size={16} strokeWidth={2.5} />
                            </LinkWW>
                          ) : (
                            <h4 className="inline-flex items-center gap-1.5 text-base font-bold tracking-wide">
                              {categoryTitle}
                              <ChevronRightIcon size={16} strokeWidth={2.5} />
                            </h4>
                          )}
                        </div>
                      )}

                      {childLinks.length > 0 && (
                        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 lg:grid-cols-5 lg:gap-x-7">
                          {childLinks.map((childLink, childIndex) => {
                            const itemTitle = getNodeTitle(childLink);
                            const itemLink = normalizeLinkFieldWW(getNodeLink(childLink), locale);
                            const itemHref = resolveLinkHrefWW(itemLink);

                            if (!itemTitle && !itemLink?.value?.text) return null;

                            const displayText = itemLink?.value?.text || itemTitle;

                            return itemHref ? (
                              <LinkWW
                                key={childIndex}
                                field={itemLink}
                                className={cn(
                                  'block text-[16px] leading-[16px] font-normal break-words no-underline antialiased transition-colors duration-200 hover:text-[#eb0045]',
                                  isUrlActiveWW(itemHref, router?.asPath, locale)
                                    ? 'text-[#eb0045]'
                                    : 'text-black',
                                )}
                              >
                                {displayText}
                              </LinkWW>
                            ) : (
                              <span key={childIndex} className="leading-[16px]">
                                {displayText}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {showFeaturedNews ? (
                <aside
                  className="w-full shrink-0 lg:w-[260px]"
                  aria-label={
                    megaMenuSectionTitle ? `${megaMenuSectionTitle} — featured` : 'Featured'
                  }
                >
                  <MegaMenuFeaturedNewsWW section={section} locale={locale} />
                </aside>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <style jsx global>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes menuSlideInRight {
          from {
            opacity: 0;
            transform: translateX(28px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes menuSlideInLeft {
          from {
            opacity: 0;
            transform: translateX(-28px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes bouncingArrow {
          0% {
            opacity: 0;
            transform: translate(-10px, 10px);
          }
          55% {
            opacity: 1;
            transform: translate(0, 0);
          }
        }
      `}</style>

      {activeMenuIndex !== null && (
        <div
          className="fixed top-[var(--header-offset,108px)] right-0 bottom-0 left-0 z-40 bg-black/50"
          onClick={() => setActiveMenuIndex(null)}
          aria-hidden="true"
        />
      )}

      <header
        ref={headerRef}
        className={cn(
          styles.header,
          'fixed top-0 z-60 w-full transition-[background-color,box-shadow] duration-300',
          tone.header,
          isSolidHeader && 'shadow-[0px_0_10px_0_rgba(0,0,0,0.16)]',
          isSolidHeader && isSticky && 'shadow-[0_4px_12px_rgba(0,0,0,0.08)]',
        )}
        role="banner"
        data-component="HeaderWW"
        onClickCapture={
          isPageEditing
            ? (event) => {
                const target = event.target as HTMLElement | null;
                if (target?.closest('a[href]')) {
                  event.preventDefault();
                }
              }
            : undefined
        }
      >
        {/* Top bar with centered logo and right utility links */}
        <div ref={topBarRef}>
          <div
            className={cn(
              'mx-auto px-2 sm:px-[10px] md:px-[10px] lg:shadow-[0px]',
              tone.topBarShadow,
              layout.topBarContainer,
            )}
          >
            <div className={cn('flex h-[55px] items-center md:h-[50px]', layout.topBarRow)}>
              {/* Header logo */}
              {headerLogoRendering && !isPageEditing ? (
                <div
                  className={cn(
                    layout.logoWrap,
                    isHeroState ? layout.logoHero : layout.logoReturn,
                  )}
                >
                  <HeaderLogoWW
                    rendering={headerLogoRendering}
                    params={{ ...((headerLogoRendering as any)?.params ?? {}), InHeader: '1' }}
                    fields={
                      (headerLogoComponentProps?.fields as any) ??
                      (headerLogoRendering as any)?.fields
                    }
                  />
                </div>
              ) : !isPageEditing && !hasHeaderLogoPlaceholder ? (
                <div
                  className={cn(
                    layout.logoWrap,
                    isHeroState ? layout.logoHero : layout.logoReturn,
                  )}
                >
                  <HeaderLogoWW
                    rendering={props.rendering}
                    params={{ InHeader: '1' }}
                    fields={datasource?.logo ? { Image: datasource.logo } : undefined}
                  />
                </div>
              ) : (
                <div
                  className={cn(
                    layout.logoWrap,
                    layout.logoReturn,
                    'bg-transparent [&_*]:!bg-transparent',
                  )}
                >
                  <Placeholder name={headerLogoPlaceholderName} rendering={props.rendering} />
                </div>
              )}

              {/* Right side utility links */}
              {(hasTopHeaderPlaceholder || isPageEditing) && (
                <div
                  className={cn(
                    isPageEditing
                      ? 'absolute top-0 right-10 z-[80] flex h-full min-w-[140px] items-center justify-end lg:right-[31px] lg:w-[calc(50%-153px)] [&_.sc-jss-empty-placeholder]:min-h-[36px] [&_.sc-jss-empty-placeholder]:min-w-[140px]'
                      : 'hidden lg:z-[80] lg:flex lg:items-center',
                    tone.utilityLinks,
                    layout.utility,
                  )}
                >
                  <Placeholder name={topHeaderPlaceholderName} rendering={props.rendering} />
                </div>
              )}

              {!isPageEditing && hasTopHeaderPlaceholder && (
                <div
                  className={cn(
                    'absolute top-0 left-2 z-10 flex h-full items-center lg:hidden',
                    '[&_[data-component=TopHeaderWW]]:w-auto',
                    '[&_[data-component=TopHeaderWW]>div]:w-auto',
                    '[&_[data-component=TopHeaderWW]_a]:w-auto',
                    '[&_[data-component=TopHeaderWW]_a]:border-0',
                    '[&_[data-component=TopHeaderWW]_a]:py-0',
                    '[&_[data-component=TopHeaderWW]_span]:hidden',
                    '[&_[data-component=TopHeaderWW]_img]:h-[18px]',
                    '[&_[data-component=TopHeaderWW]_img]:w-[25px]',
                  )}
                >
                  <Placeholder name={topHeaderPlaceholderName} rendering={props.rendering} />
                </div>
              )}

              {/* Mobile menu toggle */}
              {showMobileHeaderControls && (
                <div className={cn('flex items-center gap-0 lg:hidden', layout.mobileControls)}>
                  {showMobileMenuToggle && (
                    <button
                      type="button"
                      className="mr-[2px] flex h-8 w-5 cursor-pointer items-center justify-center pt-[1px] transition-all duration-200 ease-in-out"
                      onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                      aria-label={isMobileMenuOpen ? closeMenuAriaLabel : openMenuAriaLabel}
                      aria-expanded={isMobileMenuOpen}
                    >
                      {isMobileMenuOpen ? (
                        <div className="relative h-6 w-6">
                          <span
                            className={cn(
                              'absolute top-1/2 left-0 h-[2px] w-full origin-center -translate-y-1/2 rotate-45 transition-transform',
                              tone.mobileBar,
                            )}
                          />
                          <span
                            className={cn(
                              'absolute top-1/2 left-0 h-[2px] w-full origin-center -translate-y-1/2 -rotate-45 transition-transform',
                              tone.mobileBar,
                            )}
                          />
                        </div>
                      ) : (
                        <div className="relative h-[26px] w-6">
                          <span
                            className={cn(
                              'absolute top-[6px] left-0 h-[2px] w-full transition-all',
                              tone.mobileBar,
                            )}
                          />
                          <span
                            className={cn(
                              'absolute top-1/2 left-0 h-[2px] w-full -translate-y-1/2 transition-all',
                              tone.mobileBar,
                            )}
                          />
                          <span
                            className={cn(
                              'absolute bottom-[6px] left-0 h-[2px] w-full transition-all',
                              tone.mobileBar,
                            )}
                          />
                        </div>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main navigation bar */}
        {showMainNavigationBar && (
          <div
            className={cn(
              'hidden shadow-[0_2px_8px_rgba(0,0,0,0.08)] lg:block lg:shadow-[0px_0px_rgba(0,0,0,0)]',
              layout.navRow,
            )}
            ref={navBarRef}
            onMouseLeave={(event: ReactMouseEvent<HTMLDivElement>) => {
              const nextTarget = event.relatedTarget;
              if (
                megaMenuRef.current &&
                nextTarget instanceof Node &&
                megaMenuRef.current.contains(nextTarget)
              ) {
                return;
              }
              scheduleMegaMenuClose();
            }}
          >
            <div
              className={cn(
                'mx-auto px-4 text-[16px] md:px-[10px] md:pt-[11px] md:pb-2',
                layout.navRowInner,
              )}
            >
              <div className="flex h-10 items-center justify-between">
                {/* Desktop Navigation */}
                <nav
                  className={cn('h-full lg:flex', layout.navPointer)}
                  aria-label="Main navigation"
                >
                  {navigationSections.map((section, index) => {
                    const menuTitle = getNodeTitle(section);
                    const sectionLink = normalizeLinkFieldWW(getNodeLink(section), locale);
                    const sectionHref = resolveLinkHrefWW(sectionLink);
                    const hasMenu = sectionHasRenderableLinks(section);

                    if (!menuTitle) return null;

                    const isHoverActive = activeMenuIndex === index;
                    const isRouteActive = activeSectionIndex === index;

                    const triggerClasses = cn(
                      'relative inline-flex h-full cursor-pointer items-center gap-1 px-0 pl-0 font-semibold no-underline transition-all duration-200',
                      'after:absolute after:right-0 after:bottom-[-3px] after:left-0 after:h-[2px] after:origin-left after:transition-all after:duration-300',
                      tone.navLink,
                      layout.navItem,
                      isHoverActive
                        ? cn(tone.navActive, 'after:scale-x-100')
                        : isRouteActive
                          ? cn(tone.navActive, 'after:scale-x-50')
                          : cn('after:scale-x-0', tone.navIdle),
                    );

                    return (
                      <div
                        key={menuTitle + index}
                        className="relative flex h-full items-center md:pb-1"
                        onMouseEnter={() => {
                          cancelMegaMenuClose();
                          setActiveMenuIndex(hasMenu ? index : null);
                        }}
                      >
                        {sectionHref ? (
                          <LinkWW field={sectionLink} className={triggerClasses}>
                            {menuTitle}
                          </LinkWW>
                        ) : (
                          <button
                            type="button"
                            className={triggerClasses}
                            onClick={() =>
                              setActiveMenuIndex((prev) => (prev === index ? null : index))
                            }
                            aria-expanded={activeMenuIndex === index}
                          >
                            {menuTitle}
                          </button>
                        )}

                        {activeMenuIndex === index && hasMenu && renderMegaMenu(index)}
                      </div>
                    );
                  })}
                </nav>

                {/* Log in & Contact stacked buttons */}
                <div
                  ref={buttonStackRef}
                  className={cn(
                    'ml-auto hidden w-auto items-center transition-all duration-200 ease-in-out lg:flex',
                    layout.buttonStack,
                    isHeroState && layout.buttonStackHero,
                    !isHeroState && layout.buttonStackReveal,
                  )}
                >
                  {renderLoginButton(layout.loginButton)}
                  {contactLink?.value?.href ? (
                    <LinkWW
                      field={contactLink}
                      data-tracking="header-contact"
                      className={layout.contactButton}
                    >
                      <span className="text-[14px]">{contactButtonText}</span>
                    </LinkWW>
                  ) : (
                    <button
                      type="button"
                      onClick={handleContactClick}
                      data-tracking="header-contact"
                      className={layout.contactButton}
                    >
                      <span className="text-[14px]">{contactButtonText}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile menu (Workwear UI) */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-x-0 top-[55px] bottom-0 z-[75] md:top-[50px] lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}
        {isMobileMenuOpen && (
          <div
            className="fixed top-[55px] right-2 z-[80] flex max-h-[calc(100dvh-71px)] w-[236px] max-w-[calc(100vw-16px)] flex-col rounded-[2px] bg-white py-[37px] pr-[34px] pl-[10px] shadow-lg motion-reduce:animate-none! md:top-[50px] lg:hidden"
            style={{ animation: 'fadeIn 0.3s ease-in-out' }}
          >
            <nav
              className="flex min-h-0 flex-col gap-[10px] overflow-y-auto text-right"
              aria-label="Mobile navigation"
              data-scroll-allow
            >
              {isMobileLanguageOpen ? (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        className="flex h-10 w-10 cursor-pointer items-center justify-center"
                        onClick={() => setIsMobileLanguageOpen(false)}
                        aria-label={backButtonText}
                      >
                        <img
                          src="/assets/icons/arrow-right-black.svg"
                          alt=""
                          className="h-5 w-5 rotate-180"
                        />
                      </button>
                      <h4 className="text-medium font-medium">{backButtonText}</h4>
                      <span className="h-10 w-10" aria-hidden="true" />
                    </div>
                    <div className="h-px w-full bg-[#ebebeb]" />
                  </div>

                  <div className="space-y-0">
                    {languages.map((lang: any, index: number) => {
                      const langName = lang?.name?.value || '';
                      const langCode = lang?.code?.value || '';
                      const isSelected = lang?.selected?.value || false;
                      const flagSvgUrl = lang?.flagSvg?.value;

                      return (
                        <button
                          key={langCode || `lang-${index}`}
                          type="button"
                          className="flex w-full cursor-pointer items-center justify-between border-b border-[#000000] py-4 text-left"
                          onClick={() => {
                            setIsMobileLanguageOpen(false);
                            setIsMobileMenuOpen(false);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-4 w-6 bg-gray-200">
                              {flagSvgUrl && !failedFlagImages.has(flagSvgUrl) ? (
                                <img
                                  src={flagSvgUrl}
                                  alt={langName}
                                  className="h-full w-full object-cover"
                                  onError={() => {
                                    if (flagSvgUrl) {
                                      setFailedFlagImages((prev) => new Set(prev).add(flagSvgUrl));
                                    }
                                  }}
                                />
                              ) : lang?.flagColor?.value ? (
                                <div
                                  className="h-full w-full"
                                  style={{ backgroundColor: lang.flagColor.value }}
                                />
                              ) : (
                                <div className="h-full w-full bg-gray-300" />
                              )}
                            </div>
                            <span className={isSelected ? 'font-bold' : 'font-normal'}>
                              {langName}
                            </span>
                          </div>
                          {isSelected && <CheckIcon size={20} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : expandedMobileMenus.length === 0 ? (
                <div
                  key="mobile-root"
                  className="flex flex-col gap-[10px]"
                  style={{
                    animation:
                      mobileMenuDir === 'back'
                        ? 'menuSlideInLeft 0.28s cubic-bezier(0.22,1,0.36,1)'
                        : 'fadeIn 0.3s ease-in-out',
                  }}
                >
                  {navigationSections.map((section, index) => {
                    const menuTitle = getNodeTitle(section);
                    const destination = normalizeLinkFieldWW(getNodeLink(section), locale);
                    const destinationHref = resolveLinkHrefWW(destination);
                    const hasMenu = getChildNodes(section).length > 0;
                    const isRouteActive = activeSectionIndex === index;

                    if (!menuTitle) return null;

                    return (
                      <div key={menuTitle + index}>
                        <div className="py-0">
                          {hasMenu ? (
                            <button
                              type="button"
                              className={cn(
                                'group relative flex w-full cursor-pointer items-center justify-end text-right text-[14px] leading-4 font-semibold',
                                isRouteActive && 'text-[#eb0045]',
                              )}
                              onClick={() => toggleMobileSubmenu(index)}
                              aria-expanded={expandedMobileMenus.includes(index)}
                            >
                              <span
                                className={cn(
                                  'relative inline-block',
                                  isRouteActive &&
                                    'before:absolute before:right-0 before:bottom-[-3px] before:left-0 before:h-[2px] before:bg-[#eb0045]',
                                )}
                              >
                                {menuTitle}
                              </span>
                            </button>
                          ) : destinationHref ? (
                            <LinkWW
                              field={destination}
                              className={cn(
                                'group relative block text-right text-[14px] leading-4 font-semibold no-underline',
                                isRouteActive && 'text-[#eb0045]',
                              )}
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              <span
                                className={cn(
                                  'relative inline-block',
                                  isRouteActive &&
                                    'before:absolute before:right-0 before:bottom-[-3px] before:left-0 before:h-[2px] before:bg-[#eb0045]',
                                )}
                              >
                                {menuTitle}
                              </span>
                            </LinkWW>
                          ) : (
                            <span
                              className={cn(
                                'group relative block text-right text-[14px] leading-4 font-semibold',
                                isRouteActive && 'text-[#eb0045]',
                              )}
                            >
                              <span
                                className={cn(
                                  'relative inline-block',
                                  isRouteActive &&
                                    'before:absolute before:right-0 before:bottom-[-3px] before:left-0 before:h-[2px] before:bg-[#eb0045]',
                                )}
                              >
                                {menuTitle}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>
                  {expandedMobileMenus.map((menuIndex) => {
                    const section = navigationSections[menuIndex];
                    const menuTitle = getNodeTitle(section);
                    const destination = normalizeLinkFieldWW(getNodeLink(section), locale);
                    const destinationHref = resolveLinkHrefWW(destination);
                    const primaryItems = getChildNodes(section);

                    if (!section) return null;

                    return (
                      <div
                        key={`mobile-section-${menuIndex}`}
                        className="space-y-[10px]"
                        style={{ animation: 'menuSlideInRight 0.28s cubic-bezier(0.22,1,0.36,1)' }}
                        data-nav-menu
                        data-nav-parent={menuTitle}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              className="flex h-5 w-5 cursor-pointer items-center justify-center"
                              onClick={() => {
                                setMobileMenuDir('back');
                                setExpandedMobileMenus([]);
                              }}
                              aria-label={backToNavigationAriaLabel}
                              title={backButtonText}
                            >
                              <img
                                src="/assets/icons/arrow-right-black.svg"
                                alt=""
                                className="h-5 w-5 rotate-180"
                              />
                            </button>
                            <span className="text-right text-[14px] leading-4 font-semibold">
                              {menuTitle}
                            </span>
                          </div>
                          <div className="mt-[10px] h-px w-full bg-black" />
                        </div>

                        <div className="space-y-1">
                          {menuTitle && destinationHref && (
                            <LinkWW
                              field={destination}
                              className={cn(
                                'block text-right text-[11px] leading-[14px] font-normal no-underline hover:text-[#eb0045]',
                                isUrlActiveWW(destinationHref, router?.asPath, locale) &&
                                  'text-[#eb0045]',
                              )}
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              <span>{menuTitle}</span>
                            </LinkWW>
                          )}

                          {primaryItems.map((primaryItem, primaryIndex) => {
                            const primaryTitle = getNodeTitle(primaryItem);
                            const primaryLink = normalizeLinkFieldWW(
                              getNodeLink(primaryItem),
                              locale,
                            );
                            const primaryHref = resolveLinkHrefWW(primaryLink);
                            const childLinks = getChildNodes(primaryItem);

                            if (!primaryTitle && !childLinks.length) {
                              return null;
                            }

                            return (
                              <div key={`primary-${primaryIndex}`} className="space-y-1">
                                {primaryHref && (
                                  <LinkWW
                                    field={primaryLink}
                                    className={cn(
                                      'flex items-center justify-end gap-1 text-[11px] leading-[14px] font-normal no-underline hover:text-[#eb0045]',
                                      isUrlActiveWW(primaryHref, router?.asPath, locale) &&
                                        'text-[#eb0045]',
                                    )}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                  >
                                    <span>{primaryLink?.value?.text || primaryTitle}</span>
                                  </LinkWW>
                                )}
                                {!primaryHref && primaryTitle && (
                                  <span className="block text-[11px] leading-[14px] font-normal">
                                    {primaryTitle}
                                  </span>
                                )}

                                <div className="flex flex-col gap-1">
                                  {childLinks.map((childLink, childIndex) => {
                                    const nestedLink = normalizeLinkFieldWW(
                                      getNodeLink(childLink),
                                      locale,
                                    );
                                    const nestedHref = resolveLinkHrefWW(nestedLink);
                                    if (!nestedHref) return null;

                                    const isActive = isUrlActiveWW(
                                      nestedHref,
                                      router?.asPath,
                                      locale,
                                    );

                                    return (
                                      <LinkWW
                                        key={`child-${primaryIndex}-${childIndex}`}
                                        field={nestedLink}
                                        className={cn(
                                          'block text-right text-[11px] leading-[14px] no-underline hover:text-[#eb0045]',
                                          isActive && 'text-[#eb0045]',
                                        )}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                      >
                                        {nestedLink?.value?.text ||
                                          getNodeTitle(childLink) ||
                                          nestedHref}
                                      </LinkWW>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}

                          {sectionHasFeaturedNews(section) && (
                            <div className="mt-4 pb-4">
                              <MegaMenuFeaturedNewsWW section={section} locale={locale} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {/* Mobile utility links */}
              {!isMobileLanguageOpen && expandedMobileMenus.length === 0 && (
                <div className="mt-[9px] border-t border-black pt-[19px] [&_[data-component=TopHeaderWW]]:items-end [&_[data-component=TopHeaderWW]]:gap-1 [&_[data-component=TopHeaderWW]_a]:justify-end [&_[data-component=TopHeaderWW]_a]:py-0 [&_[data-component=TopHeaderWW]_a]:text-[11px] [&_[data-component=TopHeaderWW]_a]:leading-[14px]">
                  <Placeholder name={topHeaderPlaceholderName} rendering={props.rendering} />
                </div>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Spacer to prevent content from hiding behind fixed header */}
      <div
        className={cn(isTransparentPage ? 'h-0' : getHeaderWWSpacer(false))}
        style={isTransparentPage ? undefined : { height: 'var(--header-offset)' }}
        aria-hidden="true"
      />
    </>
  );
};

export const Default: React.FC<HeaderWWProps> = (props) => {
  return <HeaderWWContent {...props} />;
};

export default Default;
