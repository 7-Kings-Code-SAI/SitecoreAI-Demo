"use client";

import { useState, useMemo } from 'react';
import {
  Text,
  RichText,
  Image as JssImage,
  Link as JssLink,
  useSitecore,
} from '@sitecore-content-sdk/nextjs';
import type { Field } from '@sitecore-content-sdk/nextjs';
import { PricingSectionProps, PricingCategory, PricingCard } from './PricingSection.types';

// Helper to parse Sitecore Name Value List strings
const parseMetrics = (nameValueString?: string) => {
  if (!nameValueString) return [];
  return nameValueString.split('&').map((pair) => {
    const [key, value] = pair.split('=');
    return { key: decodeURIComponent(key || ''), value: decodeURIComponent(value || '') };
  });
};

export const Default = (props: PricingSectionProps) => {
  const { fields } = props;
  
  const categories = useMemo<PricingCategory[]>(() => fields?.['Categories List'] || [], [fields]);
  const allCards = useMemo<PricingCard[]>(() => fields?.['Pricing Cards'] || [], [fields]);

  const [activeCategoryId, setActiveCategoryId] = useState<string>(
    categories.length > 0 ? categories[0].id : ''
  );

  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing;

  if (!fields) return null;

  // Filter white cards based on the selected category toggle (show all if editing)
  const visibleCards = isEditing 
    ? allCards
    : allCards.filter((card: PricingCard) => card.fields['Linked Category']?.id === activeCategoryId);

  const activeCategory = categories.find((cat: PricingCategory) => cat.id === activeCategoryId);

  return (
    <section className="w-full bg-[#f8fafc] py-10 xl:py-12 px-4 md:px-6 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* --- HEADER --- */}
        <div className="text-center flex flex-col items-center mb-6 xl:mb-8">
          {fields['Label Text']?.value && (
            <div className="flex max-w-full flex-wrap items-center justify-center gap-2 px-3 py-1 rounded-[2rem] bg-blue-50 border border-blue-100 text-[#30A3FF] text-[11px] xl:text-[12px] font-semibold tracking-wide uppercase mb-4 text-center">
              <svg className="w-3 h-3 xl:w-4 xl:h-4 fill-current flex-shrink-0" viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
              <Text field={fields['Label Text']} />
            </div>
          )}
          
          <h2 className="text-3xl md:text-4xl xl:text-[40px] font-bold text-[#1a1a1a] tracking-tight mb-2">
            <Text field={fields['Main Title']} />
          </h2>
          
          <div className="text-[14px] xl:text-[15px] text-gray-600 max-w-3xl mt-1">
            <RichText field={fields['Description'] || fields['Main Description']} />
          </div>
        </div>

        {/* --- TOGGLES --- */}
        <div className="flex flex-col items-center mb-8 xl:mb-10 w-full">
          <div className="flex flex-wrap justify-center bg-white rounded-[2rem] p-1 shadow-sm border border-gray-200 w-full md:w-auto">
            {categories.map((category: PricingCategory) => {
              const isActive = activeCategoryId === category.id;
              const hasBadge = isEditing || !!category.fields['Highlight Badge']?.value;
              
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategoryId(category.id)}
                  className={`relative flex items-center justify-center gap-2 px-5 py-2 rounded-full text-[13px] xl:text-[14px] font-bold transition-all ${
                    isActive ? 'bg-[#30A3FF] text-white shadow-md' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Text field={category.fields['Category Name']} />
                  {hasBadge && (
                    <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap ${isActive ? 'bg-white text-[#30A3FF]' : 'bg-blue-50 text-[#30A3FF] border border-blue-100'}`}>
                      <Text field={category.fields['Highlight Badge']} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Active Context Description */}
          <div className="mt-4 text-[12px] xl:text-[13px] text-gray-500 font-medium">
            {isEditing ? (
              <div className="flex flex-row gap-3 overflow-x-auto w-full pb-2 max-w-full scroll-smooth" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
                {categories.map((cat: PricingCategory) => (
                  <div key={cat.id} className="text-center p-2 border border-dashed border-gray-300 w-[300px] shrink-0">
                    <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">
                      [{cat.fields['Category Name']?.value}] Context Description:
                    </span>
                    <Text field={cat.fields['Context Description']} />
                  </div>
                ))}
              </div>
            ) : (
              activeCategory && <Text field={activeCategory.fields['Context Description']} />
            )}
          </div>
        </div>

        {/* --- GRID (Dynamic Cards + Static Enterprise Card) --- */}
        <div className={isEditing ? "flex gap-5 overflow-x-auto pb-4 pt-2 px-1 scroll-smooth" : "grid grid-cols-1 lg:grid-cols-4 gap-4 items-stretch"} style={isEditing ? { WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' } : {}}>
          
          {/* Dynamic White Cards */}
          {visibleCards.map((card: PricingCard) => {
            const metrics = parseMetrics(card.fields['Metric Features']?.value);
            const isPopular = isEditing || !!card.fields['Popular Badge']?.value;

            return (
              <div key={card.id} className={`relative flex flex-col bg-white rounded-[20px] p-5 md:p-6 ${isPopular ? 'border-2 border-[#30A3FF]/20 shadow-xl shadow-[#30A3FF]/5' : 'border border-gray-200 shadow-sm'} ${isEditing ? 'w-[320px] shrink-0' : ''}`}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="inline-flex items-center gap-1.5 border border-gray-200 rounded-full px-2.5 py-0.5 w-max">
                    <JssImage field={card.fields['Tier Icon']} className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase text-gray-600"><Text field={card.fields['Tier Name']} /></span>
                  </div>
                  
                  {isPopular && (
                    <div className="bg-blue-50 border border-blue-100 text-[#30A3FF] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap shadow-sm">
                      <Text field={card.fields['Popular Badge']} />
                    </div>
                  )}
                </div>

                <div className="mb-1">
                  <span className="text-3xl xl:text-4xl font-extrabold text-[#1a1a1a]"><Text field={card.fields['Price Value']} /></span>
                  <span className="text-gray-500 font-medium text-[13px] ml-1"><Text field={card.fields['Price Unit']} /></span>
                </div>
                <div className="text-[12px] text-gray-400 mb-5 font-medium leading-tight">
                  <Text field={card.fields['Price Subtext']} />
                </div>

                <JssLink 
                  field={card.fields['CTA Button']} 
                  className={`flex items-center justify-center w-full py-2.5 rounded-xl text-[13px] font-bold text-center transition-colors mb-5 ${isPopular ? 'bg-[#30A3FF] text-white hover:bg-[#1c92f0]' : 'bg-white border border-[#30A3FF]/30 text-[#30A3FF] hover:border-[#30A3FF]'}`}
                />

                {/* Metrics with Dotted Lines */}
                <div className="flex flex-col gap-2 mb-5">
                  {metrics.map((metric, idx) => (
                    <div key={idx} className="flex items-end justify-between text-[12px]">
                      <span className="text-gray-500">{metric.key}</span>
                      <div className="flex-grow border-b-2 border-dotted border-gray-200 mx-2 mb-1"></div>
                      <span className="font-bold text-gray-900">{metric.value}</span>
                    </div>
                  ))}
                  {isEditing && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 text-xs text-yellow-800 rounded">
                      <div className="font-bold mb-1">Edit Metrics (key=val&key=val):</div>
                      <Text field={card.fields['Metric Features']} />
                    </div>
                  )}
                </div>

                {/* Included Features */}
                <div className="flex-1 border-t border-gray-100 pt-5 mt-5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Included</p>
                  <div className="text-[12px] xl:text-[13px] text-gray-600 [&_ul]:list-none [&_ol]:list-none [&_li]:list-none [&_ul]:pl-0 [&_ul]:m-0 [&_li]:relative [&_li]:pl-6 [&_li]:mb-2.5 [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-[2px] [&_li]:before:w-3.5 [&_li]:before:h-3.5 [&_li]:before:rounded-full [&_li]:before:bg-[#e0f2fe] [&_li]:before:text-[#30A3FF] [&_li]:before:flex [&_li]:before:items-center [&_li]:before:justify-center [&_li]:before:text-[9px] [&_li]:before:font-bold [&_li]:before:content-['✓']">
                    <RichText field={card.fields['Included Features']} />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Static Enterprise Black Card */}
          <div className={`flex flex-col bg-[#0b1325] rounded-[20px] p-5 md:p-6 text-white shadow-xl ${isEditing ? 'w-[320px] shrink-0' : ''}`}>
            <div className="inline-block border border-gray-700 rounded-full px-2.5 py-0.5 w-max mb-4">
              <span className="text-[10px] font-bold uppercase text-gray-300"><Text field={fields['Enterprise Badge']} /></span>
            </div>
            <h3 className="text-2xl xl:text-3xl font-bold mb-3">
              <Text field={fields['Enterprise Title']} />
            </h3>
            <div className="text-[13px] xl:text-[14px] text-gray-400 mb-6 leading-relaxed">
              <Text field={fields['Enterprise Description']} />
            </div>
            
            <JssLink 
              field={fields['Enterprise CTA']} 
              className="flex items-center justify-center w-full py-2.5 rounded-xl bg-[#30A3FF] hover:bg-[#1c92f0] text-white text-[13px] font-bold text-center transition-colors mb-6"
            />

            <div className="flex-1 border-t border-gray-800 pt-5 mt-5">
              <div className="text-[12px] xl:text-[13px] text-gray-300 [&_ul]:list-none [&_ol]:list-none [&_li]:list-none [&_ul]:pl-0 [&_ul]:m-0 [&_li]:relative [&_li]:pl-6 [&_li]:mb-3 [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-[2px] [&_li]:before:w-3.5 [&_li]:before:h-3.5 [&_li]:before:rounded-full [&_li]:before:bg-[#1a273f] [&_li]:before:text-[#30A3FF] [&_li]:before:flex [&_li]:before:items-center [&_li]:before:justify-center [&_li]:before:text-[9px] [&_li]:before:font-bold [&_li]:before:content-['✓']">
                <RichText field={fields['Enterprise Features']} />
              </div>
            </div>
          </div>

        </div>

        {/* --- BOTTOM BANNER --- */}
        {(isEditing || fields['First Title'] || fields['Second Title'] || fields['Third Title']) && (
          <div className="mt-8 xl:mt-12 max-w-[900px] mx-auto bg-[#f6f9fc] border border-blue-100/60 rounded-[16px] xl:rounded-[20px] py-6 px-4 flex flex-col md:flex-row divide-y md:divide-y-0">
            {[
              { title: fields['First Title'], desc: fields['First Description'] },
              { title: fields['Second Title'], desc: fields['Second Description'] },
              { title: fields['Third Title'], desc: fields['Third Description'] || fields['Third description'] }
            ].map((item, idx) => {
              if (!isEditing && !item.title && !item.desc) return null;
              
              return (
                <div key={idx} className="flex-1 px-2 md:px-3 py-4 md:py-0 text-center flex flex-col justify-center relative">
                  {idx > 0 && <div className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-[1px] h-10 bg-gray-200"></div>}
                  <h4 className="text-[15px] xl:text-[17px] font-extrabold text-[#1a1a1a] mb-1 uppercase tracking-wide">
                    <Text field={item.title as Field<string>} />
                  </h4>
                  <p className="text-[11px] xl:text-[12px] text-gray-500 font-medium">
                    <Text field={item.desc as Field<string>} />
                  </p>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </section>
  );
};
