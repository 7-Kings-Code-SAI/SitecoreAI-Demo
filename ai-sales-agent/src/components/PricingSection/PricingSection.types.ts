import { Field, ImageField, LinkField, Item } from '@sitecore-content-sdk/nextjs';

export interface PricingCategory {
  id: string;
  fields: {
    'Category Name': Field<string>;
    'Highlight Badge': Field<string>;
    'Context Description': Field<string>;
  };
}

export interface PricingCard {
  id: string;
  fields: {
    'Linked Category': Item; // Droplink field
    'Tier Name': Field<string>;
    'Tier Icon': ImageField;
    'Popular Badge': Field<string>;
    'Price Value': Field<string>;
    'Price Unit': Field<string>;
    'Price Subtext': Field<string>;
    'CTA Button': LinkField;
    'Metric Features': Field<string>; // Name Value List (e.g., "Agents=5&Storage=15 days")
    'Included Features': Field<string>; // Rich Text bulleted list
  };
}

export interface PricingSectionProps {
  params: { [key: string]: string };
  fields: {
    'Label Text': Field<string>;
    'Main Title': Field<string>;
    'Main Description'?: Field<string>;
    'Description'?: Field<string>;
    'Categories List': PricingCategory[];
    'Pricing Cards': PricingCard[];
    // Enterprise Fields
    'Enterprise Badge': Field<string>;
    'Enterprise Title': Field<string>;
    'Enterprise Description': Field<string>;
    'Enterprise CTA': LinkField;
    'Enterprise Features': Field<string>;
    // Banner Fields
    'First Title'?: Field<string>;
    'First Description'?: Field<string>;
    'Second Title'?: Field<string>;
    'Second Description'?: Field<string>;
    'Third Title'?: Field<string>;
    'Third Description'?: Field<string>;
    'Third description'?: Field<string>;
  };
}
