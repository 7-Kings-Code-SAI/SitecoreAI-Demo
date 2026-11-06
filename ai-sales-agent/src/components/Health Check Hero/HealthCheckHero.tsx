'use client';

import { JSX, useEffect } from 'react';
import {
  RichText,
  Image,
  Link,
  Field,
  withDatasourceCheck,
  useSitecore,
} from '@sitecore-content-sdk/nextjs';
import { motion } from 'framer-motion';
import { HealthCheckHeroProps } from './HealthCheckHero.props';

// Normalizes field value and preserves Page Builder editable metadata
const normalizeField = (field: any): Field<string> | any => {
  if (field === null || field === undefined) return undefined;
  if (typeof field === 'string') return { value: field };
  if (typeof field === 'object') {
    if (field.jsonValue !== undefined) {
      const inner =
        typeof field.jsonValue === 'object' && field.jsonValue !== null
          ? { ...field.jsonValue }
          : { value: field.jsonValue };

      return {
        ...inner,
        metadata: field.metadata ?? inner.metadata,
        editable: field.editable ?? inner.editable,
      };
    }
    return field;
  }
  return field;
};

// Case-insensitive & space-tolerant field resolver supporting Layout Service and GraphQL
const resolveField = (fieldsObj: any, ...keys: string[]): any => {
  if (!fieldsObj) return undefined;
  for (const key of keys) {
    if (fieldsObj[key] !== undefined) return normalizeField(fieldsObj[key]);
  }
  const objKeys = Object.keys(fieldsObj);
  for (const key of keys) {
    const matchedKey = objKeys.find(
      (k) => k.toLowerCase().replace(/[\s_-]/g, '') === key.toLowerCase().replace(/[\s_-]/g, '')
    );
    if (matchedKey && fieldsObj[matchedKey] !== undefined) {
      return normalizeField(fieldsObj[matchedKey]);
    }
  }
  return undefined;
};

