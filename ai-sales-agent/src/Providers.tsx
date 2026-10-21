import {
  ComponentPropsCollection,
  ComponentPropsContext,
  Page,
  SitecoreProvider,
} from '@sitecore-content-sdk/nextjs';
import components from '.sitecore/component-map';
import scConfig from 'sitecore.config';
import { withAuthorFormHeader } from 'src/components/content-sdk/FormWithAuthorHeader';

// Enhance the built-in Form component to auto-display form name in Page Builder
if (components && typeof components.get === 'function') {
  const nativeForm = components.get('Form');
  if (nativeForm) {
    components.set('Form', withAuthorFormHeader(nativeForm) as any);
  }
}

const Providers = ({
  children,
  componentProps,
  page,
}: {
  children: React.ReactNode;
  componentProps?: ComponentPropsCollection;
  page: Page;
}) => {
  return (
    <ComponentPropsContext value={componentProps || {}}>
      <SitecoreProvider
        componentMap={components}
        api={scConfig.api}
        page={page}
        loadImportMap={() => import('.sitecore/import-map')}
      >
        {children}
      </SitecoreProvider>
    </ComponentPropsContext>
  );
};

export default Providers;
