import { HEADER_TRANSPARENT_FIELD } from './HeaderWW.styles';

/** Reads the page-level "HeaderTransparent" checkbox from the route item. */
export const isHeaderWWTransparentPage = (route: unknown): boolean => {
  const v = (route as { fields?: Record<string, { value?: unknown }> } | undefined)?.fields?.[
    HEADER_TRANSPARENT_FIELD
  ]?.value;
  return v === true || v === 1 || v === '1' || v === 'true';
};

export const getPlaceholderLeafName = (placeholderName: string): string =>
  placeholderName.split('/').filter(Boolean).pop() ?? placeholderName;

const matchesPlaceholderBase = (placeholderName: string, candidateBaseNames: string[]): boolean => {
  const leafName = getPlaceholderLeafName(placeholderName).toLowerCase();
  return candidateBaseNames.some((baseName) => {
    const normalizedBaseName = baseName.toLowerCase();
    return leafName === normalizedBaseName || leafName.startsWith(`${normalizedBaseName}-`);
  });
};

export const resolveHeaderPlaceholderName = (
  placeholders: Record<string, unknown> | undefined,
  candidateBaseNames: string[],
  dynamicPlaceholderId?: string,
): string => {
  for (const baseName of candidateBaseNames) {
    const matchedKey = Object.keys(placeholders ?? {}).find((placeholderKey) =>
      matchesPlaceholderBase(placeholderKey, [baseName]),
    );

    if (matchedKey) {
      const leafName = getPlaceholderLeafName(matchedKey);
      if (leafName.includes('{*}') && dynamicPlaceholderId) {
        return leafName.replace('{*}', String(dynamicPlaceholderId));
      }
      return leafName;
    }
  }

  const primaryBaseName = candidateBaseNames[0];
  return dynamicPlaceholderId ? `${primaryBaseName}-${dynamicPlaceholderId}` : primaryBaseName;
};

export const placeholderHasItems = (
  placeholders: Record<string, unknown> | undefined,
  candidateBaseNames: string[],
): boolean =>
  Object.entries(placeholders ?? {}).some(([placeholderName, placeholderItems]) => {
    if (!matchesPlaceholderBase(placeholderName, candidateBaseNames)) return false;
    if (Array.isArray(placeholderItems)) return placeholderItems.length > 0;
    return Boolean(placeholderItems);
  });

export interface PlaceholderRenderingItem {
  uid?: string;
  componentName?: string;
  params?: Record<string, string>;
  fields?: Record<string, unknown>;
  placeholders?: Record<string, unknown>;
}

export const getPlaceholderItems = (
  placeholders: Record<string, unknown> | undefined,
  candidateBaseNames: string[],
): PlaceholderRenderingItem[] => {
  const items: PlaceholderRenderingItem[] = [];

  for (const [placeholderName, placeholderValue] of Object.entries(placeholders ?? {})) {
    if (!matchesPlaceholderBase(placeholderName, candidateBaseNames)) continue;
    if (Array.isArray(placeholderValue)) {
      items.push(...(placeholderValue as PlaceholderRenderingItem[]));
    } else if (placeholderValue && typeof placeholderValue === 'object') {
      items.push(placeholderValue as PlaceholderRenderingItem);
    }
  }

  return items;
};
