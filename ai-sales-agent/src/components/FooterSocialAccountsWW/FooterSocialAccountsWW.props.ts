import type { ImageField, LinkField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'src/lib/component-props';

interface SocialAccountItemWW {
  id?: string;
  name?: string;
  displayName?: string;
  fields?: {
    Icon?: {
      value?: ImageField['value'];
      jsonValue?: ImageField;
    };
    Link?: {
      value?: LinkField['value'];
      jsonValue?: LinkField;
    };
  };
}

interface FooterSocialAccountsWWDatasource {
  Items?: {
    targetItems?: SocialAccountItemWW[];
  };
}

export interface FooterSocialAccountsWWFields {
  data?: {
    datasource?: FooterSocialAccountsWWDatasource;
  };
}

export interface FooterSocialAccountsWWProps extends ComponentProps {
  className?: string;
  fields: FooterSocialAccountsWWFields;
}
