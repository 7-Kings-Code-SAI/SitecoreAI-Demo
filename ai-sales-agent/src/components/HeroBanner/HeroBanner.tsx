"use client";

import { JSX } from 'react';
import {
  Text,
  RichText,
  Link as JssLink,
  Image as JssImage,
  Field,
  TextField,
  RichTextField,
  LinkField,
  ImageField,
} from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

export interface HeroBannerFields {
  'Label Text'?: TextField | Field<string> | string;
  Title?: TextField | Field<string> | string;
  Description?: RichTextField | TextField | Field<string> | string;
  'Primary CTA'?: LinkField;
  'Primary CTA Logo'?: ImageField | Field<string> | string;
  'Secondary CTA'?: LinkField;
  'Secondary CTA Logo'?: ImageField | Field<string> | string;
  'Territory CTA'?: LinkField;
  'Territory CTA Logo'?: ImageField | Field<string> | string;
  Footnote?: TextField | RichTextField | Field<string> | string;
  [key: string]: unknown;
}

export type HeroBannerVariant = 'default' | 'FullPage';

export interface HeroBannerProps extends Partial<ComponentProps> {
  fields?: HeroBannerFields | any;
  rendering?: any;
  params?: any;
  variant?: HeroBannerVariant;
}

/**
 * Universal field resolver supporting Layout Service, GraphQL, and array formats.
 */
const resolveField = (fieldsObj: any, ...keys: string[]) => {
  if (!fieldsObj) return undefined;

  // Handle array of fields (e.g. fields: [{ name: 'Title', jsonValue: ... }])
  if (Array.isArray(fieldsObj)) {
    for (const key of keys) {
      const found = fieldsObj.find(
        (f: any) =>
          f?.name?.toLowerCase() === key.toLowerCase() ||
          f?.displayName?.toLowerCase() === key.toLowerCase()
      );
      if (found) return found.jsonValue ?? found.value ?? found;
    }
  }

  // Handle object keyed by field name
  for (const key of keys) {
    if (fieldsObj[key] !== undefined) {
      const val = fieldsObj[key];
      return val?.jsonValue ?? val;
    }
    const matchKey = Object.keys(fieldsObj).find(
      (k) => k.toLowerCase() === key.toLowerCase()
    );
    if (matchKey && fieldsObj[matchKey] !== undefined) {
      const val = fieldsObj[matchKey];
      return val?.jsonValue ?? val;
    }
  }

  return undefined;
};

/**
 * Normalize text / rich-text fields so Sitecore SDK components (<Text>, <RichText>) can render them.
 */
const toTextField = (field: any): { value?: string; metadata?: any } | undefined => {
  if (!field) return undefined;
  if (field.value !== undefined || field.metadata !== undefined) return field;
  if (field.jsonValue) return field.jsonValue;
  if (typeof field === 'string') return { value: field };
  return undefined;
};

/**
 * Determines whether a field contains rich HTML content (e.g. CKEditor output).
 */
const isRichText = (field: any): boolean => {
  if (!field) return false;
  const val = field?.value || field?.jsonValue?.value || (typeof field === 'string' ? field : '');
  return typeof val === 'string' && /<[a-z][\s\S]*>/i.test(val);
};

/**
 * Normalize link fields for <Link> component.
 */
const toLinkField = (field: any): LinkField | undefined => {
  if (!field) return undefined;
  if (field.value !== undefined || (field as any).metadata !== undefined || field.href !== undefined) {
    return field;
  }
  if (field.jsonValue) return field.jsonValue;
  return undefined;
};

const hasLinkValue = (field?: LinkField): boolean => {
  if (!field) return false;
  const val = field.value || (field as any);
  return Boolean(val?.href || val?.text || (field as any)?.metadata);
};

const hasImageValue = (field?: any): boolean => {
  if (!field) return false;
  if (typeof field === 'string' && field.trim().length > 0) return true;
  const val = field?.value || field?.jsonValue?.value || field;
  return Boolean(val?.src || val?.href || field?.metadata);
};

/**
 * Renders an authored image/logo field from Sitecore media library or string URL.
 */
