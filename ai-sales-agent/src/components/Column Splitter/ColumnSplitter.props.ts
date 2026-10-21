import { ComponentRendering, Field } from '@sitecore-content-sdk/nextjs';

export type ColumnSplitterFields = {
  'Left Column Width'?: Field<string> | string;
  LeftColumnWidth?: Field<string> | string;
  'Right Column Width'?: Field<string> | string;
  RightColumnWidth?: Field<string> | string;
  [key: string]: unknown;
};

export type ColumnSplitterProps = {
  rendering: ComponentRendering;
  params: { [key: string]: string };
  fields?: {
    data?: {
      datasource?: {
        fields?: ColumnSplitterFields;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    [key: string]: unknown;
  } | ColumnSplitterFields;
};

