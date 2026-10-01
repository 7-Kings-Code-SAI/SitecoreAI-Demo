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

  if (context.preview && isDesignLibraryPreviewData(context.previewData)) {
    page = await client.getDesignLibraryData(context.previewData);
  } else {
    page = context.preview
      ? await client.getPreview(context.previewData)
      : await client.getPage(path, { locale: context.locale });
  }
  if (page) {
    props = {
      page,
      dictionary: await client.getDictionary({
        site: page.siteName,
        locale: page.locale,
      }),
      componentProps: await client.getComponentData(page.layout, context, components),
    }
  }
  return {
    props,
    // Next.js will attempt to re-generate the page:
    // - When a request comes in
    // - At most once every 5 seconds
        notFound: !page,
  };
};

export default SitecorePage;