const HealthCheckHero = ({ fields }: HealthCheckHeroProps): JSX.Element => {
  const { page } = useSitecore();
  const isEditing = Boolean(page?.mode?.isEditing);

  // Extract datasource fields or raw fields (supports Layout Service and GraphQL responses)
  const rawFields: any =
    (fields as any)?.data?.datasource?.fields ||
    (fields as any)?.data?.datasource ||
    (fields as any)?.fields ||
    fields ||
    {};

  const heroImage = resolveField(rawFields, 'HeroImage', 'Hero Image');
  const logo = resolveField(rawFields, 'Logo');
  const badgeText = resolveField(rawFields, 'BadgeText', 'Badge Text');
  const title = resolveField(rawFields, 'Title');
  const subtitle = resolveField(rawFields, 'Subtitle');
  const pill1Text = resolveField(rawFields, 'Pill1_Text', 'Pill1 Text', 'Pill 1 Text');
  const pill1Subtext = resolveField(rawFields, 'Pill1_Subtext', 'Pill1 Subtext', 'Pill 1 Subtext');
  const pill2Text = resolveField(rawFields, 'Pill2_Text', 'Pill2 Text', 'Pill 2 Text');
  const pill2Subtext = resolveField(rawFields, 'Pill2_Subtext', 'Pill2 Subtext', 'Pill 2 Subtext');
  const pill3Text = resolveField(rawFields, 'Pill3_Text', 'Pill3 Text', 'Pill 3 Text');
  const pill3Subtext = resolveField(rawFields, 'Pill3_Subtext', 'Pill3 Subtext', 'Pill 3 Subtext');
  const primaryCta = resolveField(rawFields, 'PrimaryCta', 'Primary CTA');
  const secondaryLink = resolveField(rawFields, 'SecondaryLink', 'Secondary Link');

  // Activate transparent header and footer while this hero page is mounted, and cache hero background for PDF
  useEffect(() => {
    document.body.classList.add('health-check-hero-active');
    try {
      const heroSrc =
        heroImage?.value?.src ||
        heroImage?.src ||
        heroImage?.jsonValue?.value?.src ||
        (typeof heroImage === 'string' ? heroImage : '');
      if (heroSrc) {
        sessionStorage.setItem('hygiene-hero-image', heroSrc);
      }
    } catch {
      // Ignore storage errors
    }

    return () => {
      document.body.classList.remove('health-check-hero-active');
    };
  }, [heroImage]);

  return (
    <>
      {/* Global styling to allow the full-bleed hero background to extend behind the header and footer */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            body:has(.health-check-hero-root),
            body.health-check-hero-active {
              background-color: #f1ebe6 !important;
            }
            body:has(.health-check-hero-root) header,
            body:has(.health-check-hero-root) #header,
            body:has(.health-check-hero-root) #header header,
            body:has(.health-check-hero-root) #header .bg-white,
            body:has(.health-check-hero-root) main,
            body:has(.health-check-hero-root) #content,
            body:has(.health-check-hero-root) footer,
            body:has(.health-check-hero-root) #footer,
            body:has(.health-check-hero-root) #footer footer,
            body:has(.health-check-hero-root) #footer > div,
            body:has(.health-check-hero-root) #footer .bg-white,
            body.health-check-hero-active header,
            body.health-check-hero-active #header,
            body.health-check-hero-active #header header,
            body.health-check-hero-active #header .bg-white,
            body.health-check-hero-active main,
            body.health-check-hero-active #content,
            body.health-check-hero-active footer,
            body.health-check-hero-active #footer,
            body.health-check-hero-active #footer footer,
            body.health-check-hero-active #footer > div,
            body.health-check-hero-active #footer .bg-white {
              background-color: transparent !important;
              background: transparent !important;
              border-color: transparent !important;
              box-shadow: none !important;
            }
          `,
        }}
      />

      {/* Full-viewport background image spanning seamlessly behind header, hero, and footer */}
      <div
        className={`fixed inset-0 -z-10 w-full h-full overflow-hidden bg-[#f1ebe6] ${
          isEditing ? 'z-0 pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        <Image
          field={heroImage}
          className="w-full h-full object-cover object-center"
        />
      </div>

      <section className="health-check-hero-root relative flex flex-col items-center justify-center w-full min-h-[calc(100vh-140px)] py-8 md:py-14 px-4 overflow-visible">
        {/* Main Glassmorphism Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative z-10 flex flex-col items-center w-full max-w-4xl p-6 pt-12 sm:p-8 sm:pt-14 md:p-12 md:pt-16 bg-white/45 backdrop-blur-2xl rounded-3xl border border-white/70 shadow-2xl shadow-stone-900/5"
        >
          {/* Top Right Overlapping Brand Badge / Logo */}
          <div className="absolute -top-7 -right-4 sm:-top-8 sm:-right-6 md:-top-10 md:-right-8 z-20 w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36 drop-shadow-xl select-none">
            <Image
              field={logo}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Top Center Overlapping Badge */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-2 bg-white rounded-full shadow-md border border-gray-100 z-20 whitespace-nowrap">
            <span className="text-xs sm:text-sm font-bold tracking-normal text-gray-900 select-none [&_p]:inline [&_p]:m-0 [&_.ck-content]:inline">
              <RichText field={badgeText} />
            </span>
          </div>

          {/* Title - Page Builder friendly with rich formatting & red highlight support */}
          <h1 className="max-w-2xl mt-4 text-3xl font-black text-center text-gray-900 sm:text-4xl md:text-[44px] leading-[1.18] tracking-tight [&_p]:inline [&_p]:m-0 [&_.ck-content]:inline [&_span]:text-[#e2001a]">
            <RichText field={title} />
          </h1>

          {/* Divider */}
          <div className="w-24 h-[1.5px] mt-6 mb-2 bg-gray-400/30 mx-auto rounded-full" />

          {/* Subtitle */}
          <div className="mt-4 text-base sm:text-lg md:text-xl font-bold text-gray-500 text-center max-w-xl mx-auto [&_p]:inline [&_p]:m-0 [&_.ck-content]:inline">
            <RichText field={subtitle} />
          </div>

          {/* 3 Stat Pills - Renders RichText without escaping HTML and cleans <p> margins */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-8 md:mt-10">
            {/* Pill 1 */}
            <div className="flex flex-col justify-center p-5 bg-white rounded-2xl shadow-sm border border-white/80 text-left">
              <div className="text-2xl md:text-[26px] font-bold text-[#e2001a] leading-tight [&_p]:inline [&_p]:m-0 [&_.ck-content]:inline">
                <RichText field={pill1Text} />
              </div>
              <div className="text-xs md:text-sm text-gray-500 font-normal mt-1 leading-snug [&_p]:inline [&_p]:m-0 [&_.ck-content]:inline">
                <RichText field={pill1Subtext} />
              </div>
            </div>

            {/* Pill 2 */}
            <div className="flex flex-col justify-center p-5 bg-white rounded-2xl shadow-sm border border-white/80 text-left">
              <div className="text-2xl md:text-[26px] font-bold text-[#e2001a] leading-tight [&_p]:inline [&_p]:m-0 [&_.ck-content]:inline">
                <RichText field={pill2Text} />
              </div>
              <div className="text-xs md:text-sm text-gray-500 font-normal mt-1 leading-snug [&_p]:inline [&_p]:m-0 [&_.ck-content]:inline">
                <RichText field={pill2Subtext} />
              </div>
            </div>

            {/* Pill 3 */}
            <div className="flex flex-col justify-center p-5 bg-white rounded-2xl shadow-sm border border-white/80 text-left">
              <div className="text-2xl md:text-[26px] font-bold text-[#e2001a] leading-tight [&_p]:inline [&_p]:m-0 [&_.ck-content]:inline">
                <RichText field={pill3Text} />
              </div>
              <div className="text-xs md:text-sm text-gray-500 font-normal mt-1 leading-snug [&_p]:inline [&_p]:m-0 [&_.ck-content]:inline">
                <RichText field={pill3Subtext} />
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col items-center w-full mt-8 md:mt-10 space-y-4">
            <Link
              field={primaryCta as any}
              className="w-full max-w-sm px-10 py-3.5 md:py-4 font-bold text-center text-white transition-all duration-200 bg-[#e2001a] rounded-full hover:bg-[#c50017] shadow-lg shadow-red-500/30 text-sm md:text-base hover:shadow-xl hover:shadow-red-500/40 active:scale-[0.99]"
            />
            <Link
              field={secondaryLink as any}
              className="text-xs md:text-sm font-semibold text-gray-500 underline transition-colors hover:text-gray-800 underline-offset-4"
            />
          </div>
        </motion.div>
      </section>
    </>
  );
};

export const Default = withDatasourceCheck()<HealthCheckHeroProps>(HealthCheckHero);
export default Default;
export { HealthCheckHero };
