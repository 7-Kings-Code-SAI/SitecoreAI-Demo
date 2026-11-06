import { Field, ImageField, LinkField, TextField, RichTextField } from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

export interface HealthCheckHeroFields {
  BadgeText?: Field<string> | TextField | RichTextField | string;
  Logo?: ImageField;
  Title?: Field<string> | TextField | RichTextField | string;
  Subtitle?: Field<string> | TextField | RichTextField | string;
  Pill1_Text?: Field<string> | TextField | RichTextField | string;
  Pill1_Subtext?: Field<string> | TextField | RichTextField | string;
  Pill2_Text?: Field<string> | TextField | RichTextField | string;
  Pill2_Subtext?: Field<string> | TextField | RichTextField | string;
  Pill3_Text?: Field<string> | TextField | RichTextField | string;
  Pill3_Subtext?: Field<string> | TextField | RichTextField | string;
  PrimaryCta?: LinkField;
  SecondaryLink?: LinkField;
  HeroImage?: ImageField;
  [key: string]: unknown;
}

export type HealthCheckHeroProps = ComponentProps & {
  fields: HealthCheckHeroFields;
  [key: string]: unknown;
};