const RenderLogoField = ({ field, className }: { field: any; className?: string }): JSX.Element | null => {
  if (!field) return null;
  const val = field?.value || field?.jsonValue?.value || field;
  const src = val?.src || val?.href || (typeof field === 'string' ? field : '');
  const alt = val?.alt || val?.text || '';

  if (field?.metadata) {
    return <JssImage field={field} className={className} />;
  }

  if (src) {
    return <img src={src} alt={alt} className={className} />;
  }

  return null;
};

/* ============================================================
   DEFAULT HERO BANNER VARIANT (Default)
============================================================ */
export const DefaultHeroBanner = (props: HeroBannerProps): JSX.Element => {
  // Extract datasource fields from various possible Sitecore response structures
  const raw = props?.fields || props?.rendering?.fields;
  const fields = raw?.fields || raw;

  // Map Sitecore Content fields
  const labelTextField = toTextField(resolveField(fields, 'Label Text'));
  const titleField = toTextField(resolveField(fields, 'Title'));
  const descriptionField = toTextField(resolveField(fields, 'Description'));
  const footnoteField = toTextField(resolveField(fields, 'Footnote'));

  // CTA Links
  const primaryCtaField = toLinkField(resolveField(fields, 'Primary CTA'));
  const secondaryCtaField = toLinkField(resolveField(fields, 'Secondary CTA'));
  const territoryCtaField = toLinkField(resolveField(fields, 'Territory CTA'));

  // CTA Logos (Images)
  const primaryLogoField = resolveField(fields, 'Primary CTA Logo');
  const secondaryLogoField = resolveField(fields, 'Secondary CTA Logo');
  const territoryLogoField = resolveField(fields, 'Territory CTA Logo');

  const hasLabel = Boolean(labelTextField?.value || labelTextField?.metadata);
  const hasTitle = Boolean(titleField?.value || titleField?.metadata);
  const hasDesc = Boolean(descriptionField?.value || descriptionField?.metadata);
  const hasFootnote = Boolean(footnoteField?.value || footnoteField?.metadata);

  const hasPrimaryCta = hasLinkValue(primaryCtaField);
  const hasSecondaryCta = hasLinkValue(secondaryCtaField);
  const hasTerritoryCta = hasLinkValue(territoryCtaField);

  // Logos: When field is populated, show it; when empty, only show the CTA
  const hasPrimaryLogo = hasImageValue(primaryLogoField);
  const hasSecondaryLogo = hasImageValue(secondaryLogoField);
  const hasTerritoryLogo = hasImageValue(territoryLogoField);

  const isEditing = Boolean(
    titleField?.metadata ||
    descriptionField?.metadata ||
    labelTextField?.metadata ||
    footnoteField?.metadata ||
    props?.params?.isEditing
  );

  // Render individual CTA button with icon placed on the LEFT of the text
  const renderCtaButton = ({
    ctaField,
    logoField,
    hasLogo,
    className,
  }: {
    ctaField?: LinkField;
    logoField?: any;
    hasLogo: boolean;
    className: string;
  }) => {
    if (!hasLinkValue(ctaField) && !isEditing) {
      return null;
    }

    const logoElement = hasLogo ? (
      <RenderLogoField field={logoField} className="h-4 w-4 shrink-0 object-contain" />
    ) : null;

    const linkText =
      ctaField?.value?.text ||
      (ctaField as any)?.text ||
      (ctaField as any)?.jsonValue?.value?.text ||
      '';

    if (ctaField && (ctaField.value?.href || (ctaField as any)?.href || (ctaField as any)?.metadata)) {
      return (
        <JssLink
          field={ctaField}
          className={className}
        >
          {logoElement && (
            <span className="inline-flex shrink-0 items-center">
              {logoElement}
            </span>
          )}
          {linkText && <span>{linkText}</span>}
        </JssLink>
      );
    }

    if (isEditing && ctaField) {
      return (
        <JssLink field={ctaField} className={className}>
          {logoElement}
        </JssLink>
      );
    }

    return null;
  };

  return (
    <section
      className="relative w-full overflow-hidden py-16 sm:py-20 lg:py-24"
      style={{
        backgroundColor: "#ffffff",
        backgroundImage:
          "repeating-linear-gradient(to right, #fafcff 0px, #fafcff 64px, #ffffff 64px, #ffffff 128px)",
      }}
    >
      {/* Top & bottom gentle gradient masks to seamlessly blend stripes */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">

          {/* 1. Label Text (Eyebrow Badge) */}
          {(hasLabel || isEditing) && (
            <div className="mb-5 inline-flex items-center justify-center">
              <span className="inline-flex items-center rounded-full border border-[#cde5ff] bg-[#eef7ff] px-4 sm:px-5 py-1.5 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-[#079bea] shadow-sm backdrop-blur-sm">
                {labelTextField && <Text field={labelTextField} />}
              </span>
            </div>
          )}

          {/* 2. Title */}
          {(hasTitle || isEditing) && (
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-[52px] sm:leading-tight lg:leading-[1.18] [&_.ck-content]:inline [&_p]:inline [&_p]:m-0">
              {titleField && (isRichText(titleField) ? <RichText field={titleField} /> : <Text field={titleField} />)}
            </h1>
          )}

          {/* 3. Description */}
          {(hasDesc || isEditing) && (
            <div className="mt-5 text-sm sm:text-[15px] leading-relaxed text-slate-500 font-normal max-w-3xl mx-auto">
              {descriptionField && <RichText field={descriptionField} />}
            </div>
          )}

          {/* 4. CTAs Row */}
          {(hasPrimaryCta || hasSecondaryCta || hasTerritoryCta || isEditing) && (
            <div className="mt-8 sm:mt-9 flex flex-wrap items-center justify-center gap-3.5 sm:gap-4">

              {/* Primary CTA */}
              {(hasPrimaryCta || isEditing) &&
                renderCtaButton({
                  ctaField: primaryCtaField,
                  logoField: primaryLogoField,
                  hasLogo: hasPrimaryLogo,
                  className:
                    'group inline-flex items-center justify-center gap-2 rounded-full bg-[#079bea] px-6 sm:px-7 py-3 text-sm sm:text-base font-semibold text-white shadow-lg shadow-[#079bea]/30 transition-all duration-200 hover:bg-[#068bd4] hover:shadow-xl hover:shadow-[#079bea]/40 hover:-translate-y-0.5 active:translate-y-0',
                })}

              {/* Secondary CTA */}
              {(hasSecondaryCta || isEditing) &&
                renderCtaButton({
                  ctaField: secondaryCtaField,
                  logoField: secondaryLogoField,
                  hasLogo: hasSecondaryLogo,
                  className:
                    'group inline-flex items-center justify-center gap-2 rounded-full border border-[#079bea] bg-white px-6 sm:px-7 py-3 text-sm sm:text-base font-semibold text-slate-800 transition-all duration-200 hover:bg-blue-50/40 hover:-translate-y-0.5 active:translate-y-0 shadow-sm',
                })}

              {/* Territory / Tertiary CTA */}
              {(hasTerritoryCta || isEditing) &&
                renderCtaButton({
                  ctaField: territoryCtaField,
                  logoField: territoryLogoField,
                  hasLogo: hasTerritoryLogo,
                  className:
                    'group inline-flex items-center justify-center gap-2 rounded-full bg-[#079bea] px-6 sm:px-7 py-3 text-sm sm:text-base font-semibold text-white shadow-lg shadow-[#079bea]/30 transition-all duration-200 hover:bg-[#068bd4] hover:shadow-xl hover:shadow-[#079bea]/40 hover:-translate-y-0.5 active:translate-y-0',
                })}
            </div>
          )}

          {/* 5. Footnote */}
          {(hasFootnote || isEditing) && (
            <div className="mt-7 text-xs sm:text-[13px] text-slate-500 font-normal tracking-wide text-center">
              {footnoteField && <Text field={footnoteField} />}
            </div>
          )}

        </div>
      </div>
    </section>
  );
};

/* ============================================================
   FULLPAGE HERO BANNER VARIANT (FullPage)
   All Hero Banner fields and logic are included here so they
   can be customized/adjusted according to the FullPage requirements.
============================================================ */
export const FullPage = (props: HeroBannerProps): JSX.Element => {
  // Extract datasource fields from various possible Sitecore response structures
  const raw = props?.fields || props?.rendering?.fields;
  const fields = raw?.fields || raw;

  // Map Sitecore Content fields (Identical field schema)
  const labelTextField = toTextField(resolveField(fields, 'Label Text'));
  const titleField = toTextField(resolveField(fields, 'Title'));
  const descriptionField = toTextField(resolveField(fields, 'Description'));
  const footnoteField = toTextField(resolveField(fields, 'Footnote'));

  // CTA Links
  const primaryCtaField = toLinkField(resolveField(fields, 'Primary CTA'));
  const secondaryCtaField = toLinkField(resolveField(fields, 'Secondary CTA'));
  const territoryCtaField = toLinkField(resolveField(fields, 'Territory CTA'));

  // CTA Logos (Images)
  const primaryLogoField = resolveField(fields, 'Primary CTA Logo');
  const secondaryLogoField = resolveField(fields, 'Secondary CTA Logo');
  const territoryLogoField = resolveField(fields, 'Territory CTA Logo');

  const hasLabel = Boolean(labelTextField?.value || labelTextField?.metadata);
  const hasTitle = Boolean(titleField?.value || titleField?.metadata);
  const hasDesc = Boolean(descriptionField?.value || descriptionField?.metadata);
  const hasFootnote = Boolean(footnoteField?.value || footnoteField?.metadata);

  const hasPrimaryCta = hasLinkValue(primaryCtaField);
  const hasSecondaryCta = hasLinkValue(secondaryCtaField);
  const hasTerritoryCta = hasLinkValue(territoryCtaField);

  // Logos: When field is populated, show it; when empty, only show the CTA
  const hasPrimaryLogo = hasImageValue(primaryLogoField);
  const hasSecondaryLogo = hasImageValue(secondaryLogoField);
  const hasTerritoryLogo = hasImageValue(territoryLogoField);

  const isEditing = Boolean(
    titleField?.metadata ||
    descriptionField?.metadata ||
    labelTextField?.metadata ||
    footnoteField?.metadata ||
    props?.params?.isEditing
  );

  // Render individual CTA button with icon placed on the LEFT of the text
  const renderCtaButton = ({
    ctaField,
    logoField,
    hasLogo,
    className,
  }: {
    ctaField?: LinkField;
    logoField?: any;
    hasLogo: boolean;
    className: string;
  }) => {
    if (!hasLinkValue(ctaField) && !isEditing) {
      return null;
    }

    const logoElement = hasLogo ? (
      <RenderLogoField field={logoField} className="h-4 w-4 shrink-0 object-contain" />
    ) : null;

    const linkText =
      ctaField?.value?.text ||
      (ctaField as any)?.text ||
      (ctaField as any)?.jsonValue?.value?.text ||
      '';

    if (ctaField && (ctaField.value?.href || (ctaField as any)?.href || (ctaField as any)?.metadata)) {
      return (
        <JssLink
          field={ctaField}
          className={className}
        >
          {logoElement && (
            <span className="inline-flex shrink-0 items-center">
              {logoElement}
            </span>
          )}
          {linkText && <span>{linkText}</span>}
        </JssLink>
      );
    }

    if (isEditing && ctaField) {
      return (
        <JssLink field={ctaField} className={className}>
          {logoElement}
        </JssLink>
      );
    }

    return null;
  };

  return (
    <section
      className="relative w-full overflow-hidden py-16 sm:py-20 lg:py-24"
      style={{
        backgroundColor: "#ffffff",
        backgroundImage:
          "repeating-linear-gradient(to right, #fafcff 0px, #fafcff 64px, #ffffff 64px, #ffffff 128px)",
      }}
    >
      {/* Top & bottom gentle gradient masks to seamlessly blend stripes */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">

          {/* 1. Label Text (Eyebrow Badge) */}
          {(hasLabel || isEditing) && (
            <div className="mb-5 inline-flex items-center justify-center">
              <span className="inline-flex items-center rounded-full border border-[#cde5ff] bg-[#eef7ff] px-4 sm:px-5 py-1.5 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-[#079bea] shadow-sm backdrop-blur-sm">
                {labelTextField && <Text field={labelTextField} />}
              </span>
            </div>
          )}

          {/* 2. Title */}
          {(hasTitle || isEditing) && (
            <h1 className="max-w-[650px] mx-auto text-[20px] lg:text-[32px] font-[600] text-slate-900 sm:text-5xl sm:leading-tight lg:leading-[1.18] [&_.ck-content]:inline [&_p]:inline [&_p]:m-0">
              {titleField && (isRichText(titleField) ? <RichText field={titleField} /> : <Text field={titleField} />)}
            </h1>
          )}

          {/* 3. Description */}
          {(hasDesc || isEditing) && (
            <div className="max-w-[888px] mt-5 text-[15px] leading-[24px] text-slate-500 font-normal mx-auto">
              {descriptionField && <RichText field={descriptionField} />}
            </div>
          )}

          {/* 4. CTAs Row */}
          {(hasPrimaryCta || hasSecondaryCta || hasTerritoryCta || isEditing) && (
            <div className="mt-8 sm:mt-9 flex flex-wrap items-center justify-center gap-3.5 sm:gap-4">

              {/* Primary CTA */}
              {(hasPrimaryCta || isEditing) &&
                renderCtaButton({
                  ctaField: primaryCtaField,
                  logoField: primaryLogoField,
                  hasLogo: hasPrimaryLogo,
                  className:
                    'group inline-flex items-center justify-center gap-2 rounded-full bg-[#079bea] px-6 sm:px-7 py-3 text-sm sm:text-base font-semibold text-white shadow-lg shadow-[#079bea]/30 transition-all duration-200 hover:bg-[#068bd4] hover:shadow-xl hover:shadow-[#079bea]/40 hover:-translate-y-0.5 active:translate-y-0',
                })}

              {/* Secondary CTA */}
              {(hasSecondaryCta || isEditing) &&
                renderCtaButton({
                  ctaField: secondaryCtaField,
                  logoField: secondaryLogoField,
                  hasLogo: hasSecondaryLogo,
                  className:
                    'group inline-flex items-center justify-center gap-2 rounded-full border border-[#079bea] bg-white px-6 sm:px-7 py-3 text-sm sm:text-base font-semibold text-slate-800 transition-all duration-200 hover:bg-blue-50/40 hover:-translate-y-0.5 active:translate-y-0 shadow-sm',
                })}

              {/* Territory / Tertiary CTA */}
              {(hasTerritoryCta || isEditing) &&
                renderCtaButton({
                  ctaField: territoryCtaField,
                  logoField: territoryLogoField,
                  hasLogo: hasTerritoryLogo,
                  className:
                    'group inline-flex items-center justify-center gap-2 rounded-full bg-[#079bea] px-6 sm:px-7 py-3 text-sm sm:text-base font-semibold text-white shadow-lg shadow-[#079bea]/30 transition-all duration-200 hover:bg-[#068bd4] hover:shadow-xl hover:shadow-[#079bea]/40 hover:-translate-y-0.5 active:translate-y-0',
                })}
            </div>
          )}

          {/* 5. Footnote */}
          {(hasFootnote || isEditing) && (
            <div className="mt-7 text-xs sm:text-[13px] text-slate-500 font-semibold  tracking-wide text-center">
              {footnoteField && <Text field={footnoteField} />}
            </div>
          )}

        </div>
      </div>
    </section>
  );
};

/* ============================================================
   MAIN COMPONENT & VARIANT ROUTER
============================================================ */
export const HeroBanner = (props: HeroBannerProps): JSX.Element => {
  // Auto-detect variant from props or Sitecore rendering params (FieldNames, Variant, variant, renderingVariant)
  const rawVariant =
    props?.variant ||
    props?.params?.FieldNames ||
    props?.params?.Variant ||
    props?.params?.variant ||
    props?.params?.renderingVariant;

  const isFullPage =
    rawVariant === 'FullPage' ||
    (typeof rawVariant === 'string' && rawVariant.toLowerCase().replace(/[\s-_]/g, '') === 'fullpage');

  if (isFullPage) {
    return <FullPage {...props} />;
  }

  return <DefaultHeroBanner {...props} />;
};

/* ============================================================
   VARIANT EXPORTS FOR SITECORE CONTENT SDK
============================================================ */
export const Default = (props: HeroBannerProps): JSX.Element => (
  <HeroBanner {...props} variant="default" />
);

export const fullPage = FullPage;

export default HeroBanner;

