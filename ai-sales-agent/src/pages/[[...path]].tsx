import { useEffect, JSX } from 'react';
import { GetServerSideProps } from 'next';
import NotFound from 'src/NotFound';
import Layout from 'src/Layout';
import {
  SitecorePageProps,
  } from '@sitecore-content-sdk/nextjs';
import { extractPath, handleEditorFastRefresh } from '@sitecore-content-sdk/nextjs/utils';
import { isDesignLibraryPreviewData } from '@sitecore-content-sdk/nextjs/editing';
import components from '.sitecore/component-map';
import client from 'lib/sitecore-client';
import Providers from 'src/Providers';
import scConfig from 'sitecore.config';

const SitecorePage = ({ page, notFound, componentProps }: SitecorePageProps): JSX.Element => {
  useEffect(() => {
    // Since Sitecore Editor does not support Fast Refresh, need to refresh editor chromes after Fast Refresh finished
    handleEditorFastRefresh();
  }, []);

  if (notFound || !page) {
    // Shouldn't hit this (as long as 'notFound' is being returned below), but just to be safe
    return <NotFound />;
  }

  return (
    <Providers componentProps={componentProps} page={page}>
      <Layout page={page} />
    </Providers>
  );
};

// This function gets called at request time on server-side.
export const getServerSideProps: GetServerSideProps = async (context) => {
  let props = {};
  const path = extractPath(context);
  let page;

  // Fallback to /en/{path} when no language or default locale is present
  if (context.locale === 'default' || !context.locale) {
    const targetPath = path === '/' || !path ? '/en' : `/en/${path.replace(/^\/+/, '')}`;
    return {
      redirect: {
        destination: targetPath,
        permanent: false,
      },
    };
  }

  if (context.preview && isDesignLibraryPreviewData(context.previewData)) {
    page = await client.getDesignLibraryData(context.previewData);
  } else {
    page = context.preview
      ? await client.getPreview(context.previewData)
      : await client.getPage(path, { locale: context.locale });
  }

  if (!page) {
    // If the page does not exist in the requested locale, check if the item exists in the default language
    const defaultLang = scConfig.defaultLanguage || 'en';
    const isSubPage = path && path !== '/' && path !== '';

    if (isSubPage && context.locale !== defaultLang && context.locale !== 'default') {
      try {
        const defaultPage = await client.getPage(path, { locale: defaultLang });
        if (defaultPage) {
          // Page item exists in content tree, but no version in current language -> redirect to current language home
          return {
            redirect: {
              destination: `/${context.locale}`,
              permanent: false,
            },
          };
        }
      } catch (err) {
        console.error('Error verifying default language page existence:', err);
      }
    }

    return {
      props: {},
      notFound: true,
    };
  }

  props = {
    page,
    dictionary: await client.getDictionary({
      site: page.siteName,
      locale: page.locale,
    }),
    componentProps: await client.getComponentData(page.layout, context, components),
  };

  return {
    props,
    notFound: false,
  };
};

export default SitecorePage;
