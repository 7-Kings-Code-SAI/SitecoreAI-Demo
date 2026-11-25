'use client';

import type { CSSProperties, FC } from 'react';
import { Placeholder, useSitecore } from '@sitecore-content-sdk/nextjs';
import { useLocaleWW } from 'src/lib/ww/utils';
import type { FooterWWProps } from './FooterWW.props';
import { resolveFooterContentWW, resolveFooterDatasourceWW } from 'src/lib/ww/footer-data-ww';
import { FooterLayoutWW, type ContactBlockWW } from 'src/lib/ww/FooterLayoutWW';
import styles from './FooterWW.module.css';

const getImageSrc = (field: unknown): string | undefined => {
  const f = field as
    | { jsonValue?: { value?: { src?: string } }; value?: { src?: string }; src?: string }
    | undefined;
  return f?.jsonValue?.value?.src ?? f?.value?.src ?? f?.src;
};

const openLink = (href: string, type?: string) => {
  let finalHref = href;
  if (type === 'mailto' && !href.startsWith('mailto:')) {
    finalHref = `mailto:${href}`;
  } else if (type === 'tel' && !href.startsWith('tel:')) {
    finalHref = `tel:${href.replace(/[^\d+]/g, '')}`;
  }
  window.location.assign(finalHref);
};

const decodeHtml = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const stripTags = (s: string) => s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

