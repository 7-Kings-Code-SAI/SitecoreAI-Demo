import type { ImageField, LinkField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'src/lib/component-props';

export interface HeaderNavigationLinkValueWW {
  text?: string | null;
  anchor?: string | null;
  linktype?: string | null;
  class?: string | null;
  title?: string | null;
  target?: string | null;
  querystring?: string | null;
  id?: string | null;
  href?: string | null;
  url?: string | null;
}

export interface HeaderNavigationLinkInnerWW {
  value?: HeaderNavigationLinkValueWW;
}

export interface HeaderLinkFieldWW {
  link?: LinkField | HeaderNavigationLinkInnerWW;
}

export interface HeaderNewsImageFieldWW {
  image?: {
    value?: {
      src?: string | null;
      alt?: string | null;
      width?: string | null;
      height?: string | null;
    };
  };
}

export interface HeaderNavigationNodeWW {
  title?: {
    value?: string | null;
  };
  link?: HeaderLinkFieldWW;
  newsLink?: HeaderLinkFieldWW;
  newsTitle?: {
    value?: string | null;
  };
  newsDescription?: {
    value?: string | null;
  };
  newsImage?: HeaderNewsImageFieldWW;
  children?: {
    results?: HeaderNavigationNodeWW[];
  };
}

interface HeaderLanguageWW {
  name?: {
    value?: string;
  };
  code?: {
    value?: string;
  };
  selected?: {
    value?: boolean;
  };
  flagSvg?: {
    value?: string;
  };
  flagColor?: {
    value?: string;
  };
}

type HeaderLoginFieldWW = LinkField | { jsonValue?: LinkField; link?: LinkField };

interface HeaderWWDatasource {
  loginLink?: HeaderLoginFieldWW;
  LoginLink?: HeaderLoginFieldWW;
  ContactLink?: HeaderLoginFieldWW;
  contactLink?: HeaderLoginFieldWW;
  ContactLabel?: {
    value?: string;
  };
  logo?: {
    jsonValue?: ImageField;
  };
  children?: {
    results?: HeaderNavigationNodeWW[];
  };
  languages?: {
    results?: HeaderLanguageWW[];
  };
  contactButtonText?: {
    value?: string;
  };
  backButtonText?: {
    value?: string;
  };
  openSearchAriaLabel?: {
    value?: string;
  };
  closeMenuAriaLabel?: {
    value?: string;
  };
  openMenuAriaLabel?: {
    value?: string;
  };
  backToNavigationAriaLabel?: {
    value?: string;
  };
}

export interface HeaderWWFields {
  LoginLink?: LinkField;
  loginLink?: HeaderLoginFieldWW;
  ContactLink?: HeaderLoginFieldWW;
  contactLink?: HeaderLoginFieldWW;
  datasource?: HeaderWWDatasource;
  data?: {
    datasource?: HeaderWWDatasource;
  };
}

export interface HeaderWWProps extends ComponentProps {
  fields: HeaderWWFields;
  contactFormId?: string;
}
