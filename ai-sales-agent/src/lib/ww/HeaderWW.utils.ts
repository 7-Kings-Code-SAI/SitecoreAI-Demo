import { HEADER_TRANSPARENT_FIELD } from './HeaderWW.styles';

/** Reads the page-level "HeaderTransparent" checkbox from the route item. */
export const isHeaderWWTransparentPage = (route: unknown): boolean => {
  const v = (route as { fields?: Record<string, { value?: unknown }> } | undefined)?.fields?.[
    HEADER_TRANSPARENT_FIELD
  ]?.value;
  return v === true || v === 1 || v === '1' || v === 'true';
};
