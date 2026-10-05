import { Field, RichTextField, ComponentRendering } from '@sitecore-content-sdk/nextjs';

export interface WysiwygBlockFields {
  content?: {
    jsonValue?: RichTextField;
    value?: string;
  };
  Content?: {
    jsonValue?: RichTextField;
    value?: string;
  };
  anchorId?: {
    jsonValue?: Field<string>;
    value?: string;
  };
  AnchorId?: {
    jsonValue?: Field<string>;
    value?: string;
  };
  data?: {
    datasource?: {
      content?: {
        jsonValue?: RichTextField;
        value?: string;
      };
      anchorId?: {
        jsonValue?: Field<string>;
        value?: string;
      };
    };
  };
  /** CTA button link (can be media or regular) */
  CTALink?: {
    value?: {
      href?: string;
      text?: string;
      title?: string;
      linktype?: string;
      url?: string;
      target?: string;
    };
    jsonValue?: any;
  };
  /** Opens media link in a new browser tab */
  OpenInBrowser?: { value: boolean };
  /** Triggers a file download for media links */
  Download?: { value: boolean };
  /** Shows contact form modal instead of following the link */
  IsShowModel?: { value: boolean };
  [key: string]: any; // For dynamic field access
}

export interface WysiwygBlockProps {
  rendering?: ComponentRendering & {
    componentName?: string;
    fields?: WysiwygBlockFields;
  };
  fields?: WysiwygBlockFields;
  className?: string;
  params?: {
    Design?: string;
    Styles?: string;
    styles?: string;
    RenderingIdentifier?: string;
    Variant?: string;
    variant?: string;
    renderingVariant?: string;
    [key: string]: any;
  };
  variant?: string;
  [key: string]: unknown;
}
