import { useEffect } from 'react';
import { useRouter } from 'next/router';

const EXCLUDED_PREFIXES = [
  '/api/',
  '/_next/',
  '/healthz',
  '/feaas-render',
  '/proxy-media/',
  '/sitecore/',
  '/-/',
  '/robots.txt',
  '/llms.txt',
  '/sitemap',
];

const EXCLUDED_EXTENSIONS = /\.(png|jpe?g|gif|svg|ico|webp|pdf|mp4|webm|zip|css|js|json|xml|txt)$/i;

/**
 * Checks if an href is a placeholder link (e.g. '#', '/#', empty, or dangling hash without target).
 */
export function isPlaceholderHref(href: string | null | undefined): boolean {
  if (!href) return true;
  const trimmed = href.trim();
  if (
    trimmed === '' ||
    trimmed === '#' ||
    trimmed === '/#' ||
    trimmed === 'javascript:;' ||
    trimmed.startsWith('javascript:void') ||
    (trimmed.includes('#') && trimmed.split('#')[1] === '')
  ) {
    return true;
  }
  return false;
}

/**
 * Normalizes an href to include the target language prefix (e.g. /en/...) if no language code is present.
 */
export function normalizeHref(
  rawHref: string | null | undefined,
  currentLocale: string = 'en'
): string | null {
  if (!rawHref) return null;
  const trimmed = rawHref.trim();

  if (
    isPlaceholderHref(trimmed) ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('data:')
  ) {
    return null;
  }

  let pathname = trimmed;
  let prefixOrigin = '';

  // If full URL, verify if it belongs to the current host/origin
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      if (typeof window !== 'undefined' && url.host !== window.location.host) {
        // External link
        return null;
      }
      prefixOrigin = url.origin;
      pathname = url.pathname + url.search + url.hash;
    } catch {
      return null;
    }
  }

  if (!pathname.startsWith('/')) {
    return null;
  }

  // Check excluded paths
  for (const excluded of EXCLUDED_PREFIXES) {
    if (pathname.startsWith(excluded) || pathname === excluded) {
      return null;
    }
  }

  // Check file extensions (images, pdfs, assets)
  const pathWithoutQuery = pathname.split('?')[0].split('#')[0];
  if (EXCLUDED_EXTENSIONS.test(pathWithoutQuery)) {
    return null;
  }

  const segments = pathWithoutQuery.split('/').filter(Boolean);
  const firstSegment = segments[0]?.toLowerCase();

  // Already prefixed with a locale code (e.g. /en, /sv-se, /de-de, /fr-fr, etc.)
  if (firstSegment && /^[a-z]{2}(-[a-z]{2,4})?$/i.test(firstSegment)) {
    return null;
  }

  // Determine active locale to prepend (defaults to 'en')
  const localeToPrepend = currentLocale && currentLocale !== 'default' ? currentLocale : 'en';

  // Convert '/' to '/en' (or active locale)
  if (pathname === '/' || pathname === '') {
    return `${prefixOrigin}/${localeToPrepend}`;
  }

  return `${prefixOrigin}/${localeToPrepend}${pathname}`;
}

/**
 * Global hook to ensure all internal links (including RichText HTML) have the language prefix on render and hover,
 * and ensure placeholder '#' links are treated as dummy buttons without appending '#' to the URL.
 */
export function useGlobalLinkNormalizer(locale?: string) {
  const router = useRouter();

  useEffect(() => {
    const activeLocale =
      (locale && locale !== 'default' ? locale : null) ||
      (router.locale && router.locale !== 'default' ? router.locale : null) ||
      'en';

    const processLink = (link: Element) => {
      if (!(link instanceof HTMLAnchorElement)) return;
      const rawHref = link.getAttribute('href');
      const resolvedHref = link.href;

      // If link is set to '#' or placeholder without an anchor target, neutralize it
      if (isPlaceholderHref(rawHref) || (rawHref && isPlaceholderHref(resolvedHref))) {
        link.removeAttribute('href');
        link.setAttribute('role', 'button');
        link.style.cursor = 'pointer';
        link.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
        };
        return;
      }

      if (rawHref === null) return;
      const trimmed = rawHref.trim();

      // If it is a real anchor link with an anchor target (e.g. '#pricing', '#features')
      if (trimmed.startsWith('#') && trimmed.length > 1) {
        return; // Leave as real anchor
      }

      const normalized = normalizeHref(rawHref, activeLocale);
      if (normalized && normalized !== rawHref) {
        link.setAttribute('href', normalized);
      }
    };

    const processAllLinks = (container: Document | Element = document) => {
      try {
        const links = container.querySelectorAll('a');
        links.forEach((l) => processLink(l));
      } catch {
        // Ignore errors during detached node queries
      }
    };

    // 1. Initial scan on mount & shortly after hydration
    processAllLinks();
    const frameId = requestAnimationFrame(() => processAllLinks());
    const timerId = setTimeout(() => processAllLinks(), 100);

    // 2. Observe DOM mutations for dynamically inserted elements / RichText
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node as Element;
              if (el.tagName === 'A') {
                processLink(el);
              }
              processAllLinks(el);
            }
          });
        } else if (mutation.type === 'attributes' && mutation.attributeName === 'href') {
          const el = mutation.target as Element;
          if (el.tagName === 'A') {
            processLink(el);
          }
        }
      }
    });

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['href'],
      });
    }

    // 3. Hover / Focus / Touch event listener in capture mode
    const handleEvent = (e: Event) => {
      const path = e.composedPath ? e.composedPath() : [];
      for (const item of path) {
        if (item instanceof HTMLAnchorElement) {
          processLink(item);
          break;
        }
      }
      if (e.target instanceof Element) {
        const link = e.target.closest('a');
        if (link) {
          processLink(link);
        }
      }
    };

    // 4. Capture-phase click listener to strictly prevent '#' navigation and URL appending
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const link = target?.closest('a');
      if (!link) return;
      const rawHref = link.getAttribute('href');
      const resolvedHref = link.href;
      if (isPlaceholderHref(rawHref) || (rawHref && isPlaceholderHref(resolvedHref))) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };

    window.addEventListener('mouseover', handleEvent, { capture: true, passive: true });
    window.addEventListener('mouseenter', handleEvent, { capture: true, passive: true });
    window.addEventListener('focusin', handleEvent, { capture: true, passive: true });
    window.addEventListener('touchstart', handleEvent, { capture: true, passive: true });
    window.addEventListener('click', handleClick, { capture: true });

    // 5. Hook into Next.js router events
    const handleRouteChange = () => {
      setTimeout(() => processAllLinks(), 50);
    };
    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timerId);
      observer.disconnect();
      window.removeEventListener('mouseover', handleEvent, { capture: true });
      window.removeEventListener('mouseenter', handleEvent, { capture: true });
      window.removeEventListener('focusin', handleEvent, { capture: true });
      window.removeEventListener('touchstart', handleEvent, { capture: true });
      window.removeEventListener('click', handleClick, { capture: true });
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [locale, router.asPath, router.locale]);
}
