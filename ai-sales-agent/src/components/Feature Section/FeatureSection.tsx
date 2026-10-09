import React from 'react';
import {
  Text,
  RichText,
  Image as JssImage,
  Link as JssLink,
} from '@sitecore-content-sdk/nextjs';

// --- Helper: Directly maps the JSON object for JSS components ---
const mapSitecoreFields = (fieldsArray: any[]) => {
  if (!Array.isArray(fieldsArray)) return {};
  return fieldsArray.reduce((acc, field) => {
    acc[field.name] = field.jsonValue; 
    return acc;
  }, {} as Record<string, any>);
};

export const Default = (props: any) => {
  const fields = props?.fields;
  if (!fields) return null;

  let data: any = {};
  let cards: any[] = [];

  // SAFELY HANDLE BOTH COMPONENT GRAPHQL AND STANDARD LAYOUT SERVICE
  if (fields.data?.datasource) {
    // 1. GraphQL mapped approach
    const datasource = fields.data.datasource;
    data = mapSitecoreFields(datasource.fields);
    
    // As per your snippet: TargetItems structure
    if (datasource.featureCards?.targetItems) {
      cards = datasource.featureCards.targetItems.map((card: any) => ({
        id: card.id,
        ...mapSitecoreFields(card.fields)
      }));
    } else {
      cards = data['Feature cards'] || data['Feature Cards'] || [];
    }
  } else {
    // 2. Standard Layout Service
    data = fields;
    const rawCards = fields['Feature Cards'] || fields['Feature cards'] || [];
    cards = rawCards.map((card: any) => ({
      id: card.id,
      ...(card.fields || {})
    }));
  }

  // 3. Map Dynamic Grids based on exact Sitecore field names
  const leftGridItems = [1, 2, 3, 4].map(num => ({
    icon: data[`Card ${num} Icon`],
    title: data[`Card ${num} Title`],
    desc: data[`Card ${num} Description`],
  })).filter(item => item.title?.value);

  const workflowSteps = [1, 2, 3, 4].map(num => ({
    icon: data[`Workflow Step ${num} Icon`],
    textAvatar: data[`Step ${num} Text Avatar`],
    title: data[`Step ${num} Title`],
    desc: data[`Step ${num} Description`],
    isHorizontal: data[`Step ${num} Horizontal Align`]?.value,
  })).filter(item => item.title?.value);

  const verticalSteps = workflowSteps.filter(s => !s.isHorizontal);
  const horizontalSteps = workflowSteps.filter(s => s.isHorizontal);

  const getAvatarColor = (str: string) => {
    const palette = [
      { bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200' },
      { bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-200' },
      { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' },
      { bg: 'bg-rose-100', text: 'text-rose-600', border: 'border-rose-200' },
      { bg: 'bg-fuchsia-100', text: 'text-fuchsia-600', border: 'border-fuchsia-200' },
    ];
    if (!str) return palette[0];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palette[Math.abs(hash) % palette.length];
  };

  return (
    <section className="w-full bg-[#f8fafc] py-20 px-6 font-sans">
      <style>{`
        @keyframes scroll-vertical {
          0% { transform: translateY(0); }
          100% { transform: translateY(calc(-50% - 12px)); }
        }
        .animate-scroll-vertical {
          animation: scroll-vertical 40s linear infinite;
        }
        .animate-scroll-vertical:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className="max-w-[1200px] mx-auto">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start">
          
          {/* --- LEFT COLUMN (Sticky) --- */}
          <div className="lg:col-span-5 lg:sticky lg:top-24">
            
            {data['Label Text']?.value && (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f0f9ff] border border-blue-100 text-[#30A3FF] text-[13px] font-bold uppercase tracking-wider mb-8">
                 <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                <Text field={data['Label Text']} />
              </div>
            )}
            
            <div className="text-4xl md:text-[46px] font-extrabold text-[#1a1a1a] tracking-tight leading-[1.15] mb-6 [&_p]:m-0">
              <RichText field={data['Main Title']} />
            </div>
            
            <div className="text-[15px] text-gray-500 mb-10 leading-relaxed max-w-[90%]">
              <RichText field={data['Main Description']} />
            </div>

            {/* Static 2x2 Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-8 mb-12 border-t border-gray-200 pt-10">
              {leftGridItems.map((item, idx) => (
                <div key={idx} className="flex flex-col">
                  <div className="flex items-center gap-3 mb-3">
                    {item.icon?.value?.src && (
                      <div className="w-10 h-10 rounded-full bg-[#f0f9ff] flex items-center justify-center text-[#30A3FF] shrink-0">
                        <JssImage field={item.icon} className="w-5 h-5 object-contain" />
                      </div>
                    )}
                    <h4 className="text-[16px] font-bold text-gray-900 leading-tight">
                      <Text field={item.title} />
                    </h4>
                  </div>
                  <p className="text-[14px] text-gray-500 leading-relaxed">
                    <Text field={item.desc} />
                  </p>
                </div>
              ))}
            </div>

            {data['CTA Button']?.value?.href && (
              <JssLink 
                field={data['CTA Button']} 
                className="inline-flex items-center gap-2 py-3.5 px-8 rounded-full bg-[#30A3FF] hover:bg-[#1c92f0] text-white text-[15px] font-bold transition-all shadow-lg shadow-blue-200 hover:-translate-y-0.5 group"
              >
                <span>{data['CTA Button'].value.text || 'Start Automating Now'}</span>
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </JssLink>
            )}
          </div>

          {/* --- RIGHT COLUMN (Masonry Grid + Banner) --- */}
          <div className="lg:col-span-7 flex flex-col gap-12">
            
            {/* Dynamic Cards Masonry Grid */}
            <div className="hidden md:grid md:grid-cols-2 gap-6 items-start">
              {[cards.slice(0, Math.ceil(cards.length / 2)), cards.slice(Math.ceil(cards.length / 2))].map((columnCards, colIdx) => (
                <div key={colIdx} className={`relative h-[650px] overflow-hidden ${colIdx === 1 ? 'md:mt-16' : ''}`}>
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#f8fafc] to-transparent z-10"></div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#f8fafc] to-transparent z-10"></div>
                  
                  {/* Scrolling Container */}
                  <div className={`flex flex-col gap-6 w-full animate-scroll-vertical ${colIdx === 1 ? 'animation-delay-1000' : ''}`}>
                    {/* Render cards twice for seamless loop */}
                    {[...columnCards, ...columnCards].map((card: any, index: number) => {
                      const layout = card['Widget UI Layout']?.value || '';
                      const badges = card['Widget Badges']?.value?.split(',').filter(Boolean) || [];

                      return (
                        <div key={`${card.id}-${index}`} className="group cursor-pointer relative overflow-hidden rounded-[24px] border border-[#30A3FF]/10 bg-white p-7 shadow-[0_8px_30px_rgb(48,163,255,0.02)] transition-all duration-300 hover:shadow-[0_20px_40px_rgba(48,163,255,0.08)] hover:border-[#30A3FF]/20 shrink-0">
                          <h3 className="text-[20px] font-bold text-[#1d1d1f] mb-3 group-hover:text-[#30A3FF] transition-colors">
                            <Text field={card['Card Title']} />
                          </h3>
                          <p className="text-[14px] leading-[22px] text-[#6B7280] mb-6">
                            <Text field={card['Card Description']} />
                          </p>

                          {/* 1. Audio Waveform */}
                          {layout === 'Audio Waveform' && (
                            <div className="relative w-full h-[160px] rounded-xl bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100/40 overflow-hidden p-4 flex flex-col justify-between group-hover:border-blue-200 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[#30A3FF] shrink-0">
                                  <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd"></path></svg>
                                </div>
                                <div className="flex items-end gap-1.5 h-8 w-full">
                                  {[30, 60, 20, 80, 40, 90, 50, 20, 70, 30, 50, 80, 40, 60, 20, 70, 40].map((h, i) => (
                                    <div key={i} className="bg-[#30A3FF] rounded-full w-full opacity-85" style={{ height: `${h}%`, transition: 'height 0.3s ease' }}></div>
                                  ))}
                                </div>
                              </div>
                              <div className="rounded-lg bg-white/90 p-2.5 text-[11px] font-mono border border-blue-100/30 text-slate-600 shadow-sm leading-tight">
                                {card['Widget Label 1']?.value && (
                                  <span className="text-[#30A3FF] font-bold"><Text field={card['Widget Label 1']} /> </span>
                                )}
                                <Text field={card['Widget Quote Text']} />
                              </div>
                            </div>
                          )}

                          {/* 2. Conversion Graph */}
                          {layout === 'Conversion Graph' && (
                            <div className="relative w-full h-[160px] rounded-xl bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100/40 overflow-hidden p-4 flex flex-col justify-between group-hover:border-blue-200 transition-colors">
                              <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                  {card['Widget Label 1']?.value && (
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">
                                      <Text field={card['Widget Label 1']} />
                                    </span>
                                  )}
                                  <span className="text-lg font-extrabold text-slate-800 tracking-tight">
                                    <Text field={card['Widget Primary Highlight']} />
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full font-semibold">
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
                                  <Text field={card['Widget Secondary Highlight']} />
                                </div>
                              </div>
                              <div className="w-full h-14 flex items-end">
                                <svg className="w-full h-full overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
                                  <defs>
                                    <linearGradient id={`gradient-${card.id}-${index}`} x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor="#30A3FF" stopOpacity="0.45"></stop>
                                      <stop offset="100%" stopColor="#30A3FF" stopOpacity="0.0"></stop>
                                    </linearGradient>
                                  </defs>
                                  <path d="M0,28 Q15,14 30,24 T60,8 T90,18 L100,6 L100,30 L0,30 Z" fill={`url(#gradient-${card.id}-${index})`}></path>
                                  <path d="M0,28 Q15,14 30,24 T60,8 T90,18 L100,6" fill="none" stroke="#30A3FF" strokeWidth="2.5" strokeLinecap="round"></path>
                                </svg>
                              </div>
                            </div>
                          )}

                          {/* 3. Security Integration */}
                          {layout === 'Security Integration' && (
                            <div className="relative w-full h-[160px] rounded-xl bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100/40 overflow-hidden p-4 flex flex-col justify-between group-hover:border-blue-200 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                </div>
                                <div className="flex flex-col">
                                  {card['Widget Label 1']?.value && (
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                                      <Text field={card['Widget Label 1']} />
                                    </span>
                                  )}
                                  <span className="text-[13px] font-extrabold text-slate-800">
                                    <Text field={card['Widget Primary Highlight']} />
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {card['Widget Label 2']?.value && (
                                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight shrink-0">
                                    <Text field={card['Widget Label 2']} />
                                  </span>
                                )}
                                <div className="flex items-center gap-1.5 bg-white border border-blue-100/30 rounded-lg px-2 py-1 shadow-sm">
                                  
                                  {/* Dynamic Logos from the 'Widget Images' Multilist */}
                                  {Array.isArray(card['Widget Images']) && card['Widget Images'].map((img: any, idx: number) => {
                                    const imageField = img.fields?.['Logo Image'];
                                    if (!imageField?.value?.src) return null;
                                    
                                    return (
                                      <span key={img.id || idx} className="inline-flex items-center justify-center shrink-0 max-w-full overflow-hidden" style={{ height: '20px', maxWidth: '100%' }}>
                                        <JssImage field={imageField} className="object-contain w-full h-full max-h-full max-w-full" />
                                      </span>
                                    );
                                  })}

                                </div>
                              </div>
                              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                                {card['Widget Label 3']?.value && (
                                  <span><Text field={card['Widget Label 3']} /></span>
                                )}
                                <span className="text-[#30A3FF] bg-blue-50 px-2 py-0.5 rounded font-bold">
                                  <Text field={card['Widget Secondary Highlight']} />
                                </span>
                              </div>
                            </div>
                          )}

                          {/* 4. Agent Profile */}
                          {layout === 'Agent Profile' && (
                            <div className="relative w-full h-[160px] rounded-xl bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100/40 overflow-hidden p-4 flex flex-col justify-between group-hover:border-blue-200 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#30A3FF] to-indigo-500 flex items-center justify-center text-white font-bold text-[12px] shrink-0 shadow-sm">
                                  {card['Widget Primary Highlight']?.value?.substring(0, 2).toUpperCase() || ''}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[13px] font-bold text-slate-800">
                                    <Text field={card['Widget Primary Highlight']} />
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    <Text field={card['Widget Secondary Highlight']} />
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {badges.map((badge: string, i: number) => (
                                  <span key={i} className="text-[10px] font-semibold text-[#30A3FF] bg-blue-50 border border-blue-100/60 px-2 py-0.5 rounded-full">
                                    {badge.trim()}
                                  </span>
                                ))}
                              </div>
                              <div className="rounded-lg bg-white/90 p-2.5 text-[11px] font-mono border border-blue-100/30 text-slate-600 shadow-sm leading-tight">
                                {card['Widget Label 1']?.value && (
                                  <span className="text-[#30A3FF] font-bold"><Text field={card['Widget Label 1']} /> </span>
                                )}
                                <Text field={card['Widget Quote Text']} />
                              </div>
                            </div>
                          )}

                          {/* 5. CRM Sync */}
                          {layout === 'CRM Sync' && (
                            <div className="relative w-full h-[160px] rounded-xl bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100/40 overflow-hidden p-4 flex flex-col justify-between group-hover:border-blue-200 transition-colors">
                              {(card['Widget Label 1']?.value || card['Widget Label 2']?.value) && (
                                <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                                  <span>{card['Widget Label 1']?.value ? <Text field={card['Widget Label 1']} /> : null}</span>
                                  <span>{card['Widget Label 2']?.value ? <Text field={card['Widget Label 2']} /> : null}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5">
                                {badges.map((badge: string, i: number) => (
                                  <div key={i} className="flex-1 flex items-center gap-1 bg-white border border-blue-100/20 rounded-lg px-2 py-1.5 shadow-sm">
                                    <svg className="w-3 h-3 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
                                    <span className="text-[9px] font-semibold text-slate-600 truncate">{badge.trim()}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                                {card['Widget Label 3']?.value && (
                                  <span><Text field={card['Widget Label 3']} /></span>
                                )}
                                <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                                  {/* User might place a checkmark via Label 3 instead, keeping just the text here */}
                                  <Text field={card['Widget Primary Highlight']} />
                                </span>
                              </div>
                            </div>
                          )}

                          {/* 6. Status Cards */}
                          {layout === 'Status Cards' && (
                            <div className="relative w-full h-[160px] rounded-xl bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100/40 overflow-hidden p-3.5 flex flex-col justify-between group-hover:border-blue-200 transition-colors">
                              <div className="grid grid-cols-1 min-[360px]:grid-cols-3 gap-2.5 h-full items-center">
                                {badges.map((badge: string, i: number) => (
                                  <div key={i} className="cursor-pointer rounded-xl bg-white border border-blue-100/20 p-2.5 flex flex-col justify-between shadow-sm h-full min-w-0 hover:border-[#30A3FF]/40 transition-colors">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight break-words">{badge.trim()}</span>
                                    {card['Widget Label 1']?.value && (
                                      <span className="text-[11px] font-extrabold text-slate-800">
                                        <Text field={card['Widget Label 1']} />
                                      </span>
                                    )}
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#30A3FF] animate-pulse"></span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* --- BOTTOM BANNER (Workflow) - Restored with layout and hover styling --- */}
            <div className="group cursor-pointer bg-white rounded-[32px] p-8 md:p-10 shadow-sm border border-gray-100 w-full relative z-20 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(48,163,255,0.08)] hover:border-[#30A3FF]/20">
              <div className="mb-8 text-left">
                <h3 className="text-[22px] md:text-[26px] font-extrabold text-[#1d1d1f] group-hover:text-[#30A3FF] transition-colors duration-300 mb-3 tracking-tight [&_p]:m-0">
                  <RichText field={data['Banner Title']} />
                </h3>
                <div className="text-[14px] text-gray-500 leading-relaxed">
                  <RichText field={data['Banner Description']} />
                </div>
              </div>

              <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4 xl:gap-0 bg-[#f8fafc] p-6 rounded-[24px] border border-gray-100 relative overflow-hidden">
                 
                 {verticalSteps.map((step, idx) => {
                   const isBlue = idx === 1; // Second step is blue
                   return (
                     <React.Fragment key={`v-${idx}`}>
                       <div className={`cursor-pointer relative z-10 flex flex-col items-center text-center p-5 rounded-2xl w-full flex-1 shadow-sm transition-transform hover:-translate-y-1 ${isBlue ? 'bg-[#30A3FF] text-white border-transparent shadow-blue-200' : 'bg-white border border-gray-100 text-gray-900'}`}>
                         <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isBlue ? 'bg-white/20' : 'bg-[#fef2f2] text-red-500'}`}>
                           {step.icon?.value?.src ? (
                             <JssImage field={step.icon} className={`w-5 h-5 object-contain ${isBlue ? 'brightness-0 invert' : ''}`} />
                           ) : (
                             <span className="text-[11px] font-bold uppercase"><Text field={step.textAvatar} /></span>
                           )}
                         </div>
                         <h5 className={`text-[13px] font-bold mb-1 ${isBlue ? 'text-white' : 'text-gray-900'}`}><Text field={step.title} /></h5>
                         <p className={`text-[10px] ${isBlue ? 'text-blue-50' : 'text-gray-400 font-medium'}`}><Text field={step.desc} /></p>
                       </div>
                       
                       {/* Animated Pointer Connector */}
                       {(idx < verticalSteps.length - 1 || horizontalSteps.length > 0) && (
                         <div className="hidden xl:flex w-8 shrink-0 items-center justify-center relative">
                           <div className="absolute flex items-center justify-center w-2.5 h-2.5">
                             <div className="absolute w-full h-full rounded-full bg-[#30A3FF] shadow-[0_0_8px_#30A3FF] animate-ping opacity-75"></div>
                             <div className="relative w-2.5 h-2.5 rounded-full bg-[#30A3FF] z-10"></div>
                           </div>
                         </div>
                       )}
                     </React.Fragment>
                   );
                 })}

                 {horizontalSteps.length > 0 && (
                   <div className="relative z-10 flex flex-col gap-3 w-full flex-1">
                     {horizontalSteps.map((step, idx) => {
                       const textVal = step.textAvatar?.value || '';
                       const colors = getAvatarColor(textVal);

                       return (
                         <div key={`h-${idx}`} className="cursor-pointer flex flex-row items-center bg-white p-3 rounded-xl shadow-sm border border-gray-100 gap-3 transition-transform hover:-translate-y-0.5">
                           <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border ${step.icon?.value?.src ? 'bg-[#f8fafc] border-gray-100' : `${colors.bg} ${colors.border}`}`}>
                             {step.icon?.value?.src ? (
                               <JssImage field={step.icon} className="w-4 h-4 object-contain" />
                             ) : (
                               <span className={`text-[10px] font-bold uppercase ${colors.text}`}><Text field={step.textAvatar} /></span>
                             )}
                           </div>
                           <div className="flex flex-col text-left">
                             <h5 className="text-[12px] font-bold text-gray-900 mb-0.5"><Text field={step.title} /></h5>
                             <p className="text-[10px] text-[#10b981] font-semibold flex items-center gap-1">
                               <Text field={step.desc} />
                             </p>
                           </div>
                         </div>
                       );
                     })}
                   </div>
                 )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
