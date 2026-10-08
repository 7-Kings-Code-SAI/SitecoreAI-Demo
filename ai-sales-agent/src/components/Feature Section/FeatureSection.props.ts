import { Field, ImageField, LinkField, Item } from '@sitecore-content-sdk/nextjs';

export interface FeatureCard extends Item {
  id: string;
  fields: {
    'Card Title': Field<string>;
    'Card Description': Field<string>;
    'Widget UI Layout': Field<string>;
    'Widget Primary Highlight': Field<string>;
    'Widget Secondary Highlight': Field<string>;
    'Widget Badges': Field<string>;
    'Widget Quote Text': Field<string>;
    'Widget Label 1'?: Field<string>;
    'Widget Label 2'?: Field<string>;
    'Widget Label 3'?: Field<string>;
  };
}

export interface FeatureSectionProps {
  params?: { [key: string]: string };
  fields: {
    'Label Text'?: Field<string>;
    'Main Title': Field<string>;
    'Main Description'?: Field<string>;
    'CTA Button'?: LinkField;
    
    // Static Grid Left
    'Card 1 Icon'?: ImageField;
    'Card 1 Title'?: Field<string>;
    'Card 1 Description'?: Field<string>;
    'Card 2 Icon'?: ImageField;
    'Card 2 Title'?: Field<string>;
    'Card 2 Description'?: Field<string>;
    'Card 3 Icon'?: ImageField;
    'Card 3 Title'?: Field<string>;
    'Card 3 Description'?: Field<string>;
    'Card 4 Icon'?: ImageField;
    'Card 4 Title'?: Field<string>;
    'Card 4 Description'?: Field<string>;
    
    // Banner
    'Banner Title'?: Field<string>;
    'Banner Description'?: Field<string>;
    
    // Workflow Steps
    'Workflow Step 1 Icon'?: ImageField;
    'Step 1 Text Avatar'?: Field<string>;
    'Step 1 Title'?: Field<string>;
    'Step 1 Description'?: Field<string>;
    'Step 1 Horizontal Align'?: Field<boolean>;
    
    'Workflow Step 2 Icon'?: ImageField;
    'Step 2 Text Avatar'?: Field<string>;
    'Step 2 Title'?: Field<string>;
    'Step 2 Description'?: Field<string>;
    'Step 2 Horizontal Align'?: Field<boolean>;
    
    'Workflow Step 3 Icon'?: ImageField;
    'Step 3 Text Avatar'?: Field<string>;
    'Step 3 Title'?: Field<string>;
    'Step 3 Description'?: Field<string>;
    'Step 3 Horizontal Align'?: Field<boolean>;
    
    'Workflow Step 4 Icon'?: ImageField;
    'Step 4 Text Avatar'?: Field<string>;
    'Step 4 Title'?: Field<string>;
    'Step 4 Description'?: Field<string>;
    'Step 4 Horizontal Align'?: Field<boolean>;
    
    // Feature Cards
    'Feature Cards'?: FeatureCard[];
  };
}
