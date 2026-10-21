'use client';

import React from 'react';
import { Text, RichText, Image as JssImage, useSitecore } from '@sitecore-content-sdk/nextjs';
import {
  FeedbackSectionProps,
  FeedbackSectionFields,
  FeedbackCardFields,
} from './FeedbackSection.props';

// --- Helper: Preserves metadata & editable while normalizing fields for Pages ---
const normalizeSitecoreField = (field: any) => {
  if (field === null || field === undefined) return field;
  if (typeof field === 'string') return { value: field };
  if (typeof field !== 'object') return field;

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
};

// --- Helper: Maps flat fields array directly to JSON objects while preserving metadata ---
const mapSitecoreFields = (fieldsArray: any[]) => {
  if (!Array.isArray(fieldsArray)) return {};
  return fieldsArray.reduce(
    (acc, field) => {
      acc[field.name] = normalizeSitecoreField(field);
      return acc;
    },
    {} as Record<string, any>
  );
};

// --- Helper: Resolves field by name with case/spacing fallback ---
const resolveField = (fieldsObj: Record<string, any>, ...keys: string[]): any => {
  if (!fieldsObj) return undefined;
  for (const key of keys) {
    if (fieldsObj[key] !== undefined) return fieldsObj[key];
  }
  const objKeys = Object.keys(fieldsObj);
  for (const key of keys) {
    const matchedKey = objKeys.find(
      (k) => k.toLowerCase().replace(/[\s_-]/g, '') === key.toLowerCase().replace(/[\s_-]/g, '')
    );
    if (matchedKey && fieldsObj[matchedKey] !== undefined) {
      return fieldsObj[matchedKey];
    }
  }
  return undefined;
};

// --- Helper: Safely extracts and normalizes fields from a card item ---
const getCardFields = (card: any): FeedbackCardFields => {
  if (!card) return {};
  if (Array.isArray(card.fields)) {
    return mapSitecoreFields(card.fields);
  }
  if (card.fields && typeof card.fields === 'object') {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(card.fields)) {
      res[k] = normalizeSitecoreField(v);
    }
    return res;
  }
  return card;
};

