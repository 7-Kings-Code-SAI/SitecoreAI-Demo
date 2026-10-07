"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { useSitecore } from "@sitecore-content-sdk/nextjs";

export const LanguageDrawer = ({ regions }: { regions: any }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number>(-1);
  const drawerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Current item's ID & layout from Sitecore Content SDK
  const { page } = useSitecore();
  const itemId: string | undefined =
    page?.layout?.sitecore?.route?.itemId || (page as any)?.itemId;

  // Active locale from Sitecore route, page, or Next.js router
  const currentLocale = (
    page?.layout?.sitecore?.route?.itemLanguage ||
    page?.locale ||
    router?.locale ||
    "en"
  )
    .toLowerCase()
    .trim();

  const [translations, setTranslations] = useState<Record<string, string | null>>({});

  // ============================================================
  // CLOSE DRAWER WHEN CLICKING OUTSIDE
  // ============================================================
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        drawerRef.current &&
        !drawerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  // ============================================================
  // FIELD READERS (Strictly using Sitecore Template fields)
  // ============================================================
  const getFlagSrc = (region: any) => {
    return region?.fields?.Icon?.value?.src || "";
  };

  const getAppendUrl = (region: any): string => {
    const rawUrl = region?.fields?.Url?.value?.href;

    if (rawUrl && rawUrl !== "#" && rawUrl !== "/") {
      let formatted = rawUrl.startsWith("http")
        ? rawUrl
        : rawUrl.startsWith("/")
          ? rawUrl
          : `/${rawUrl}`;
      const lower = formatted.toLowerCase().replace(/\/+$/, "");
      if (lower === "/en") return "/en";
      if (lower !== "") return formatted;
    }

    const field = region?.fields?.["Language Code Field"];
    const languageCode = typeof field === "object" ? field?.value : field;

    if (typeof languageCode === "string" && languageCode.trim()) {
      const clean = languageCode.trim();
      const lower = clean.toLowerCase();
      if (lower === "en") return "/en";
      return `/${clean}`;
    }

    return "/en";
  };

  const getLanguageCode = (region: any): string => {
    const field = region?.fields?.["Language Code Field"];
    const code = typeof field === "object" ? field?.value : field;
    if (typeof code === "string" && code.trim()) {
      return code.trim();
    }
    return "en";
  };

  const getRegionCodes = (region: any): string[] => {
    const codes: string[] = [];
    const field = region?.fields?.["Language Code Field"];
    const code = typeof field === "object" ? field?.value : field;
    if (typeof code === "string" && code.trim()) {
      const clean = code.trim().toLowerCase().replace(/^\/+|\/+$/g, "");
      if (clean && clean !== "#") codes.push(clean);
    }
    return codes;
  };

  const getLanguageLabel = (region: any) => {
    const field = region?.fields?.["Language Name Field"];
    const name = typeof field === "object" ? field?.value : field;
    return name || getLanguageCode(region).toUpperCase();
  };

  const normalizePath = (url: string) => {
    if (!url) return "/en";
    const clean = url.split("?")[0].split("#")[0];
    return clean.length > 1 ? clean.replace(/\/+$/, "") : clean;
  };

  const regionsList: any[] = Array.isArray(regions) ? regions : [];

  // ============================================================
  // FETCH TRANSLATED URLS FOR THE CURRENT ITEM
  // ============================================================
  useEffect(() => {
    if (!itemId || regionsList.length === 0) return;

    const languages = Array.from(
      new Set(
        regionsList.flatMap((r) => [
          getLanguageCode(r),
          ...getRegionCodes(r),
        ]).filter(Boolean)
      )
    );

    if (languages.length === 0) return;

    let cancelled = false;

    fetch("/api/language-urls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, languages }),
    })
      .then((res) => res.json())
      .then((result) => {
        if (!cancelled && result?.success) {
          setTranslations(result.translations || {});
        }
      })
      .catch((err) => {
        console.error("Failed to fetch language translations:", err);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, regionsList.length]);

  if (!regions || regionsList.length === 0) {
    return null;
  }

  // ============================================================
  // DETERMINE CURRENT LANGUAGE / ACTIVE REGION
  // ============================================================
  const getActiveRegion = () => {
    if (!regionsList || regionsList.length === 0) return null;

    // 1. Try exact match first
    let match = regionsList.find((region) => {
      const codes = getRegionCodes(region);
      return codes.includes(currentLocale);
    });
    if (match) return match;

    // 2. Try path prefix match
    const currentPath = (router?.asPath || "").toLowerCase();
    match = regionsList.find((region) => {
      const codes = getRegionCodes(region);
      return codes.some(
        (code) =>
          code &&
          code !== "/" &&
          (currentPath === `/${code}` ||
            currentPath.startsWith(`/${code}/`) ||
            currentPath.startsWith(`/${code}?`))
      );
    });
    if (match) return match;

    // 3. Try fuzzy match (e.g. Next.js 'hr-hr' matches Sitecore 'hr')
    match = regionsList.find((region) => {
      const codes = getRegionCodes(region);
      return codes.some((c) => currentLocale.startsWith(`${c}-`));
    });
    if (match) return match;

    // 4. Default english fallback
    match = regionsList.find((region) => {
      const codes = getRegionCodes(region);
      return (
        (currentLocale === "en" || currentLocale === "en-us" || currentLocale === "default") &&
        (codes.includes("en") || codes.includes("en-us") || getAppendUrl(region) === "/en" || getAppendUrl(region) === "/")
      );
    });
    if (match) return match;

    return regionsList[0];
  };

  const activeRegion = getActiveRegion();

  const isRegionActive = (region: any): boolean => {
    return region === activeRegion;
  };

  // ============================================================
  // BUILD TARGET LANGUAGE URL
  // ============================================================
  const getLanguageUrl = (region: any): string => {
    const targetCode = getLanguageCode(region);
    const targetCodes = getRegionCodes(region);
    const isTargetDefault =
      targetCode.toLowerCase() === "en" ||
      targetCodes.includes("en");

    // Check if we fetched a translated path for this target language
    let translatedPath: string | null = null;
    for (const code of targetCodes) {
      for (const [key, val] of Object.entries(translations)) {
        if (key.toLowerCase() === code.toLowerCase() && val) {
          translatedPath = val;
          break;
        }
      }
      if (translatedPath) break;
    }

    const prefix = normalizePath(getAppendUrl(region));

    if (translatedPath) {
      let cleanPath = translatedPath.startsWith("/") ? translatedPath : `/${translatedPath}`;

      if (isTargetDefault) {
        if (cleanPath === "/" || cleanPath === "") {
          return "/en";
        }
        if (!cleanPath.toLowerCase().startsWith("/en")) {
          return `/en${cleanPath}`;
        }
        return cleanPath;
      }

      // For non-default languages
      const targetPrefix = prefix && prefix !== "/" ? prefix : `/${targetCode}`;
      const targetPrefixLower = targetPrefix.toLowerCase();
      if (!cleanPath.toLowerCase().startsWith(targetPrefixLower)) {
        return `${targetPrefix}${cleanPath}`;
      }
      return cleanPath;
    }

    // Fallback if no translation returned
    if (isTargetDefault) {
      return "/en";
    }

    return prefix && prefix !== "/" ? prefix : `/${targetCode}`;
  };

  // ============================================================
  // HANDLE LANGUAGE SWITCH
  // ============================================================
  const handleLanguageClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    region: any
  ) => {
    if (isRegionActive(region)) {
      e.preventDefault();
      setIsOpen(false);
      return;
    }

    const targetCode = getLanguageCode(region);
    // Set NEXT_LOCALE cookie so Next.js doesn't redirect back
    document.cookie = `NEXT_LOCALE=${targetCode}; path=/; max-age=31536000; SameSite=Lax`;

    // Short delay before closing per specs
    setTimeout(() => setIsOpen(false), 200);

    const targetUrl = getLanguageUrl(region);
    e.preventDefault();
    window.location.href = targetUrl;
  };

  const renderFlag = (region: any) => {
    const src = getFlagSrc(region);
    if (src) {
      return <img src={src} alt="" className="w-full h-full object-cover rounded-full" />;
    }
    const code = getLanguageCode(region).toUpperCase();
    return (
      <div className="w-full h-full bg-slate-200 text-slate-700 text-[9px] font-bold flex items-center justify-center uppercase rounded-full">
        {code.slice(0, 2)}
      </div>
    );
  };

  const hoveredRegion = hoverIndex !== -1 ? regionsList[hoverIndex] : activeRegion;

  // ============================================================
  // RENDER (4-COLUMN GRID WITH FOOTER)
  // ============================================================
  return (
    <div className="relative inline-block text-left" ref={drawerRef}>
      {/* TRIGGER BUTTON */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select Language"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        type="button"
        className="group flex items-center justify-between gap-1.5 h-[32px] px-2.5 rounded-full bg-[#0EA5E9]/10 hover:bg-[#0EA5E9]/15 active:scale-95 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] outline-none border-none focus-visible:ring-2 focus-visible:ring-[#0EA5E9]"
      >
        <div className="relative flex items-center justify-center w-[18px] h-[18px] rounded-full overflow-hidden transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110 group-hover:-rotate-6">
          {renderFlag(activeRegion)}
        </div>
        <span className="text-[12px] font-bold uppercase tracking-wider text-slate-800">
          {getLanguageCode(activeRegion)}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-[#0EA5E9] transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isOpen ? "rotate-180" : "rotate-0"
            }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* DROPDOWN */}
      {isOpen && (
        <div
          className="absolute top-[calc(100%+8px)] right-0 w-[292px] bg-white/90 backdrop-blur-xl border border-white/40 rounded-[18px] flex flex-col shadow-[0_10px_35px_-5px_rgba(0,0,0,0.1),0_8px_15px_-6px_rgba(0,0,0,0.05)] z-50 origin-top-right animate-in fade-in zoom-in-95 duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden"
          role="listbox"
        >
          {/* Arrow pointing up */}
          <div className="absolute -top-1.5 right-5 w-3 h-3 bg-white/90 rotate-45 rounded-sm shadow-[-2px_-2px_4px_rgba(0,0,0,0.03)] z-[-1]" />

          {/* Grid Container */}
          <div className="grid grid-cols-4 gap-1.5 p-3">
            {regionsList.map((region: any, i: number) => {
              const isActive = isRegionActive(region);
              const languageUrl = getLanguageUrl(region);
              const shortCode = getLanguageCode(region).toUpperCase();

              return (
                <a
                  key={region.id || i}
                  href={languageUrl}
                  onClick={(e) => handleLanguageClick(e, region)}
                  onMouseEnter={() => setHoverIndex(i)}
                  onMouseLeave={() => setHoverIndex(-1)}
                  role="option"
                  aria-selected={isActive}
                  className={`group relative flex flex-col items-center justify-center h-[62px] rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5E9]/50 active:scale-95 transition-all animate-in fade-in slide-in-from-top-2 fill-mode-backwards duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer ${isActive
                    ? "bg-gradient-to-br from-[#0EA5E9] to-[#38BDF8] shadow-[0_4px_12px_rgba(14,165,233,0.3)]"
                    : "bg-transparent hover:bg-[#0EA5E9]/10"
                    }`}
                  style={{ animationDelay: `${i * 35}ms` }}
                >
                  <div className={`w-[26px] h-[26px] rounded-full overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isActive
                    ? "shadow-[0_0_0_2px_rgba(255,255,255,0.3)]"
                    : "group-hover:-translate-y-[2px] group-hover:scale-[1.20] group-hover:-rotate-8 group-hover:shadow-[0_0_0_3px_rgba(14,165,233,0.2)]"
                    }`}>
                    {renderFlag(region)}
                  </div>
                  <span
                    className={`mt-1.5 text-[10.5px] font-bold leading-none transition-colors duration-300 ${isActive ? "text-white" : "text-slate-600 group-hover:text-slate-900"
                      }`}
                  >
                    {shortCode}
                  </span>
                </a>
              );
            })}
          </div>

          {/* Footer Bar */}
          <div className="w-full h-8 px-4 flex items-center justify-between bg-[#0EA5E9]/10 border-t border-white/50 text-[11px] font-semibold tracking-wide text-slate-700 transition-colors duration-300">
            <span className="truncate pr-2">{getLanguageLabel(hoveredRegion)}</span>
            <span className="text-slate-500 font-medium truncate shrink-0">{getLanguageCode(hoveredRegion).toUpperCase()}</span>
          </div>
        </div>
      )}
    </div>
  );
};