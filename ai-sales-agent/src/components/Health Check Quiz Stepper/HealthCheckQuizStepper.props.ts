import { Field, ImageField, LinkField, TextField } from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

export interface QuestionItemFields {
  QuestionNumber?: Field<string> | TextField | string | Field<number> | number;
  /** System key used for Salesforce payload routing (Single-Line Text) */
  ZoneKey?: Field<string> | TextField | string;
  /** Translated label displayed to the user (Single-Line Text) */
  ZoneLabel?: Field<string> | TextField | string;
  QuestionText?: Field<string> | TextField | string;
  ZoneImage?: ImageField;
  AnswerA_Text?: Field<string> | TextField | string;
  AnswerA_Points?: Field<number> | TextField | number;
  AnswerB_Text?: Field<string> | TextField | string;
  AnswerB_Points?: Field<number> | TextField | number;
  AnswerC_Text?: Field<string> | TextField | string;
  AnswerC_Points?: Field<number> | TextField | number;
  [key: string]: unknown;
}

export interface QuestionItem {
  id?: string;
  url?: string;
  name?: string;
  fields?: QuestionItemFields;
  [key: string]: unknown;
}

export interface HealthCheckQuizStepperFields {
  NextButtonText?: Field<string> | TextField | string;
  CalculateButtonText?: Field<string> | TextField | string;
  /** Format string with {0} = current step, {1} = total. E.g. "Question {0} / {1}" */
  StepFormat?: Field<string> | TextField | string;
  /** Dynamic General Link field for target results page */
  ResultsPageLink?: LinkField;
  Questions?: QuestionItem[] | { targetItems?: QuestionItem[] };
  [key: string]: unknown;
}

export type HealthCheckQuizStepperProps = ComponentProps & {
  fields: HealthCheckQuizStepperFields;
  [key: string]: unknown;
};
