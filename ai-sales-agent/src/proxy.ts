import { NextFetchEvent, NextResponse, type NextRequest } from 'next/server';
import {
  defineProxy,
  MultisiteProxy,
  PersonalizeProxy,
  RedirectsProxy,
  BotTrackingProxy,
  PreviewProxy,
} from '@sitecore-content-sdk/nextjs/proxy';
import sites from '.sitecore/sites.json';
import scConfig from 'sitecore.config';
import client from 'lib/sitecore-client';

// ----------------------------------------------------
// GEO LOCALE CONFIGURATION
// ----------------------------------------------------
const SUPPORTED_LOCALES = ['en', 'de-DE', 'sv-SE', 'en-IE', 'hr-HR'];
const FALLBACK_LOCALE = 'en';
const COOKIE_NAME = 'NEXT_LOCALE';
const COUNTRY_LOCALE_MAP: Record<string, string> = {
  DE: 'de-DE',
  SE: 'sv-SE',
  IE: 'en-IE',
  HR: 'hr-HR',
};

export default function proxy(req: NextRequest, event: NextFetchEvent) {
  const { pathname } = req.nextUrl;

  // ----------------------------------------------------
  // GEO LOCALE REDIRECT LOGIC
  // ----------------------------------------------------
  if (req.nextUrl.locale === 'default') {
    const isEditing =
      req.nextUrl.searchParams.has('sc_mode') ||
      req.nextUrl.searchParams.has('sc_site') ||
      req.nextUrl.searchParams.has('sc_lang') ||
      req.cookies.has('__prerender_bypass') ||
      req.cookies.has('__next_preview_data');

    const isDebug = process.env.GEO_LOCALE_DEBUG === 'true';

    if (isEditing) {
      if (isDebug) {
        console.log(`[GeoLocale]
        pathname: ${pathname}
        country: ${req.headers.get('x-vercel-ip-country') || 'Unknown'}
        urlLocale: none
        cookieLocale: ${req.cookies.get(COOKIE_NAME)?.value || 'none'}
        selectedLocale: default
        reason: sitecore-editing-mode
        action: bypass`);
      }
      // Continue without redirect to not break Experience Editor / Preview
    } else {
      const cookieLocale = req.cookies.get(COOKIE_NAME)?.value;
      const detectedCountry = req.headers.get('x-vercel-ip-country') || 'Unknown';

      let targetLocale = FALLBACK_LOCALE;
      let reason = 'fallback';

      if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)) {
        targetLocale = cookieLocale;
        reason = 'language-cookie';
      } else if (COUNTRY_LOCALE_MAP[detectedCountry]) {
        targetLocale = COUNTRY_LOCALE_MAP[detectedCountry];
        reason = 'country-detection';
      }

      const url = req.nextUrl.clone();
      url.pathname = pathname === '/' ? `/${targetLocale}` : `/${targetLocale}${pathname}`;

      if (isDebug) {
        console.log(`[GeoLocale]
        pathname: ${pathname}
        country: ${detectedCountry}
        urlLocale: none
        cookieLocale: ${cookieLocale || 'none'}
        selectedLocale: ${targetLocale}
        reason: ${reason}
        action: redirect
        destination: ${url.pathname}${url.search}`);
      }

      return NextResponse.redirect(url, 307);
    }
  } else {
    // Explicit locale already in URL
    if (process.env.GEO_LOCALE_DEBUG === 'true') {
      console.log(`[GeoLocale]
      pathname: ${pathname}
      country: ${req.headers.get('x-vercel-ip-country') || 'Unknown'}
      urlLocale: ${req.nextUrl.locale}
      cookieLocale: ${req.cookies.get(COOKIE_NAME)?.value || 'none'}
      selectedLocale: ${req.nextUrl.locale}
      reason: explicit-url-locale
      action: bypass`);
    }
  }

  // PreviewProxy authorizes preview requests
  const preview = new PreviewProxy({
    client: client,
    ...scConfig.api.edge,
  });

  // BotTrackingProxy will detect and track bots before any other proxies run
  const botTracking = new BotTrackingProxy({
    ...scConfig.api.edge,
    sites,
    fetchEvent: event,
  });

  // Instantiate proxies - they will use Edge config if available, otherwise fall back to local config
  // Each proxy will skip processing if required API configuration is not available
  const multisite = new MultisiteProxy({
    /**
     * List of sites for site resolver to work with
     */
    sites,
    ...scConfig.api.edge,
    ...scConfig.multisite,
    // This function determines if the proxy should be turned off on per-request basis.
    // Certain paths are ignored by default (e.g. files and Next.js API routes), but you may wish to disable more.
    // This is an important performance consideration since Next.js Edge proxy runs on every request.
    skip: () => false,
  });

  const redirects = new RedirectsProxy({
    /**
     * List of sites for site resolver to work with
     */
    sites,
    ...scConfig.api.edge,
    ...scConfig.api.local,
    ...scConfig.redirects,
    // This function determines if the proxy should be turned off on per-request basis.
    // Certain paths are ignored by default (e.g. Next.js API routes), but you may wish to disable more.
    // By default it is disabled while in development mode.
    // This is an important performance consideration since Next.js Edge proxy runs on every request.
    skip: () => false,
  });

  const personalize = new PersonalizeProxy({
    /**
     * List of sites for site resolver to work with
     */
    sites,
    ...scConfig.api.edge,
    ...scConfig.personalize,
    // This function determines if the proxy should be turned off on per-request basis.
    // Certain paths are ignored by default (e.g. Next.js API routes), but you may wish to disable more.
    // By default it is disabled while in development mode.
    // This is an important performance consideration since Next.js Edge proxy runs on every request
    skip: () => false,
  });

  return defineProxy(preview, botTracking, multisite, redirects, personalize).exec(req);
}

export const config = {
  /*
   * Match all paths except for:
   * 1. /api routes
   * 2. /_next (Next.js internals)
   * 3. /sitecore/api (Sitecore API routes)
   * 4. /- (Sitecore media)
   * 5. /healthz (Health check)
   * 6. /proxy-media (Proxied media)
   * 7. /feaas-render (FEAAS rendering)
   * 8. /robots.txt, /sitemap*.xml, /llms.txt
   * 9. Static files with extensions in /public (e.g. .ico, .svg, .png, etc.)
   */
  matcher: [
    '/',
    '/((?!api/|_next/|healthz|sitecore/api/|-/|proxy-media/|feaas-render|robots\\.txt|sitemap|llms\\.txt|favicon\\.ico|sc_logo\\.svg|.*\\.[\\w]+$).*)',
  ],
};
