import { Text, Image as JssImage, Link as JssLink } from '@sitecore-content-sdk/nextjs';
import { GlobalFooterProps } from './GlobalFooter.props';

export const GlobalFooter = (props: GlobalFooterProps) => {
  // Extract the perfectly structured GraphQL data injected by Sitecore
  const item = props?.fields?.data?.datasource || props?.fields?.data?.item;

  if (!item) return null;

  const socialLinks = item.socialLinks?.targetItems || [];
  const legalLinks = item.legalLinks?.targetItems || [];

  return (
    <div className="relative z-10 w-full bg-white font-sans">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Top Separator */}
        <div className="w-full h-px bg-slate-200/60 mb-8"></div>
        
        {/* Logo and Socials Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-8">
          
          {/* Brand Logo */}
          <div className="flex items-center select-none">
            {item.brandLogoLink?.jsonValue?.value?.href ? (
              <JssLink field={item.brandLogoLink?.jsonValue}>
                <JssImage field={item.brandLogo?.jsonValue} className="h-8 w-auto object-contain" />
              </JssLink>
            ) : (
              <JssImage field={item.brandLogo?.jsonValue} className="h-8 w-auto object-contain" />
            )}
          </div>
          
          {/* Social Icons */}
          {socialLinks.length > 0 && (
            <div className="flex items-center gap-5">
              {socialLinks.map((social: any) => (
                <JssLink 
                  key={social.id} 
                  field={social.link?.jsonValue} 
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[#1d1d1f] hover:bg-[#30A3FF] hover:text-white transition-all duration-300"
                  aria-label={social.name}
                >
                  {/* Renders the uploaded SVG from Sitecore Media Library */}
                  {social.icon?.jsonValue?.value ? (
                    <JssImage field={social.icon?.jsonValue} className="w-4 h-4 object-contain" />
                  ) : (
                    <span className="text-[10px]">{social.name}</span>
                  )}
                </JssLink>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Separator */}
        <div className="w-full h-px bg-slate-200/40 mb-6"></div>

        {/* Legal Links and Copyright Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-[#6B7280] font-medium pb-8">
          
          {/* Legal Links */}
          <div className="flex items-center gap-6">
            {legalLinks.map((legal: any) => {
              const linkField = legal.link?.jsonValue;
              if (!linkField) return null;

              return (
                <JssLink 
                  key={legal.id} 
                  field={linkField} 
                  className="hover:text-[#30A3FF] transition-colors"
                >
                  {linkField.value?.text || legal.title?.jsonValue?.value || legal.name}
                </JssLink>
              );
            })}
          </div>
          
          {/* Copyright & Powered By */}
          <div className="select-none flex flex-col sm:items-end gap-1">
            <span>
              <Text field={item.copyrightText?.jsonValue} />
            </span>
            <span className="text-[11px] text-[#6B7280]/70">
              <Text field={item.poweredByText?.jsonValue} />
            </span>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default GlobalFooter;