import { Field, LinkField, Item } from '@sitecore-content-sdk/nextjs';

// Define the structure of an individual flat FAQ Item
export interface FAQItem extends Item {
  id: string;
  fields: {
    'Category Name': Field<string>;
    Question: Field<string>;
    Answer: Field<string>;
  };
}

export interface FAQSectionProps {
  params: { [key: string]: string };
  fields: {
    'Label Text'?: Field<string>;
    'Main Title'?: Field<string>;
    Description?: Field<string>;
    'FAQ Items'?: FAQItem[];
    'Banner Title'?: Field<string>;
    'Banner Description'?: Field<string>;
    'Primary CTA'?: LinkField;
    'Secondary CTA'?: LinkField;
  };
}
