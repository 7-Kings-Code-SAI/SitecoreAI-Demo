import { resolveFooterDatasourceWW } from './footer-data-ww';

export interface FooterWWButtonFields {
  loginLink?: unknown;
  getInTouchLabel?: unknown;
  contactLink?: unknown;
}

export const resolveFooterButtonsWW = (fields: unknown): FooterWWButtonFields => {
  const ds = resolveFooterDatasourceWW(fields) as Record<string, unknown> | undefined;
  return {
    loginLink: ds?.LogInLink ?? ds?.LoginLink ?? ds?.logInLink ?? ds?.loginLink,
    getInTouchLabel: ds?.GetInTouchLabel ?? ds?.getInTouchLabel,
    contactLink: ds?.ContactLink ?? ds?.contactLink,
  };
};

export const readFieldValueWW = (field: unknown): string => {
  const rec = field && typeof field === 'object' ? (field as Record<string, unknown>) : undefined;
  const jsonVal =
    rec?.jsonValue && typeof rec.jsonValue === 'object'
      ? (rec.jsonValue as Record<string, unknown>)
      : undefined;
  const val = rec?.value ?? jsonVal?.value;
  return typeof val === 'string' ? val : '';
};
