import type { Field, LinkField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'src/lib/component-props';

interface GlobalFooterWWLinkItem {
  id?: string;
  name?: string;
  displayName?: string;
  url?: string;
  fields?: {
    Link?: {
      value?: LinkField['value'];
      jsonValue?: LinkField;
    };
    'Link Text'?: {
      value?: string;
      jsonValue?: Field<string>;
    };
  };
}

interface GlobalFooterWWDatasource {
  Copyright?: {
    value?: string;
    jsonValue?: Field<string>;
  };
  LegalInlineText?: {
    value?: string;
    jsonValue?: Field<string>;
  };
  Items?:
    | GlobalFooterWWLinkItem[]
    | {
        targetItems?: GlobalFooterWWLinkItem[];
      };
}

export interface GlobalFooterWWFields {
  data?: {
    datasource?: GlobalFooterWWDatasource;
  };
}

export interface GlobalFooterWWProps extends ComponentProps {
  className?: string;
  fields: GlobalFooterWWFields;
}
