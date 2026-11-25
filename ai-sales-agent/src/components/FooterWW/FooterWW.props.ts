import type { ImageField, LinkField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'src/lib/component-props';

export interface FooterWWProps extends ComponentProps {
  className?: string;
  fields?: {
    data?: {
      datasource?: FooterWWDatasource;
    };
    datasource?: FooterWWDatasource;
  } & Partial<FooterWWDatasource>;
}

export interface FooterWWLinkItem {
  id?: string;
  link?: {
    link?: {
      value?: {
        text?: string;
        href?: string;
      };
    };
    jsonValue?: {
      value?: {
        text?: string;
        href?: string;
      };
      text?: string;
      href?: string;
    };
  };
}

export interface FooterWWLinkGroup {
  id?: string;
  title?: {
    value?: string;
  };
  children?: {
    results?: FooterWWLinkItem[];
  };
}

export interface FooterWWDatasource {
  LogInLink?: {
    jsonValue?: LinkField;
    value?: LinkField['value'];
  };
  LoginLink?: {
    jsonValue?: LinkField;
    value?: LinkField['value'];
  };
  ContactLink?: {
    jsonValue?: LinkField;
    value?: LinkField['value'];
  };
  DesktopBackgroundImage?: {
    jsonValue?: ImageField;
    value?: ImageField['value'];
  };
  MobileBackgroundImage?: {
    jsonValue?: ImageField;
    value?: ImageField['value'];
  };
  phoneNumber?: {
    value?: string;
  };
  workingHours?: {
    value?: string;
  };
  messageLabel?: {
    value?: string;
  };
  contactTitle?: {
    value?: string;
  };
  pressContact?: {
    value?: string;
  };
  prAgency?: {
    value?: string;
  };
  copyright?: {
    value?: string | null;
  } | null;
  children?: {
    results?: FooterWWLinkGroup[];
  };
}
