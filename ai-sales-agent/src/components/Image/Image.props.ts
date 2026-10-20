import type { Field, ImageField } from '@sitecore-content-sdk/nextjs';

export interface AILabelItem {
  id?: string;
  url?: string;
  name?: string;
  displayName?: string;
  fields?: {
    'Label Image'?: ImageField;
  };
}

export interface ImageFields {
  Image?: ImageField;
  'AI Generated'?: Field<boolean | string>;
  'AI generated label'?: AILabelItem | null;
}

export interface ImageProps {
  fields?: ImageFields;
}