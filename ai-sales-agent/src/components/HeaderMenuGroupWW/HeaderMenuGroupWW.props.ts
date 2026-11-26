import type { Field, LinkField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'src/lib/component-props';
import type { NormalizedHeaderGroupWW } from 'src/lib/ww/header-ww-data';

export interface HeaderMenuGroupLinkItemWW {
  id?: string;
  name?: string;
  text?: { jsonValue?: Field<string>; value?: string } | Field<string>;
  link?: { jsonValue?: LinkField; link?: LinkField } | LinkField;
}

export interface HeaderMenuGroupDatasourceWW {
  id?: string;
  name?: string;
  Title?: Field<string>;
  title?: { jsonValue?: Field<string>; value?: string } | Field<string>;
  Link?: LinkField;
  link?: { jsonValue?: LinkField; link?: LinkField } | LinkField;
  children?: {
    results?: HeaderMenuGroupLinkItemWW[];
  };
}

export interface HeaderMenuGroupWWFields {
  Title?: Field<string>;
  Link?: LinkField;
  datasource?: HeaderMenuGroupDatasourceWW;
  data?: {
    datasource?: HeaderMenuGroupDatasourceWW;
  };
}

export interface HeaderMenuGroupWWProps extends ComponentProps {
  fields?: HeaderMenuGroupWWFields;
  group?: NormalizedHeaderGroupWW;
}
