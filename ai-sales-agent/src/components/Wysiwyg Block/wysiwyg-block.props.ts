import { RichTextField, ComponentRendering } from '@sitecore-content-sdk/nextjs';

export interface WysiwygBlockFields {
  content?: {
    jsonValue?: RichTextField;
    value?: string;
  };
  Content?: {
    jsonValue?: RichTextField;
    value?: string;
  };

  data?: {
    datasource?: {
      content?: {
        jsonValue?: RichTextField;
        value?: string;
      };

    };
  };
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