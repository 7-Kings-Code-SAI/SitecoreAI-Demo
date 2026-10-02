/**
 * This Layout is needed for Starter Kit.
 */
import { JSX } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Placeholder, DesignLibrary, Page, PageMetaTags } from '@sitecore-content-sdk/nextjs';
import Scripts from 'src/Scripts';
import SitecoreStyles from 'src/components/content-sdk/SitecoreStyles';

interface LayoutProps {
  page: Page;
}

// Helper interface for Image field
interface ImageFieldValue {
  src?: string;
  alt?: string;
  [key: string]: unknown;
}

const Layout = ({ page }: LayoutProps): JSX.Element => {
  const { layout, mode } = page;
  const { route } = layout.sitecore;
  const router = useRouter();
  const mainClassPageEditing = mode.isEditing ? 'editing-mode' : 'prod-mode';

  // Helper to extract field value safely
  const getFieldValue = (fieldName: string): string => {
    const field = route?.fields?.[fieldName] || route?.fields?.[fieldName.replace(/\s+/g, '')];
    if (field && typeof field === 'object' && 'value' in field) {
      return (field.value as string) || '';
    }
    return '';
  };

  const getImageSrc = (fieldName: string): string => {
    const field = route?.fields?.[fieldName] || route?.fields?.[fieldName.replace(/\s+/g, '')];
    if (field && typeof field === 'object' && 'value' in field) {
      const value = field.value as ImageFieldValue;
      return value?.src || '';
    }
    return '';
  };

  const metaTitle = getFieldValue('Meta Title');
  const metaDescription = getFieldValue('Meta Description');
  const metaKeywords = getFieldValue('Meta Keywords');
  const ogTitle = getFieldValue('OG Title') || metaTitle;
  const ogDescription = getFieldValue('OG Description') || metaDescription;
  const ogImageSrc = getImageSrc('OG Image');

  // Construct current page URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000');
  const currentUrl = `${baseUrl}${router.asPath === '/' ? '' : router.asPath}`;

  return (
    <>
      <Scripts />
      <SitecoreStyles layoutData={layout} />
      <PageMetaTags route={route} />
      <Head>
        <link rel="icon" href="/favicon.ico" />
        {metaTitle && <title>{metaTitle}</title>}
        {metaDescription && <meta name="description" content={metaDescription} key="description" />}
        {metaKeywords && <meta name="keywords" content={metaKeywords} key="keywords" />}
        
        {ogTitle && <meta property="og:title" content={ogTitle} key="og:title" />}
        {ogDescription && <meta property="og:description" content={ogDescription} key="og:description" />}
        {ogImageSrc && <meta property="og:image" content={ogImageSrc} key="og:image" />}
        
        <meta property="og:url" content={currentUrl} key="og:url" />
        <link rel="canonical" href={currentUrl} key="canonical" />
      </Head>

      {/* root placeholder for the app, which we add components to using route data */}
      <div className={`${mainClassPageEditing} flex flex-col min-h-screen`}>
        {mode.isDesignLibrary ? (
          <DesignLibrary />
        ) : (
          <>
            <header>
              <div id="header">
                {route && <Placeholder name="headless-header" rendering={route} />}
              </div>
            </header>
            <main className="flex-grow">
              <div id="content">
                {route && <Placeholder name="headless-main" rendering={route} />}
              </div>
            </main>
            <footer>
              <div id="footer">
                {route && <Placeholder name="headless-footer" rendering={route} />}
              </div>
            </footer>
          </>
        )}
      </div>
    </>
  );
};

export default Layout;
