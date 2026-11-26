'use client';

import {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { useRouter } from 'next/router';
import {
  ComponentPropsReactContext,
  Placeholder,
  Text as SitecoreText,
  useComponentProps,
  useSitecore,
  type Field,
} from '@sitecore-content-sdk/nextjs';
import { useI18n } from 'next-localization';
import HeaderLogoWW, { type HeaderLogoWWProps } from '../HeaderLogoWW/HeaderLogoWW';
import { HeaderMenuGroupViewWW } from '../HeaderMenuGroupWW/HeaderMenuGroupWW';
import { HeaderWWNavContext } from '../HeaderMenuWW/HeaderMenuWW';
import type { HeaderLanguageWW, HeaderWWDatasource, HeaderWWProps } from './HeaderWW.props';
import {
  getHeaderWWSpacer,
  getHeaderWWTone,
  headerWWLayout,
} from 'src/lib/ww/HeaderWW.styles';
import {
  getPlaceholderItems,
  isHeaderWWTransparentPage,
  placeholderHasItems,
  resolveHeaderPlaceholderName,
} from 'src/lib/ww/HeaderWW.utils';
import {
  extractLinkFieldWW,
  extractTextFieldWW,
  extractTextValueWW,
  newsHasContentWW,
  resolveHeaderSectionsWW,
  sectionHasActiveLinkWW,
  sectionHasRenderableLinksWW,
  type NormalizedHeaderSectionWW,
} from 'src/lib/ww/header-ww-data';
import { LinkWW } from 'src/lib/ww/LinkWW';
import { MegaMenuFeaturedNewsWW } from 'src/lib/ww/MegaMenuFeaturedNewsWW';
import { CheckIcon } from 'src/lib/ww/icons';
import {
  cn,
  isUrlActiveWW,
  normalizeLinkFieldWW,
  resolveLinkHrefWW,
  useLocaleWW,
} from 'src/lib/ww/utils';
import styles from './HeaderWW.module.css';

const HeaderWWContent: React.FC<HeaderWWProps> = (props) => {
  const { fields, rendering, params } = props;
  const { page } = useSitecore();
  const router = useRouter();
  const locale = useLocaleWW();
  const i18n = useI18n();
  const allComponentProps = useContext(ComponentPropsReactContext);

  const translateOrFallback = (key: string, fallback: string): string => {
    try {
      const value = i18n?.t?.(key);
      return value && value !== key ? value : fallback;
    } catch {
      return fallback;
    }
  };

  const isPageEditing = Boolean(page?.mode?.isEditing);
  const isTransparentPage = isHeaderWWTransparentPage(
    (page as { layout?: { sitecore?: { route?: unknown } } } | undefined)?.layout?.sitecore
      ?.route,
  );

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileMenuDir, setMobileMenuDir] = useState<'forward' | 'back'>('forward');
  const [activeMenuIndex, setActiveMenuIndex] = useState<number | null>(null);
  const [editingActiveMenuUid, setEditingActiveMenuUid] = useState<string | null>(null);
  const [expandedMobileMenus, setExpandedMobileMenus] = useState<number[]>([]);
  const [isSticky, setIsSticky] = useState(false);
  const [hasScrolledFromHero, setHasScrolledFromHero] = useState(false);
  const [isHeroSolid, setIsHeroSolid] = useState(false);
  const [isMobileLanguageOpen, setIsMobileLanguageOpen] = useState(false);
  const [failedFlagImages, setFailedFlagImages] = useState<Set<string>>(new Set());

  const megaMenuRef = useRef<HTMLDivElement>(null);
  const navBarRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const topBarRef = useRef<HTMLDivElement>(null);
  const buttonStackRef = useRef<HTMLDivElement>(null);
  const megaMenuCloseTimerRef = useRef<number | null>(null);

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
  const dynamicPlaceholderId =
    params?.DynamicPlaceholderId ?? rendering?.params?.DynamicPlaceholderId;

  const headerLogoPlaceholderName = resolveHeaderPlaceholderName(
    renderingPlaceholders,
    ['header-logo-ww', 'header-logo'],
    dynamicPlaceholderId,
  );
  const topHeaderPlaceholderName = resolveHeaderPlaceholderName(
    renderingPlaceholders,
    ['top-header-ww', 'top-header'],
    dynamicPlaceholderId,
  );
  const headerNavPlaceholderName = resolveHeaderPlaceholderName(
    renderingPlaceholders,
    ['header-nav-ww', 'header-nav'],
    dynamicPlaceholderId,
  );

  const hasTopHeaderPlaceholder = placeholderHasItems(renderingPlaceholders, [
    'top-header-ww',
    'top-header',
  ]);
  const hasHeaderLogoPlaceholder = placeholderHasItems(renderingPlaceholders, [
    'header-logo-ww',
    'header-logo',
  ]);

  const datasource = (fields?.data?.datasource ?? fields?.datasource ?? fields) as
    | HeaderWWDatasource
    | undefined;

  const navigationSections = useMemo(
    () => resolveHeaderSectionsWW(renderingPlaceholders, fields, allComponentProps),
    [renderingPlaceholders, fields, allComponentProps],
  );

  const activeSectionIndex = useMemo(() => {
    const idx = navigationSections.findIndex((section) =>
      sectionHasActiveLinkWW(section, router?.asPath, locale),
    );
    return idx >= 0 ? idx : null;
  }, [navigationSections, router?.asPath, locale]);

  const languages: HeaderLanguageWW[] = Array.isArray(datasource?.languages)
    ? datasource.languages
    : (datasource?.languages?.results ?? []);

  const contactLabelField = extractTextFieldWW(
    datasource?.ContactLabel ?? datasource?.contactButtonText,
  );
  const contactButtonText =
    extractTextValueWW(datasource?.ContactLabel) ||
    extractTextValueWW(datasource?.contactButtonText) ||
    translateOrFallback('header-contactButton-label', 'Contact');
  const backButtonText = extractTextValueWW(datasource?.backButtonText) || 'Back';
  const closeMenuAriaLabel = extractTextValueWW(datasource?.closeMenuAriaLabel) || 'Close menu';
  const openMenuAriaLabel = extractTextValueWW(datasource?.openMenuAriaLabel) || 'Open menu';
  const backToNavigationAriaLabel =
    extractTextValueWW(datasource?.backToNavigationAriaLabel) || 'Back to main navigation';

  const hasNavigation = navigationSections.length > 0;
  const hasDesktopNavigation = navigationSections.some((section) =>
    Boolean(section.title || section.link?.value?.text),
  );
  const showMainNavigationBar = isPageEditing || hasDesktopNavigation;
  const desktopHeaderOffset = showMainNavigationBar ? 106 : 52;

  const headerLogoRendering = getPlaceholderItems(renderingPlaceholders, [
    'header-logo-ww',
    'header-logo',
  ]).find(
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
    !isTransparentPage ||
    isHeroSolid ||
    isMobileMenuOpen ||
    activeMenuIndex !== null ||
    editingActiveMenuUid !== null;

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
  const loginLink = normalizeLinkFieldWW(extractLinkFieldWW(rawLoginLink), locale);
  const loginText =
    loginLink?.value?.text || translateOrFallback('header-loginButton-label', 'Log in');

  const rawContactLink =
    datasource?.ContactLink ??
    datasource?.contactLink ??
    fields?.ContactLink ??
    fields?.contactLink;
  const contactLink = normalizeLinkFieldWW(extractLinkFieldWW(rawContactLink), locale);

  const renderLoginButton = (className: string, onClick?: () => void) =>
    loginLink?.value?.href || (isPageEditing && loginLink) ? (
      <LinkWW field={loginLink} className={className} onClick={onClick} data-tracking="header-login">
        {isPageEditing ? undefined : loginText}
      </LinkWW>
    ) : null;

  const handleContactClick = () => {
    if (isPageEditing) return;
    const contactTarget = document.querySelector('#contact, [data-component="FooterWW"], footer');
    contactTarget?.scrollIntoView({ behavior: 'smooth' });
  };

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
        setEditingActiveMenuUid(null);
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

  const renderMegaMenu = (section: NormalizedHeaderSectionWW, index: number) => {
    if (!section || section.groups.length === 0) return null;
    if (!sectionHasRenderableLinksWW(section, locale)) return null;

    const showFeaturedNews = newsHasContentWW(section.news, locale);

    return (
      <div
        ref={megaMenuRef}
        data-nav-menu
        data-nav-parent={section.title}
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
                {section.groups.map((group, categoryIndex) => (
                  <HeaderMenuGroupViewWW
                    key={group.uid || `${group.title}-${categoryIndex}`}
                    group={group}
                    locale={locale}
                    asPath={router?.asPath}
                    onNavigate={() => setActiveMenuIndex(null)}
                  />
                ))}
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

      {(activeMenuIndex !== null || editingActiveMenuUid !== null) && (
        <div
          className="fixed top-[var(--header-offset,108px)] right-0 bottom-0 left-0 z-40 bg-black/50"
          onClick={() => {
            setActiveMenuIndex(null);
            setEditingActiveMenuUid(null);
          }}
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
                    rendering={headerLogoRendering as HeaderWWProps['rendering']}
                    params={{ ...(headerLogoRendering.params ?? {}), InHeader: '1' }}
                    fields={
                      (headerLogoComponentProps?.fields as HeaderLogoWWProps['fields']) ??
                      (headerLogoRendering.fields as HeaderLogoWWProps['fields'])
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
            onMouseLeave={
              !isPageEditing
                ? (event: ReactMouseEvent<HTMLDivElement>) => {
                    const nextTarget = event.relatedTarget;
                    if (
                      megaMenuRef.current &&
                      nextTarget instanceof Node &&
                      megaMenuRef.current.contains(nextTarget)
                    ) {
                      return;
                    }
                    scheduleMegaMenuClose();
                  }
                : undefined
            }
          >
            <div
              className={cn(
                'mx-auto px-4 text-[16px] md:px-[10px] md:pt-[11px] md:pb-2',
                layout.navRowInner,
              )}
            >
              <div className="flex h-10 items-center justify-between">
                {/* Desktop Navigation */}
                {isPageEditing ? (
                  <HeaderWWNavContext.Provider
                    value={{
                      isSolidHeader,
                      activeMenuUid: editingActiveMenuUid,
                      setActiveMenuUid: setEditingActiveMenuUid,
                    }}
                  >
                    <nav
                      className={cn('h-full lg:flex', layout.navPointer)}
                      aria-label="Main navigation"
                    >
                      <Placeholder name={headerNavPlaceholderName} rendering={props.rendering} />
                    </nav>
                  </HeaderWWNavContext.Provider>
                ) : (
                  <nav
                    className={cn('h-full lg:flex', layout.navPointer)}
                    aria-label="Main navigation"
                  >
                    {navigationSections.map((section, index) => {
                      const menuTitle = section.title;
                      const sectionLink = normalizeLinkFieldWW(section.link, locale);
                      const sectionHref = resolveLinkHrefWW(sectionLink);
                      const hasMenu = sectionHasRenderableLinksWW(section, locale);

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
                          key={section.uid || `${menuTitle}-${index}`}
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

                          {activeMenuIndex === index && hasMenu && renderMegaMenu(section, index)}
                        </div>
                      );
                    })}
                  </nav>
                )}

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
                  {contactLink?.value?.href || (isPageEditing && contactLink) ? (
                    <LinkWW
                      field={contactLink}
                      data-tracking="header-contact"
                      className={layout.contactButton}
                    >
                      <span className="text-[14px]">
                        {isPageEditing && contactLabelField ? (
                          <SitecoreText field={contactLabelField as Field<string>} />
                        ) : (
                          contactButtonText
                        )}
                      </span>
                    </LinkWW>
                  ) : (
                    <button
                      type="button"
                      onClick={handleContactClick}
                      data-tracking="header-contact"
                      className={layout.contactButton}
                    >
                      <span className="text-[14px]">
                        {isPageEditing && contactLabelField ? (
                          <SitecoreText field={contactLabelField as Field<string>} />
                        ) : (
                          contactButtonText
                        )}
                      </span>
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
                    {languages.map((lang, index) => {
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
                    const menuTitle = section.title;
                    const destination = normalizeLinkFieldWW(section.link, locale);
                    const destinationHref = resolveLinkHrefWW(destination);
                    const hasMenu = section.groups.length > 0;
                    const isRouteActive = activeSectionIndex === index;

                    if (!menuTitle) return null;

                    return (
                      <div key={section.uid || `${menuTitle}-${index}`}>
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
                    if (!section) return null;

                    const menuTitle = section.title;
                    const destination = normalizeLinkFieldWW(section.link, locale);
                    const destinationHref = resolveLinkHrefWW(destination);

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

                          {section.groups.map((group, primaryIndex) => {
                            const primaryLink = normalizeLinkFieldWW(group.link, locale);
                            const primaryHref = resolveLinkHrefWW(primaryLink);

                            if (!group.title && group.links.length === 0) {
                              return null;
                            }

                            return (
                              <div key={group.uid || `primary-${primaryIndex}`} className="space-y-1">
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
                                    <span>{primaryLink?.value?.text || group.title}</span>
                                  </LinkWW>
                                )}
                                {!primaryHref && group.title && (
                                  <span className="block text-[11px] leading-[14px] font-normal">
                                    {group.title}
                                  </span>
                                )}

                                <div className="flex flex-col gap-1">
                                  {group.links.map((childItem, childIndex) => {
                                    const nestedLink = normalizeLinkFieldWW(childItem.link, locale);
                                    const nestedHref = resolveLinkHrefWW(nestedLink);
                                    if (!nestedHref) return null;

                                    const isActive = isUrlActiveWW(
                                      nestedHref,
                                      router?.asPath,
                                      locale,
                                    );

                                    return (
                                      <LinkWW
                                        key={childItem.id || `child-${primaryIndex}-${childIndex}`}
                                        field={nestedLink}
                                        className={cn(
                                          'block text-right text-[11px] leading-[14px] no-underline hover:text-[#eb0045]',
                                          isActive && 'text-[#eb0045]',
                                        )}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                      >
                                        {childItem.title || nestedHref}
                                      </LinkWW>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}

                          {newsHasContentWW(section.news, locale) && (
                            <div className="mt-4 pb-4">
                              <MegaMenuFeaturedNewsWW news={section.news} locale={locale} />
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
