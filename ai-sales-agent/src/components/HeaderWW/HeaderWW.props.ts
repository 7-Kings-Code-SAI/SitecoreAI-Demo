import type { Field, ImageField, LinkField } from '@sitecore-content-sdk/nextjs';
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

export interface HeaderLanguageWW {
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

export interface HeaderWWDatasource {
  loginLink?: HeaderLoginFieldWW;
  LoginLink?: HeaderLoginFieldWW;
  ContactLink?: HeaderLoginFieldWW;
  contactLink?: HeaderLoginFieldWW;
  ContactLabel?: Field<string>;
  logo?: {
    jsonValue?: ImageField;
  };
  children?: {
    results?: HeaderNavigationNodeWW[];
  };
  languages?: {
    results?: HeaderLanguageWW[];
  };
  contactButtonText?: Field<string>;
  backButtonText?: Field<string>;
  openSearchAriaLabel?: Field<string>;
  closeMenuAriaLabel?: Field<string>;
  openMenuAriaLabel?: Field<string>;
  backToNavigationAriaLabel?: Field<string>;
}

export interface HeaderWWFields {
  LoginLink?: LinkField;
  loginLink?: HeaderLoginFieldWW;
  ContactLink?: HeaderLoginFieldWW;
  contactLink?: HeaderLoginFieldWW;
  ContactLabel?: Field<string>;
  datasource?: HeaderWWDatasource;
  data?: {
    datasource?: HeaderWWDatasource;
  };
}

export interface HeaderWWProps extends ComponentProps {
  fields: HeaderWWFields;
  contactFormId?: string;
}
