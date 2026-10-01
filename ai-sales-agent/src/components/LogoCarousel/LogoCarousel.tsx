import {
  Text,
  RichText,
  Image as JssImage,
  Link as JssLink,
} from '@sitecore-content-sdk/nextjs';
import { LogoCarouselProps, LogoItem } from './LogoCarousel.props';

type LogoCarouselVariant = 'default' | 'detailedCard';

// -------------------------------------------------------------
// HELPER: Marquee Row for Continuous Logo Scrolling
// -------------------------------------------------------------
const MarqueeRow = ({ logos, direction = 'left' }: { logos: LogoItem[], direction?: 'left' | 'right' }) => {
  if (!logos || logos.length === 0) return null;

  const animationClass = direction === 'left' ? 'animate-marquee-left' : 'animate-marquee-right';

  return (
    <div className={`marquee-wrapper relative w-full overflow-hidden whitespace-nowrap mt-5`}>
      {/* 
        Using pl-[100%] (padding-left: 100% of parent width) combined with a 100% translation
        allows us to create a seamless marquee that does NOT require duplicating the DOM elements.
        This ensures that if you author exactly 2 logos, you will only see 2 logos rendered.
      */}
      <div className={`marquee-content inline-block pl-[100%] ${animationClass}`}>
        <div className="inline-flex items-center gap-4 sm:gap-6">
          {logos.map((logo, index) => (
            <div
              key={`${logo.id}-${index}`}
              className="shrink-0 h-16 px-6 bg-white border border-[#d2d2d7]/40 rounded-2xl flex items-center justify-center shadow-xs hover:border-[#079bea]/40 transition-colors cursor-pointer"
            >
              <JssImage
                field={logo.fields['Logo Image']}
                className="h-7 w-auto object-contain max-w-[110px]"
                alt={logo.fields['Platform Name']?.value || 'Integration Logo'}
              />
            </div>
          ))}
        </div>
      </div>
      
      {/* Fade Overlays */}
      <div className="absolute left-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-r from-white to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-l from-white to-transparent pointer-events-none" />
    </div>
  );
};

