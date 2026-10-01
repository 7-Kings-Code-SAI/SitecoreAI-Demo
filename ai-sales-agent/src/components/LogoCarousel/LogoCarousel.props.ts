import { Field, ImageField, LinkField } from '@sitecore-content-sdk/nextjs';

export interface LogoItem {
  id: string;
  name: string;
  displayName?: string;
  fields: {
    'Logo Image': ImageField;
    'Platform Name'?: Field<string>;
  };
}

export interface LogoCarouselFields {
  'Label Text'?: Field<string>;
  Heading?: Field<string>;
  Description?: Field<string>;
  'Primary Category Title'?: Field<string>;
  'Primary Category Description'?: Field<string>;
  'Primary Logos'?: LogoItem[];
  'Secondary Category Title'?: Field<string>;
  'Secondary Category Description'?: Field<string>;
  'Secondary Logos'?: LogoItem[];
  'CTA Lead-in Text'?: Field<string>;
  'CTA Link'?: LinkField;
}

export interface LogoCarouselProps {
  fields: LogoCarouselFields;
}
