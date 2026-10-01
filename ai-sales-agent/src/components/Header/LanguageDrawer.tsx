import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export const LanguageDrawer = ({ regions }: { regions: any }) => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname() || '';
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close drawer on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!regions || (Array.isArray(regions) && regions.length === 0)) return null;

  // Robust extractors for Sitecore fields based on screenshot
  const getFlagSrc = (region: any) => {
    const flagObj = region?.fields?.Icon?.value || region?.fields?.icon?.value || region?.fields?.Flag?.value || region?.fields?.flag?.value;
    return flagObj?.src || flagObj?.url || '';
  };

  const getAppendUrl = (region: any) => {
    const urlField = region?.fields?.Url || region?.fields?.url || region?.fields?.['Append Url'];
    // Handle General Link object
    if (urlField?.value?.href) return urlField.value.href;
    if (urlField?.href) return urlField.href;
    // Handle plain text field
    if (typeof urlField?.value === 'string') return urlField.value;
    if (typeof urlField === 'string') return urlField;
    return '#';
  };

  const getName = (region: any) => {
    const nameStr = region?.fields?.['Language Name Field']?.value || region?.fields?.Name?.value || region?.name || 'Language';
    
    // Combine language codes if they exist
    const code1 = region?.fields?.['Language Code Field']?.value;
    const code2 = region?.fields?.['Second Language Code Field']?.value;
    const code3 = region?.fields?.['Third Language Code Field']?.value;
    
    const codes = [code1, code2, code3].filter(Boolean);
    
    if (codes.length > 0) {
      return `${nameStr} (${codes.join(' | ')})`;
    }
    return nameStr;
  };

  // Determine active region
  let activeRegion = regions[0];
  for (const region of regions) {
    const url = getAppendUrl(region);
    if (url && url !== '#' && url !== '/' && pathname.includes(url)) {
      activeRegion = region;
      break;
    } else if (url === '/' && pathname === '/') {
      activeRegion = region;
      break;
    }
  }

  const activeFlagSrc = getFlagSrc(activeRegion);

  return (
    <div className="relative flex items-center" ref={drawerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer"
        aria-label="Select Language"
      >
        {activeFlagSrc ? (
          <img src={activeFlagSrc} alt="Current Language" className="w-6 h-4 object-cover border border-gray-200 shadow-sm" />
        ) : (
          <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-6 w-[320px] sm:w-[600px] bg-mist-50 shadow-2xl z-50 p-6 sm:p-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
            {Array.isArray(regions) && regions.map((region: any, i: number) => {
              const url = getAppendUrl(region) || '#';
              const flagSrc = getFlagSrc(region);
              const name = getName(region);
              const isActive = region.id === activeRegion?.id || region.name === activeRegion?.name;

              return (
                <a 
                  key={i}
                  href={url}
                  className="group flex items-center justify-between pb-2 border-b-2 border-black/80 hover:border-black transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    {flagSrc ? (
                      <img src={flagSrc} alt={name} className="w-6 h-4 object-cover" />
                    ) : (
                      <div className="w-6 h-4 bg-gray-300"></div> // Placeholder if no flag
                    )}
                    <span className={`text-[15px] tracking-tight ${isActive ? 'font-bold text-black' : 'font-normal text-black'}`}>
                      {name}
                    </span>
                  </div>
                  {isActive && (
                    <svg className="w-5 h-5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
