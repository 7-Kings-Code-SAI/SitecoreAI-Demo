import { JSX } from 'react';
import type { AppProps } from 'next/app';
import { I18nProvider } from 'next-localization';
import Bootstrap from 'src/Bootstrap';
import { SitecorePageProps } from '@sitecore-content-sdk/nextjs';
import scConfig from 'sitecore.config';
import { useGlobalLinkNormalizer } from 'src/lib/useLinkNormalizer';
import 'src/styles/global.css';

function App({ Component, pageProps }: AppProps<SitecorePageProps>): JSX.Element {
  const { dictionary, ...rest } = pageProps;

  // Globally normalize all internal links on render, dynamic load, and hover
  useGlobalLinkNormalizer(pageProps.page?.locale || scConfig.defaultLanguage);

  return (
    <>
      <Bootstrap {...pageProps} />
      {/*
        // Use the next-localization (w/ rosetta) library to provide our translation dictionary to the app.
        // Note Next.js does not (currently) provide anything for translation, only i18n routing.
        // If your app is not multilingual, next-localization and references to it can be removed.
      */}
      <I18nProvider
        lngDict={dictionary}
        locale={pageProps.page?.locale || scConfig.defaultLanguage}
      >
        <Component {...rest} />
      </I18nProvider>
    </>
  );
}

export default App;
