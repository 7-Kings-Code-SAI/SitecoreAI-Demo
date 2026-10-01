import { Field, LinkField, RichTextField } from '@sitecore-content-sdk/nextjs';

export interface FooterLinkItem {
  id?: string;
  name?: string;
  displayName?: string;
  title?: { jsonValue?: Field<string> };
  link?: { jsonValue?: LinkField };
  Link?: { jsonValue?: LinkField };
  fields?: {
    Link?: LinkField;
    link?: LinkField;
  };
}

export interface FooterColumn {
  targetItem?: {
    name?: string;
    title?: { jsonValue?: Field<string> | string } | string;
    children?: {
      results?: FooterLinkItem[];
    } | FooterLinkItem[];
    links?: {
      results?: FooterLinkItem[];
    } | FooterLinkItem[];
  };
  fields?: any;
}

export interface FooterItem {
  id?: string;
  name?: string;
  column1?: FooterColumn;
  column2?: FooterColumn;
  column3?: FooterColumn;
  'Column 1'?: FooterColumn;
  'Column 2'?: FooterColumn;
  'Column 3'?: FooterColumn;
}

export interface NewsletterData {
  Heading?: Field<string> | { jsonValue?: Field<string> };
  heading?: Field<string> | { jsonValue?: Field<string> };
  Description?: RichTextField | { jsonValue?: RichTextField };
  description?: RichTextField | { jsonValue?: RichTextField };
  InputPlaceholder?: Field<string> | { jsonValue?: Field<string> };
  inputPlaceholder?: Field<string> | { jsonValue?: Field<string> };
  ButtonText?: Field<string> | { jsonValue?: Field<string> };
  buttonText?: Field<string> | { jsonValue?: Field<string> };
  Disclaimer?: RichTextField | { jsonValue?: RichTextField };
  disclaimer?: RichTextField | { jsonValue?: RichTextField };
}

export interface NewsletterFields {
  fields?: NewsletterData;
}

export interface FooterProps {
  rendering?: any;
  fields?: {
    data?: {
      datasource?: FooterItem;
      item?: FooterItem;
    };
    item?: FooterItem;
    'Column 1'?: any;
    Column1?: any;
    'Column 2'?: any;
    Column2?: any;
    'Column 3'?: any;
    Column3?: any;
    Newsletter?: NewsletterFields | NewsletterData;
    newsletter?: NewsletterFields | NewsletterData;
  };
}