const parseContactHtml = (html?: string): ContactBlockWW[] | null => {
  if (!html) return null;

  const normalized = html
    .replace(/<strong>([\s\S]*?)<\/strong>/gi, (_, inner) => `<strong>${stripTags(inner)}</strong>`)
    .replace(
      /<a([^>]*)>([\s\S]*?)<\/a>/gi,
      (_, attrs, inner) => `<a ${attrs.replace(/\s+/g, ' ').trim()}>${stripTags(inner)}</a>`,
    )
    .replace(/<\/?(?!strong|a\b)[^>]*>/gi, '\n');

  return normalized
    .split('\n')
    .map((line) => decodeHtml(line.trim()))
    .filter(Boolean)
    .map((line): ContactBlockWW => {
      if (line.startsWith('<strong>')) return { type: 'title', content: stripTags(line) };
      if (line.startsWith('<a')) {
        const href = (line.match(/href=["'](.*?)["']/i)?.[1] ?? '')
          .replace('mailto:', '')
          .replace('tel:', '');
        return { type: 'link', content: stripTags(line), href };
      }
      return { type: 'text', content: line };
    })
    .filter((block) => block.content);
};

type Rendering = FooterWWProps['rendering'];
type PlaceholderMap = Record<string, unknown>;
type Source = { ctx: Rendering; names: string[]; withContent: string[] };

const leafName = (name: string) => name.split('/').filter(Boolean).pop() ?? name;
const hasContent = (v: unknown) => (Array.isArray(v) ? v.length > 0 : Boolean(v));

const buildSource = (
  ctx: Rendering,
  map: PlaceholderMap | undefined,
  baseNames: string[],
  dynamicId: string | undefined,
  onlyFooterKeys = false,
): Source => {
  const bases = baseNames.map((b) => b.toLowerCase());
  const names = Object.keys(map ?? {})
    .filter((key) => {
      const leaf = leafName(key).toLowerCase();
      const matches = bases.some((base) => leaf === base || leaf.startsWith(`${base}-`));
      return matches && (!onlyFooterKeys || key.toLowerCase().includes('headless-footer'));
    })
    .flatMap((key) =>
      key.includes('{*}') && dynamicId ? [key, key.replace('{*}', String(dynamicId))] : [key],
    )
    .filter((key, i, list) => list.indexOf(key) === i);

  return { ctx, names, withContent: names.filter((n) => hasContent(map?.[n])) };
};

const useFooterWWPlaceholders = ({ rendering, params }: FooterWWProps) => {
  const { page } = useSitecore();
  const route = page?.layout?.sitecore?.route as { placeholders?: PlaceholderMap } | undefined;
  const routeMap = route?.placeholders;
  const pageDynamicId = params?.DynamicPlaceholderId ?? rendering?.params?.DynamicPlaceholderId;

  const footerRenderings = [
    rendering,
    ...((routeMap?.['headless-footer'] as Rendering[] | undefined) ?? []).filter(
      (r) => r?.componentName === 'FooterWW' || r?.componentName === 'Footer',
    ),
  ].filter((r, i, list) => list.findIndex((c) => c?.uid === r?.uid) === i);

  const resolve = (baseNames: string[]) => {
    const routeSource = buildSource(route as Rendering, routeMap, baseNames, pageDynamicId, true);
    const footerSources = footerRenderings.map((r) =>
      buildSource(
        r,
        r?.placeholders as PlaceholderMap | undefined,
        baseNames,
        r?.params?.DynamicPlaceholderId ?? pageDynamicId,
      ),
    );

    const withContent = [routeSource, ...footerSources].find((s) => s.withContent.length > 0);
    if (withContent?.ctx) return { ctx: withContent.ctx, names: withContent.withContent };

    const fallback =
      footerSources.find((s) => s.names.length > 0) ??
      (routeSource.names.length > 0 ? routeSource : undefined);

    if (fallback?.ctx && fallback.names.length > 0) {
      return { ctx: fallback.ctx, names: fallback.names };
    }

    const defaultPlaceholder = pageDynamicId
      ? `${baseNames[0]}-${pageDynamicId}`
      : baseNames[0];
    return { ctx: rendering, names: [defaultPlaceholder] };
  };

  const render = (prefix: string, baseNames: string[]) => {
    const { ctx, names } = resolve(baseNames);
    return names.map((name) => (
      <Placeholder key={`${prefix}-${name}`} name={name} rendering={ctx} />
    ));
  };

  return {
    socialSlot: render('social', ['social-accounts-ww', 'social-accounts']),
    globalSlot: render('global', ['global-footer-ww', 'global-footer']),
  };
};

export const Default: FC<FooterWWProps> = (props) => {
  const { fields } = props;
  const { page } = useSitecore();
  const isEditing = Boolean(page?.mode?.isEditing);
  const locale = useLocaleWW();
  const { socialSlot, globalSlot } = useFooterWWPlaceholders(props);

  const datasource = resolveFooterDatasourceWW(fields);
  const backgroundStyles = {
    '--footer-background-desktop': `url("${
      getImageSrc(datasource?.DesktopBackgroundImage) ??
      '/assets/images/backgrounds/cws-footer-desktop.svg'
    }")`,
    '--footer-background-mobile': `url("${
      getImageSrc(datasource?.MobileBackgroundImage) ??
      '/assets/images/backgrounds/cws-footer-mobile.svg'
    }")`,
  } as CSSProperties;

  const {
    contact: { phoneNumber, workingHours, pressContactHtml, prAgencyHtml, contactTitle },
    linkColumns,
    hasContactContent,
    hasContent: hasDatasourceContent,
  } = resolveFooterContentWW(fields);

  return (
    <footer
      className={`${styles.footer} w-full overflow-hidden rounded-t-[12px] lg:rounded-t-[32px]`}
      data-component="FooterWW"
      style={backgroundStyles}
    >
      {hasDatasourceContent || isEditing ? (
        <FooterLayoutWW
          fields={fields}
          isEditing={isEditing}
          locale={locale}
          contactTitle={contactTitle}
          phoneNumber={phoneNumber}
          workingHours={workingHours}
          hasContactContent={hasContactContent}
          linkColumns={linkColumns}
          pressContact={parseContactHtml(pressContactHtml)}
          prAgency={parseContactHtml(prAgencyHtml)}
          socialSlot={socialSlot}
          onLinkClick={openLink}
        />
      ) : (
        <div className="mx-auto max-w-[1360px] px-6">{socialSlot}</div>
      )}

      <div id="downward-animation-portal" className="w-full" />
      {globalSlot}
    </footer>
  );
};

export default Default;
