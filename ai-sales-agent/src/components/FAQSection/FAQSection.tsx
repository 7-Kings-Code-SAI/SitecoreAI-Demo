"use client";

import { useState, useEffect, useRef } from 'react';
import {
  Text,
  RichText,
  Link as JssLink,
  useSitecore,
} from '@sitecore-content-sdk/nextjs';
import { FAQItem, FAQSectionProps } from './FAQSection.types';

export const Default = (props: FAQSectionProps) => {
  const { fields } = props;
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing;

  // 1. Group the flat array into an object categorized by "Category Name"
  const rawItems = fields?.['FAQ Items'] || [];
  const groupedFAQs = rawItems.reduce((acc, item) => {
    const categoryName = item.fields['Category Name']?.value || 'General';
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(item);
    return acc;
  }, {} as Record<string, FAQItem[]>);

  const categories = Object.keys(groupedFAQs);

  // 2. State management for the active tab and accordion
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [openQuestionId, setOpenQuestionId] = useState<string | null>(null);

  // Horizontal scroll ref for editing mode
  const editScrollRef = useRef<HTMLDivElement>(null);

  const scrollEditRow = (delta: number) => {
    editScrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  };

  // Set the initial active category to the first one available
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);

  if (!fields) return null;

  const total = rawItems.length;

  return (
    <section className="w-full bg-white py-16 px-6 lg:px-20 font-sans">
      <div className="max-w-6xl mx-auto">

        {/* --- TOP HEADER SECTION --- */}
        <div className="text-center mb-14 flex flex-col items-center">
          {fields['Label Text']?.value && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-[#30A3FF] text-[13px] font-medium mb-6">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-2.5c0-.55.22-1.05.59-1.42l1.2-1.2C13.15 9.53 13.3 9.25 13.3 9c0-.72-.58-1.3-1.3-1.3s-1.3.58-1.3 1.3H8.7c0-1.82 1.48-3.3 3.3-3.3s3.3 1.48 3.3 3.3c0 .75-.31 1.46-.83 1.95z"/></svg>
              <Text field={fields['Label Text']} />
            </div>
          )}

          {fields['Main Title']?.value && (
            <h2 className="text-4xl md:text-[42px] font-bold text-[#1a1a1a] tracking-tight mb-4">
              <Text field={fields['Main Title']} />
            </h2>
          )}

          {fields['Description']?.value && (
            <div className="text-[16px] text-[#6B7280] max-w-2xl">
              <RichText field={fields['Description']} />
            </div>
          )}
        </div>

        {/* --- MAIN CONTENT --- */}
        {isEditing ? (
          <div className="w-full">

            {/* Authoring guidance banner */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-3 text-xs text-sky-800">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 shrink-0 text-sky-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                <span className="font-semibold">Authoring Mode:</span>
                <span>Scroll horizontally to edit each FAQ card. Click any field to edit. In live view, items are grouped by Category into tabs.</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-sky-200/70 px-2.5 py-0.5 font-bold text-sky-900">
                  {total} {total === 1 ? 'FAQ Item' : 'FAQ Items'}
                </span>
                {total > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => scrollEditRow(-370)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-sky-300 bg-white text-sky-700 shadow-sm transition hover:bg-sky-100 active:scale-90"
                      aria-label="Scroll left"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollEditRow(370)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-sky-300 bg-white text-sky-700 shadow-sm transition hover:bg-sky-100 active:scale-90"
                      aria-label="Scroll right"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {total === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-sky-200 bg-white p-10 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-slate-800">No FAQ items configured</p>
                <p className="mt-1 text-xs text-slate-500">
                  Add FAQ datasource items to the FAQ Items field.
                </p>
              </div>
            ) : (
              <div className="relative">
                <div
                  ref={editScrollRef}
                  className="flex gap-5 overflow-x-auto pb-4 pt-2 px-1 scroll-smooth"
                  style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
                >
                  {rawItems.map((item, index) => {
                    return (
                      <div
                        key={item.id}
                        className="flex w-[360px] shrink-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                      >
                        {/* Card Header */}
                        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-5 items-center rounded-full bg-blue-50 px-2 text-[11px] font-bold text-[#30A3FF]">
                              #{index + 1}
                            </span>
                            <span
                              className="max-w-[180px] truncate text-xs font-semibold text-slate-700"
                              title={item.name ?? `FAQ Item ${index + 1}`}
                            >
                              {item.name ?? `FAQ Item ${index + 1}`}
                            </span>
                          </div>
                          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                            FAQ
                          </span>
                        </div>

                        {/* Category */}
                        <div className="mb-3">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Category
                          </span>
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-[#30A3FF]">
                            <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                            </svg>
                            <Text field={item.fields['Category Name']} />
                          </div>
                        </div>

                        {/* Question */}
                        <div className="mb-4">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Question
                          </span>
                          <div className="text-[14px] font-bold text-[#1a1a1a] leading-snug">
                            <Text
                              field={item.fields.Question}
                              emptyFieldEditingComponent={() => (
                                <span className="text-xs font-normal italic text-sky-500">
                                  Click to add question...
                                </span>
                              )}
                            />
                          </div>
                        </div>

                        {/* Answer */}
                        <div className="mt-auto flex-1 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Answer
                            </span>
                            <svg className="h-3.5 w-3.5 text-slate-300" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="text-xs leading-relaxed text-slate-600">
                            <RichText
                              field={item.fields.Answer}
                              emptyFieldEditingComponent={() => (
                                <span className="text-xs not-italic text-sky-500">
                                  Click to add answer content...
                                </span>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">

            {/* Left Column: Category Tabs */}
            <div className="w-full lg:w-1/3 flex flex-col space-y-2">
              {categories.map((category) => {
                const isActive = activeCategory === category;
                return (
                  <button
                    key={category}
                    onClick={() => {
                      setActiveCategory(category);
                      setOpenQuestionId(null); // Reset accordion when switching tabs
                    }}
                    className={`text-left cursor-pointer px-5 py-3.5 rounded-xl font-medium text-[15px] transition-all duration-200 border ${
                      isActive
                        ? 'bg-[#f0f7ff] text-[#30A3FF] border-[#d0e5ff]'
                        : 'border-transparent text-[#6B7280] hover:text-[#1a1a1a] hover:bg-gray-50'
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>

            {/* Right Column: Accordion Questions */}
            <div className="w-full lg:w-2/3">
              {activeCategory && groupedFAQs[activeCategory] && (
                <div className="border border-[#e5e7eb] rounded-2xl bg-white overflow-hidden shadow-sm">
                  {groupedFAQs[activeCategory].map((item) => {
                    const isOpen = openQuestionId === item.id;
                    return (
                      <div key={item.id} className="border-b border-[#e5e7eb] last:border-none">
                        <button
                          onClick={() => setOpenQuestionId(isOpen ? null : item.id)}
                          className="w-full flex items-center justify-between px-6 py-5 text-left bg-white hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-[15px] font-medium text-[#1a1a1a]">
                            <Text field={item.fields.Question} />
                          </span>
                          <div className="flex-shrink-0 ml-4 flex items-center justify-center w-6 h-6 rounded-full border border-gray-200 text-gray-400 font-light text-[16px]">
                            {isOpen ? '−' : '+'}
                          </div>
                        </button>

                        {/* Accordion Content */}
                        <div
                          className={`overflow-hidden transition-all duration-300 ease-in-out ${
                            isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                          }`}
                        >
                          <div className="px-6 pb-6 text-[15px] text-[#6B7280] leading-relaxed">
                            <RichText field={item.fields.Answer} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- BOTTOM BANNER --- */}
        <div className="mt-16 bg-[#f8fafc] border border-blue-50/50 rounded-[24px] p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            {fields['Banner Title']?.value && (
              <h3 className="text-xl font-bold text-[#1a1a1a] mb-2">
                <Text field={fields['Banner Title']} />
              </h3>
            )}
            {fields['Banner Description']?.value && (
              <div className="text-[15px] text-[#6B7280]">
                <RichText field={fields['Banner Description']} />
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
            {fields['Primary CTA']?.value?.href && (
              <JssLink
                field={fields['Primary CTA']}
                className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-white border border-[#e5e7eb] text-[#1a1a1a] font-bold text-[14px] hover:bg-gray-50 transition-colors shadow-sm"
              >
                <span>{fields['Primary CTA'].value.text || 'View all FAQs'}</span>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
              </JssLink>
            )}
            {fields['Secondary CTA']?.value?.href && (
              <JssLink
                field={fields['Secondary CTA']}
                className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-[#30A3FF] hover:bg-[#1c92f0] text-white font-bold text-[14px] transition-colors shadow-sm"
              />
            )}
          </div>
        </div>

      </div>
    </section>
  );
};

