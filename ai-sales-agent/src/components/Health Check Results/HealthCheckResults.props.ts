import { Field, TextField, RichTextField, LinkField } from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

export interface TierFields {
  MinScore?: Field<number> | number;
  MaxScore?: Field<number> | number;
  BadgeLabel?: Field<string> | TextField | string;
  SummaryText?: Field<string> | RichTextField | string;
  GaugeColor?: Field<string> | TextField | string;
  [key: string]: unknown;
}

export interface HygieneTier {
  id?: string;
  name?: string;
  url?: string;
  fields?: TierFields | Array<{ name: string; value?: unknown }>;
  [key: string]: unknown;
}

export interface ZoneResult {
  name: string;
  earned: number;
  max: number;
  percentage: number;
}

export interface ConsultationModalFields {
  ModalTitle?: Field<string> | TextField | string;
  ModalDescription?: Field<string> | TextField | string;
  PhoneTabLabel?: Field<string> | TextField | string;
  EmailTabLabel?: Field<string> | TextField | string;
  ModalSubmitLabel?: Field<string> | TextField | string;
  SuccessRoute?: LinkField | any;
  [key: string]: unknown;
}

export interface ConsultationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  fields: ConsultationModalFields;
}

export interface HealthCheckResultsFields extends ConsultationModalFields {
  ScoreLabel?: Field<string> | TextField | string;
  ZoneBreakdownLabel?: Field<string> | TextField | string;
  DiscussCtaLabel?: Field<string> | TextField | string;
  DownloadCtaLabel?: Field<string> | TextField | string;
  Tiers?: HygieneTier[] | { targetItems?: HygieneTier[] };
  [key: string]: unknown;
}

export type HealthCheckResultsProps = ComponentProps & {
  fields: HealthCheckResultsFields;
  [key: string]: unknown;
};
