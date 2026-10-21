import { Field, ImageField, RichTextField, ComponentRendering } from '@sitecore-content-sdk/nextjs';

export interface FeedbackCardFields {
  Avatar?: ImageField;
  avatar?: ImageField;
  Role?: Field<string>;
  role?: Field<string>;
  Company?: Field<string>;
  company?: Field<string>;
  QuoteText?: Field<string>;
  quoteText?: Field<string>;
  'Quote Text'?: Field<string>;
  BadgeText?: Field<string>;
  badgeText?: Field<string>;
  'Badge Text'?: Field<string>;
  [key: string]: unknown;
}

export interface FeedbackCardItem {
  id?: string;
  name?: string;
  fields?: FeedbackCardFields | Array<{ name: string; value?: unknown }>;
  [key: string]: unknown;
}

export interface FeedbackSectionFields {
  Heading?: Field<string>;
  heading?: Field<string>;
  Subheading?: RichTextField;
  subheading?: RichTextField;
  'Sub Heading'?: RichTextField;
  CenterLogo?: ImageField;
  centerLogo?: ImageField;
  'Center Logo'?: ImageField;
  FeedbackCards?: FeedbackCardItem[] | { targetItems?: FeedbackCardItem[] };
  'Feedback Cards'?: FeedbackCardItem[] | { targetItems?: FeedbackCardItem[] };
  feedbackCards?: FeedbackCardItem[] | { targetItems?: FeedbackCardItem[] };
  [key: string]: unknown;
}

export interface FeedbackSectionProps {
  rendering?: ComponentRendering;
  params?: { [key: string]: string };
  fields?: {
    data?: {
      datasource?: {
        fields?: FeedbackSectionFields | Array<{ name: string; value?: unknown }>;
        feedbackCards?: { targetItems?: FeedbackCardItem[] };
        'Feedback Cards'?: { targetItems?: FeedbackCardItem[] };
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    [key: string]: unknown;
  } | FeedbackSectionFields;
}