export const Default: React.FC<FeedbackSectionProps> = (props: any) => {
  const { page } = useSitecore();
  const isEditing = Boolean(
    page?.mode?.isEditing || props?.params?.isEditing || props?.rendering?.params?.isEditing
  );

  const fields = props?.fields;
  const datasource = fields?.data?.datasource;
  if (!datasource && !fields && !isEditing) return null;

  // Transform parent fields (supports GraphQL datasource or standard Layout Service)
  let data: FeedbackSectionFields = {};
  if (datasource) {
    data = Array.isArray(datasource.fields)
      ? mapSitecoreFields(datasource.fields)
      : datasource.fields || {};
  } else if (fields) {
    data = Array.isArray(fields) ? mapSitecoreFields(fields) : (fields as FeedbackSectionFields);
  }

  // Safely extract Checklist items (handles standard JSS arrays, checklist data, or Edge targetItems)
  const checklistData =
    resolveField(data, 'Feedback Cards', 'FeedbackCards', 'feedbackCards') ||
    (datasource as any)?.feedbackCards?.targetItems ||
    (datasource as any)?.['Feedback Cards']?.targetItems;

  const rawCards: any[] = Array.isArray(checklistData)
    ? checklistData
    : checklistData?.targetItems || [];

  // Strictly deduplicate by ID to ensure exactly one card per Sitecore item
  const uniqueCards = rawCards.filter((card, index, self) => {
    if (!card?.id) return true;
    return index === self.findIndex((c) => c?.id === card?.id);
  });

  // When editing with no cards selected yet, provide a fallback card for inline authoring
  const cards =
    uniqueCards.length > 0
      ? uniqueCards
      : isEditing
        ? [{ id: 'feedback-card-placeholder', fields: {} }]
        : [];

  // Extract top-level fields with flexible matching
  const heading = resolveField(data, 'Heading', 'heading', 'Title');
  const subheading = resolveField(data, 'Subheading', 'Sub Heading', 'subheading', 'SubTitle');
  const centerLogo = resolveField(data, 'Center Logo', 'CenterLogo', 'centerLogo', 'Logo');

  const hasCenterLogo = Boolean(
    centerLogo?.value?.src ||
    (centerLogo as any)?.src ||
    (centerLogo as any)?.metadata ||
    (centerLogo as any)?.editable ||
    isEditing
  );

  // Build seamless infinite translation track
  const baseCards =
    cards.length >= 4
      ? cards
      : cards.length === 3
        ? [...cards, ...cards]
        : cards.length === 2
          ? [...cards, ...cards, ...cards]
          : cards.length === 1
            ? [...cards, ...cards, ...cards, ...cards, ...cards, ...cards]
            : [];

  const infiniteCards = [...baseCards, ...baseCards];

  // Column that contains ONLY this section (ignoring <style>/<code> chrome nodes)
  const onlyFeedback =
    ':has(> .feedback-section):not(:has(> :not(.feedback-section, style, code, script)))';
  const feedbackColumn = `.column-splitter > div > div${onlyFeedback}`;

  return (
    <section className="feedback-section relative hidden lg:flex w-full h-full min-h-screen bg-[#30A3FF] overflow-hidden flex-col justify-between py-12 md:py-14 font-sans select-none">
      {/* Self-contained CSS for smooth continuous infinite translation and hiding scrollbars */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes infiniteMarquee {
              0% {
                transform: translate3d(0, 0, 0);
              }
              100% {
                transform: translate3d(-50%, 0, 0);
              }
            }
            .animate-infinite-marquee {
              display: flex;
              width: max-content;
              animation: infiniteMarquee 26s linear infinite;
              will-change: transform;
            }
            .animate-infinite-marquee:hover {
              animation-play-state: paused;
            }
            .no-scrollbar::-webkit-scrollbar {
              display: none;
            }
            .no-scrollbar {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
              @media (max-width: 1023px) {
  ${feedbackColumn} { display: none !important; }
  ${feedbackColumn} ~ div {
    width: 100% !important;
    flex-basis: 100% !important;
    --left-col-width: 0% !important;
  }
}
          `,
        }}
      />

      {/* Decorative Dots Top-Right Corner */}
      <div className="absolute top-0 right-0 p-3 sm:p-4 grid grid-cols-6 gap-3 opacity-30 pointer-events-none z-0">
        {[...Array(36)].map((_, i) => (
          <div key={`tr-${i}`} className="w-1.5 h-1.5 rounded-full bg-white"></div>
        ))}
      </div>

      {/* Decorative Dots Bottom-Left Corner */}
      <div className="absolute bottom-0 left-0 p-3 sm:p-4 grid grid-cols-6 gap-3 opacity-30 pointer-events-none z-0">
        {[...Array(36)].map((_, i) => (
          <div key={`bl-${i}`} className="w-1.5 h-1.5 rounded-full bg-white"></div>
        ))}
      </div>

      {/* Top Content: Heading and Subheading matching exact typography */}
      <div className="w-full px-8 md:px-10 lg:px-12 relative z-10 pt-2">
        <div className="max-w-md text-white">
          <h2 className="text-[32px] sm:text-[34px] md:text-[36px] font-bold leading-[1.18] mb-4 tracking-[-0.02em] text-white">
            <Text field={heading} editable={true} />
          </h2>
          <div className="text-[14px] sm:text-[14.5px] text-white/95 leading-[1.55] font-normal">
            <RichText field={subheading} editable={true} />
          </div>
        </div>
      </div>

      {/* Center Logo: Crisp pure white matching screenshot */}
      {hasCenterLogo && (
        <div className="flex justify-center items-center my-auto py-8 relative z-10 px-6">
          <div
            className={`relative flex items-center justify-center ${
              isEditing && !centerLogo?.value?.src
                ? 'min-h-[48px] min-w-[140px] border-2 border-dashed border-white/60 rounded-xl p-2 bg-white/10'
                : ''
            }`}
          >
            <JssImage
              field={centerLogo || { value: {} }}
              className="h-7 md:h-8 w-auto object-contain max-h-8 brightness-0 invert"
              editable={true}
            />
            {isEditing && !centerLogo?.value?.src && !centerLogo?.editable && (
              <span className="text-xs text-white/90 font-medium">Click to select Center Logo</span>
            )}
          </div>
        </div>
      )}

      {/* Cards Infinite Translation with Left & Right Blue Shading */}
      <div className="relative w-full overflow-hidden z-10 pt-2 pb-6 group">
        {/* Left Edge Blue Gradient Shading */}
        <div className="absolute top-0 left-0 w-16 sm:w-20 md:w-28 h-full bg-gradient-to-r from-[#30A3FF] via-[#30A3FF]/80 to-transparent z-20 pointer-events-none" />

        {/* Right Edge Blue Gradient Shading */}
        <div className="absolute top-0 right-0 w-16 sm:w-20 md:w-28 h-full bg-gradient-to-l from-[#30A3FF] via-[#30A3FF]/80 to-transparent z-20 pointer-events-none" />

        <div className="animate-infinite-marquee flex gap-5 w-max group-hover:[animation-play-state:paused]">
          {infiniteCards.map((card: any, index: number) => {
            const isOriginal = index < cards.length;
            const cardFields = getCardFields(card);

            const avatar = resolveField(cardFields, 'Avatar', 'avatar', 'Image', 'Photo');
            const role = resolveField(cardFields, 'Role', 'role', 'Title', 'Job Title');
            const company = resolveField(cardFields, 'Company', 'company', 'Organization');
            const quoteText = resolveField(
              cardFields,
              'Quote Text',
              'QuoteText',
              'quoteText',
              'Quote'
            );
            const badgeText = resolveField(
              cardFields,
              'Badge Text',
              'BadgeText',
              'badgeText',
              'Badge'
            );

            return (
              <div
                key={isOriginal ? card.id || `feedback-card-${index}` : `clone-card-${index}`}
                aria-hidden={!isOriginal}
                className="w-[300px] sm:w-[315px] md:w-[320px] shrink-0 bg-white rounded-2xl p-6 shadow-xl shadow-black/5 flex flex-col justify-between min-h-[256px]"
              >
                <div>
                  {/* Header: Avatar (Circle) + Info */}
                  <div className="flex items-center gap-3.5 mb-4">
                    <div className="w-12 h-12 shrink-0 rounded-full overflow-hidden bg-slate-100 border border-slate-100 flex items-center justify-center relative [&_.scEmptyImage]:!w-full [&_.scEmptyImage]:!h-full">
                      <JssImage
                        field={avatar || { value: {} }}
                        className="w-full h-full object-cover"
                        editable={isOriginal && isEditing}
                      />
                      {isOriginal && isEditing && !avatar?.value?.src && !avatar?.editable && (
                        <span className="absolute text-[10px] text-slate-400 font-semibold pointer-events-none uppercase">
                          Avatar
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <h4 className="text-[14px] font-bold text-[#313C4E] leading-snug mb-0.5">
                        <Text field={role} editable={isOriginal && isEditing} />
                      </h4>
                      <span className="text-[12px] text-[#7E8B9B] font-normal leading-tight">
                        <Text field={company} editable={isOriginal && isEditing} />
                      </span>
                    </div>
                  </div>

                  {/* Quote */}
                  <p className="text-[13.5px] text-[#677587] leading-[1.6] font-normal mb-5">
                    {isOriginal && isEditing ? (
                      <Text field={quoteText} editable={true} />
                    ) : quoteText?.value ? (
                      <>
                        &ldquo;
                        <Text field={quoteText} editable={false} />
                        &rdquo;
                      </>
                    ) : (
                      <Text field={quoteText} editable={false} />
                    )}
                  </p>
                </div>

                {/* Badge: Yellow Star (#FFD158) + Verified Customer (#8C98A6) */}
                <div className="flex items-center gap-1.5 pt-1">
                  <svg
                    className="w-3.5 h-3.5 text-[#FFD158] shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-[11.5px] font-medium text-[#8C98A6] tracking-normal">
                    <Text field={badgeText} editable={isOriginal && isEditing} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Default;