const LogoCarouselLayout = (props: LogoCarouselProps & { variant: LogoCarouselVariant }) => {
  const { fields, variant } = props;
  
  if (!fields) return null;

  const isDetailedCard = variant === 'detailedCard';

  const labelText = fields['Label Text'];
  const heading = fields['Heading'];
  const description = fields['Description'];
  const primaryTitle = fields['Primary Category Title'];
  const primaryDescription = fields['Primary Category Description'];
  const primaryLogos = fields['Primary Logos'] || [];
  const secondaryTitle = fields['Secondary Category Title'];
  const secondaryDescription = fields['Secondary Category Description'];
  const secondaryLogos = fields['Secondary Logos'] || [];
  const ctaLeadIn = fields['CTA Lead-in Text'];
  const ctaLink = fields['CTA Link'];

  const hasLabel = Boolean(labelText?.value || (labelText as any)?.metadata);
  const hasHeading = Boolean(heading?.value || (heading as any)?.metadata);
  const hasDesc = Boolean(description?.value || (description as any)?.metadata);
  
  const isEditing = Boolean(
    (labelText as any)?.metadata ||
    (heading as any)?.metadata ||
    (description as any)?.metadata ||
    (props as any)?.params?.isEditing
  );

  const hasAnyDatasource = Boolean(
    hasLabel || hasHeading || hasDesc || primaryLogos.length > 0 || secondaryLogos.length > 0 || ctaLink?.value?.href
  );

  return (
    <>
      <style>{`
        @keyframes marqueeLeft {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-100%); }
        }
        @keyframes marqueeRight {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(0%); }
        }
        .animate-marquee-left {
          animation: marqueeLeft 10s linear infinite;
        }
        .animate-marquee-right {
          animation: marqueeRight 10s linear infinite;
        }
        .marquee-wrapper:hover .marquee-content {
          animation-play-state: paused !important;
        }
      `}</style>

      {/* -------------------------------------------------------------
          VARIANT 2: DetailedCard (Boxed Category Layout)
          ------------------------------------------------------------- */}
      {isDetailedCard && (
        <section className="w-full bg-[#fbfbfd] py-14 px-6 md:px-12 lg:px-20">
          <div className="max-w-6xl mx-auto bg-white rounded-[32px] border border-[#d2d2d7]/30 shadow-sm p-8 md:p-14">
            
            {(hasLabel || isEditing || !hasAnyDatasource) && (
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#079bea]/10 text-[#079bea] text-[12px] font-semibold tracking-wide uppercase mb-6">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
                </svg>
                {hasLabel || isEditing ? (
                  <Text field={labelText} />
                ) : (
                  <span>INTEGRATIONS</span>
                )}
              </div>
            )}

            {(hasHeading || isEditing || !hasAnyDatasource) && (
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1d1d1f] tracking-tight leading-tight mb-5">
                {hasHeading || isEditing ? (
                  <Text field={heading} />
                ) : (
                  <span>Seamlessly connect your tools</span>
                )}
              </h2>
            )}

            {(hasDesc || isEditing || !hasAnyDatasource) && (
              <div className="text-[15px] sm:text-[16px] text-[#6B7280] leading-relaxed max-w-3xl mb-12 font-normal">
                {hasDesc || isEditing ? (
                  <RichText field={description} />
                ) : (
                  <p>Integrate with the tools you already use to accelerate your workflow.</p>
                )}
              </div>
            )}

            {/* Primary Logos (Moving Left) */}
            {(primaryLogos.length > 0 || isEditing || !hasAnyDatasource) && (
              <div className="mb-10">
                {(primaryTitle?.value || isEditing || !hasAnyDatasource) && (
                  <p className="text-[14px] sm:text-[15px] font-bold text-[#079bea] mb-2 tracking-tight">
                    {primaryTitle?.value || isEditing ? (
                      <Text field={primaryTitle} />
                    ) : (
                      <span>Primary Category</span>
                    )}
                  </p>
                )}
                {(primaryDescription?.value || isEditing || !hasAnyDatasource) && (
                  <div className="text-[13px] text-[#6B7280] mb-5 font-normal leading-relaxed">
                    {primaryDescription?.value || isEditing ? (
                      <RichText field={primaryDescription} />
                    ) : (
                      <p>Description for primary category integrations.</p>
                    )}
                  </div>
                )}
                <MarqueeRow logos={primaryLogos} direction="left" />
              </div>
            )}

            {/* Secondary Logos (Moving Right) */}
            {(secondaryLogos.length > 0 || isEditing || !hasAnyDatasource) && (
              <div className="mb-10">
                {(secondaryTitle?.value || isEditing || !hasAnyDatasource) && (
                  <p className="text-[14px] sm:text-[15px] font-bold text-[#079bea] mb-2 tracking-tight">
                    {secondaryTitle?.value || isEditing ? (
                      <Text field={secondaryTitle} />
                    ) : (
                      <span>Secondary Category</span>
                    )}
                  </p>
                )}
                {(secondaryDescription?.value || isEditing || !hasAnyDatasource) && (
                  <div className="text-[13px] text-[#6B7280] mb-5 font-normal leading-relaxed">
                    {secondaryDescription?.value || isEditing ? (
                      <RichText field={secondaryDescription} />
                    ) : (
                      <p>Description for secondary category integrations.</p>
                    )}
                  </div>
                )}
                <MarqueeRow logos={secondaryLogos} direction="right" />
              </div>
            )}

            {(ctaLink?.value?.href || isEditing || !hasAnyDatasource) && (
              <div className="pt-2">
                {ctaLink?.value?.href || isEditing ? (
                  <JssLink field={ctaLink as any} className="inline-flex items-center justify-center h-12 px-7 rounded-full bg-[#079bea] hover:bg-[#078bd3] text-white font-bold text-[14px] transition-colors shadow-sm" />
                ) : (
                  <a href="#" className="inline-flex items-center justify-center h-12 px-7 rounded-full bg-[#079bea] hover:bg-[#078bd3] text-white font-bold text-[14px] transition-colors shadow-sm">View All Integrations</a>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* -------------------------------------------------------------
          VARIANT 1: Default (Clean Centered Row)
          ------------------------------------------------------------- */}
      {!isDetailedCard && (
        <section className="w-full bg-white pt-14 pb-16 px-6 xl:px-[100px] border-b border-[#d2d2d7]/15">
          <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
            
            {(hasLabel || isEditing || !hasAnyDatasource) && (
              <p className="text-[12px] sm:text-[13px] font-bold tracking-[0.18em] text-[#6B7280] uppercase mb-4 select-none">
                {hasLabel || isEditing ? (
                  <Text field={labelText} />
                ) : (
                  <span>TRUSTED BY TEAMS WORLDWIDE</span>
                )}
              </p>
            )}

            {(hasHeading || isEditing || !hasAnyDatasource) && (
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1d1d1f] tracking-tight leading-tight mb-5">
                {hasHeading || isEditing ? (
                  <Text field={heading} />
                ) : (
                  <span>Powering Modern Teams</span>
                )}
              </h2>
            )}

            {(hasDesc || isEditing || !hasAnyDatasource) && (
              <div className="text-[14px] sm:text-[15px] text-[#6B7280] max-w-2xl font-normal leading-relaxed mb-10 text-center">
                {hasDesc || isEditing ? (
                  <RichText field={description} />
                ) : (
                  <p>Join thousands of organizations using our platform to boost productivity.</p>
                )}
              </div>
            )}

            {/* Default Primary Logos */}
            {(primaryLogos.length > 0 || isEditing || !hasAnyDatasource) && (
              <div className="w-full mb-8">
                {(primaryTitle?.value || isEditing || !hasAnyDatasource) && (
                  <p className="text-[14px] sm:text-[15px] font-bold text-[#6B7280] mb-2 tracking-tight">
                    {primaryTitle?.value || isEditing ? (
                      <Text field={primaryTitle} />
                    ) : (
                      <span>Primary Tools</span>
                    )}
                  </p>
                )}
                {(primaryDescription?.value || isEditing || !hasAnyDatasource) && (
                  <div className="text-[13px] text-[#6B7280] mb-5 font-normal leading-relaxed">
                    {primaryDescription?.value || isEditing ? (
                      <RichText field={primaryDescription} />
                    ) : (
                      <p>Connect your existing primary workflow stack.</p>
                    )}
                  </div>
                )}
                <MarqueeRow logos={primaryLogos} direction="left" />
              </div>
            )}

            {/* Default Secondary Logos */}
            {(secondaryLogos.length > 0 || isEditing || !hasAnyDatasource) && (
              <div className="w-full mb-8">
                {(secondaryTitle?.value || isEditing || !hasAnyDatasource) && (
                  <p className="text-[14px] sm:text-[15px] font-bold text-[#6B7280] mb-2 tracking-tight">
                    {secondaryTitle?.value || isEditing ? (
                      <Text field={secondaryTitle} />
                    ) : (
                      <span>Secondary Tools</span>
                    )}
                  </p>
                )}
                {(secondaryDescription?.value || isEditing || !hasAnyDatasource) && (
                  <div className="text-[13px] text-[#6B7280] mb-5 font-normal leading-relaxed">
                    {secondaryDescription?.value || isEditing ? (
                      <RichText field={secondaryDescription} />
                    ) : (
                      <p>Extend capabilities with secondary tools.</p>
                    )}
                  </div>
                )}
                <MarqueeRow logos={secondaryLogos} direction="right" />
              </div>
            )}

            {(ctaLeadIn?.value || ctaLink?.value?.href || isEditing || !hasAnyDatasource) && (
              <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5">
                {(ctaLeadIn?.value || isEditing || !hasAnyDatasource) && (
                  <span className="text-[16px] sm:text-[17px] font-bold text-[#1d1d1f] tracking-tight">
                    {ctaLeadIn?.value || isEditing ? (
                      <Text field={ctaLeadIn} />
                    ) : (
                      <span>Ready to get started?</span>
                    )}
                  </span>
                )}
                {(ctaLink?.value?.href || isEditing || !hasAnyDatasource) && (
                  <>
                    {ctaLink?.value?.href || isEditing ? (
                      <JssLink field={ctaLink as any} className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-[#079bea] hover:bg-[#078bd3] text-white font-bold text-[13px] sm:text-[14px] transition-all duration-300 shadow-lg shadow-[#079bea]/30">
                        <span>{ctaLink?.value?.text || 'Sign Up Now'}</span>
                        <span aria-hidden="true">&rarr;</span>
                      </JssLink>
                    ) : (
                      <a href="#" className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-[#079bea] hover:bg-[#078bd3] text-white font-bold text-[13px] sm:text-[14px] transition-all duration-300 shadow-lg shadow-[#079bea]/30">
                        <span>Sign Up Now</span>
                        <span aria-hidden="true">&rarr;</span>
                      </a>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
};

export const Default = (props: LogoCarouselProps) => (
  <LogoCarouselLayout {...props} variant="default" />
);

export const DetailedCard = (props: LogoCarouselProps) => (
  <LogoCarouselLayout {...props} variant="detailedCard" />
);

export default Default;