import { Field, ImageField, LinkField } from '@sitecore-content-sdk/nextjs';

export interface SocialLinkItem {
  id: string;
  name: string;
  link?: {
    jsonValue?: LinkField;
  };
  icon?: {
    jsonValue?: ImageField;
  };
}

export interface LegalLinkItem {
  id: string;
  name: string;
  title?: {
    jsonValue?: Field<string>;
  };
  link?: {
    jsonValue?: LinkField;
  };
}

export interface GlobalFooterData {
  id?: string;
  name?: string;
  brandLogo?: {
    jsonValue?: ImageField;
  };
  brandLogoLink?: {
    jsonValue?: LinkField;
  };
  copyrightText?: {
    jsonValue?: Field<string>;
  };
  poweredByText?: {
    jsonValue?: Field<string>;
  };
  socialLinks?: {
    targetItems?: SocialLinkItem[];
  };
  legalLinks?: {
    targetItems?: LegalLinkItem[];
  };
}

export interface GlobalFooterProps {
  rendering?: any;
  fields?: {
    data?: {
      datasource?: GlobalFooterData;
      item?: GlobalFooterData;
    };
  };
}
