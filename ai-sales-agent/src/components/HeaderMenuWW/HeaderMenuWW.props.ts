import type { Field, ImageField, LinkField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'src/lib/component-props';

export interface HeaderMenuWWFields {
  Title?: Field<string>;
  Link?: LinkField;
  'News Title'?: Field<string>;
  'News Description'?: Field<string>;
  'News Image'?: ImageField;
  'News Link'?: LinkField;
  datasource?: Record<string, unknown>;
  data?: {
    datasource?: Record<string, unknown>;
  };
}

export interface HeaderMenuWWProps extends ComponentProps {
  fields?: HeaderMenuWWFields;
}
