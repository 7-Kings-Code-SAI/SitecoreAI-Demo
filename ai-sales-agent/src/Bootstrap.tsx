import { useEffect, JSX } from 'react';
import { SitecorePageProps, initContentSdk } from '@sitecore-content-sdk/nextjs';
import config from 'sitecore.config';
import { eventsPlugin } from '@sitecore-content-sdk/events';
import { analyticsBrowserAdapter, analyticsPlugin } from '@sitecore-content-sdk/analytics-core';

/**
 * The Bootstrap component is the entry point for performing any initialization logic
 * that needs to happen early in the application's lifecycle.
 * @param props
 */
const Bootstrap = (props: SitecorePageProps): JSX.Element | null => {
  const { page } = props;

  useEffect(() => {
    if (!page) {
      return;
    }

    // Suppress unhandled promise rejections from edge tracking (e.g. IE-002) in dev or headless environments
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reasonStr = String(event?.reason?.message || event?.reason || '');
      if (
        reasonStr.includes('IE-002') ||
        reasonStr.includes('initContentSdk') ||
        reasonStr.includes('SDK not initialized')
      ) {
        event.preventDefault();
        console.warn('Content SDK tracking suppressed:', reasonStr);
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    const contextId =
      config.api.edge?.clientContextId ||
      process.env.NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID ||
      'dev-context-id';

    const edgeUrl = config.api.edge?.edgeUrl;
    const siteName = page.siteName || config.defaultSite || 'default';

    // Initialize Content SDK so that form focus/submit events have coreContext initialized
    try {
      void initContentSdk({
        config: {
          contextId,
          edgeUrl,
          siteName,
        },
        plugins: [
          analyticsPlugin({
            options: {
              enableCookie: true,
              cookieDomain: window.location.hostname.replace(/^www\./, ''),
            },
            adapter: analyticsBrowserAdapter(),
          }),
          eventsPlugin(),
        ],
      }).catch((err) => {
        console.debug('Content SDK init notice:', err);
      });
    } catch (e) {
      console.debug('Content SDK init error:', e);
    }

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [page?.siteName]);

  return null;
};

export default Bootstrap;
