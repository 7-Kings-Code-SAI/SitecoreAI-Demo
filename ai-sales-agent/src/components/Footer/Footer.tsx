import { useRouter } from 'next/router';
import {
  Text,
  RichText,
  Link as JssLink,
  useSitecore,
} from '@sitecore-content-sdk/nextjs';
import { FooterProps } from './Footer.props';
import { normalizeHref } from 'src/lib/useLinkNormalizer';

export const Footer = (props: FooterProps) => {
  const router = useRouter();
  const { page } = useSitecore();
  const currentLocale =
    page?.layout?.sitecore?.route?.itemLanguage ||
    page?.locale ||
    (router?.locale && router.locale !== 'default' ? router.locale : null) ||
    'en';

  const formatHref = (href?: string) => {
    if (!href || href === '#' || href.trim() === '#' || href.trim() === '/#') return undefined;
    return normalizeHref(href, currentLocale) || href;
  };

  // Resolve root item from layout fields.
  // With Integrated GraphQL configured in Sitecore, the response is typically in props.fields.data
  const rawFields = props?.fields || props?.rendering?.fields;
  const integratedData = rawFields?.data;

  // The user's GQL query aliases the root item as 'datasource': datasource: item(path: ...)
  const item =
    integratedData?.datasource ||
    integratedData?.item ||
    integratedData?.data?.datasource ||
    integratedData?.data?.item ||
    rawFields?.item ||
    rawFields;

  // Render a navigation column matching the GraphQL structure
  const renderColumn = (col: any, key: string | number) => {
    const target = col?.targetItem || col;

    // Resolve column Title
    const title =
      target?.title?.jsonValue?.value ||
      target?.title?.value ||
      (typeof target?.title === 'string' ? target.title : null) ||
      target?.name ||
      '';

    // Resolve Children Links
    const links =
      target?.children?.results ||
      target?.children ||
      target?.links?.results ||
      target?.links ||
      [];

    const linksArray: any[] = Array.isArray(links) ? links : [];

    if (!title && linksArray.length === 0) return null;

    return (
      <div key={key} className="flex flex-col space-y-4">
        {title && (
          <h4 className="font-bold text-gray-900 uppercase text-sm tracking-wider">
            {title}
          </h4>
        )}
        {linksArray.length > 0 && (
          <ul className="space-y-3 text-sm text-gray-600">
            {linksArray.map((linkItem: any, idx: number) => {
              const linkField =
                linkItem?.link?.jsonValue ||
                linkItem?.Link?.jsonValue ||
                linkItem?.fields?.Link ||
                linkItem?.fields?.link;

              const linkText =
                linkField?.value?.text ||
                linkItem?.title?.jsonValue?.value ||
                linkItem?.name ||
                linkItem?.displayName ||
                'Link';

              const rawHref =
                linkField?.value?.href ||
                linkField?.href ||
                linkField?.value?.url ||
                linkField?.url;

              const href = formatHref(rawHref);

              if (!href) {
                return (
                  <li key={linkItem?.id || idx}>
                    <span className="hover:text-blue-500 transition-colors cursor-pointer" role="button">
                      {linkText}
                    </span>
                  </li>
                );
              }

              if (linkField && (linkField.value?.href || linkField.href)) {
                const formattedField = linkField.value
                  ? { ...linkField, value: { ...linkField.value, href } }
                  : { value: { ...linkField, href } };

                return (
                  <li key={linkItem?.id || idx}>
                    <JssLink
                      field={formattedField}
                      className="hover:text-blue-500 transition-colors"
                    />
                  </li>
                );
              }

              return (
                <li key={linkItem?.id || idx}>
                  <a href={href} className="hover:text-blue-500 transition-colors">
                    {linkText}
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  };

  const newsletter =
    item?.newsletter?.targetItem ||
    item?.newsletter ||
    item?.Newsletter?.targetItem ||
    item?.Newsletter ||
    item;

  return (
    <footer className="w-full bg-white border-t border-gray-100 pt-12 pb-8 font-sans">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Render Column 1 (Useful Links), Column 2 (Platform), Column 3 (Resources) */}
        {renderColumn(item?.column1, 1)}
        {renderColumn(item?.column2, 2)}
        {renderColumn(item?.column3, 3)}

        {/* Render the Newsletter Column */}
        {newsletter && (
          <div className="flex flex-col space-y-4">
            {newsletter.Heading && (
              <h4 className="font-bold text-gray-900 uppercase text-sm tracking-wider">
                <Text field={newsletter.Heading?.jsonValue || newsletter.Heading} />
              </h4>
            )}
            {newsletter.Description && (
              <div className="text-sm text-gray-600 leading-relaxed">
                <RichText field={newsletter.Description?.jsonValue || newsletter.Description} />
              </div>
            )}

            <form className="flex mt-2 w-full shadow-sm" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder={
                  newsletter.InputPlaceholder?.jsonValue?.value ||
                  newsletter.InputPlaceholder?.value ||
                  'Enter your email'
                }
                className="px-3 py-2.5 border border-gray-200 border-r-0 rounded-l-md w-full min-w-0 focus:outline-none focus:border-blue-500 text-[13px] text-gray-900"
              />
              <button
                type="submit"
                className="bg-[#3399ff] text-white px-4 py-2.5 rounded-r-md font-medium hover:bg-blue-600 transition-colors cursor-pointer text-[13px] whitespace-nowrap shrink-0"
              >
                <Text field={newsletter.ButtonText?.jsonValue || newsletter.ButtonText || { value: 'Subscribe' }} />
              </button>
            </form>

            {newsletter.Disclaimer && (
              <div className="text-xs text-gray-400 mt-2">
                <RichText field={newsletter.Disclaimer?.jsonValue || newsletter.Disclaimer} />
              </div>
            )}
          </div>
        )}
      </div>
    </footer>
  );
};

export default Footer;