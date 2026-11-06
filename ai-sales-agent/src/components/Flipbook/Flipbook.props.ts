import {
  ComponentParams,
  ComponentRendering,
  Field,
  ImageField,
  LinkField,
} from '@sitecore-content-sdk/nextjs';

/**
 * Props for the Flipbook rendering.
 *
 * The component accepts its datasource either through the Content SDK
 * GraphQL shape (`fields.data.datasource`) or through the standard
 * Layout Service shape (fields flattened on `fields`). Both are handled
 * by the normalizer in `model.ts`.
 */

export type FlipStyle = 'Flip' | 'Slide' | 'Scroll';

export interface FlipbookHotspotItem {
  id?: string;
  fields: {
    'Hotspot Type'?: Field<string>;
    'Area Left'?: Field<number>;
    'Area Top'?: Field<number>;
    'Area Width'?: Field<number>;
    'Area Height'?: Field<number>;
    Label?: Field<string>;
    'Target Page'?: { id?: string; [key: string]: unknown } | Field<string>;
    Link?: LinkField;
    'Popup Image'?: Field<string> | ImageField;
    'Video URL'?: Field<string>;
    'Iframe URL'?: Field<string>;
    'Audio URL'?: Field<string>;
    [key: string]: unknown;
  };
}

export interface FlipbookPageItem {
  id?: string;
  fields: {
    'Page Image'?: Field<string> | ImageField;
    Thumbnail?: Field<string> | ImageField;
    'Page Label'?: Field<string>;
    'Search Text'?: Field<string>;
    Hotspots?: FlipbookHotspotItem[];
    [key: string]: unknown;
  };
}

export interface FlipbookTocItem {
  id?: string;
  fields: {
    Caption?: Field<string>;
    'Target Page'?: { id?: string; [key: string]: unknown } | Field<string>;
    [key: string]: unknown;
  };
}

export interface FlipbookFields {
  Title?: Field<string>;
  Description?: Field<string>;
  'Page Width'?: Field<number>;
  'Page Height'?: Field<number>;
  'Flip Style'?: Field<string>;
  'Theme Color'?: Field<string>;
  'Background Color'?: Field<string>;
  'Show Toolbar'?: Field<boolean>;
  'Show Thumbnails'?: Field<boolean>;
  'Show Table of Contents'?: Field<boolean>;
  'Show Search'?: Field<boolean>;
  'Show Page Numbers'?: Field<boolean>;
  'Right To Left'?: Field<boolean>;
  'Auto Play'?: Field<boolean>;
  'Auto Play Interval'?: Field<number>;
  'Flip Sound'?: Field<boolean>;
  Pages?: FlipbookPageItem[];
  'Table Of Contents'?: FlipbookTocItem[];
  [key: string]: unknown;
}

export interface FlipbookProps {
  rendering?: ComponentRendering;
  fields?: {
    data?: {
      datasource?: {
        fields?: Array<{ name: string; jsonValue: unknown }>;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    [key: string]: unknown;
  } & FlipbookFields;
  params?: ComponentParams & {
    RenderingIdentifier?: string;
    styles?: string;
    [key: string]: unknown;
  };
  className?: string;
}
