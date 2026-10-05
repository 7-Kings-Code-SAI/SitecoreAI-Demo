"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { useSitecore } from "@sitecore-content-sdk/nextjs";

export const LanguageDrawer = ({ regions }: { regions: any }) => {
  const [isOpen, setIsOpen] = useState(false);
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

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // ============================================================
  // FIELD READERS & UTILITIES
  // ============================================================
  const getFlagSrc = (region: any) => {
    const flagObj =
      region?.fields?.Icon?.value ||
      region?.fields?.icon?.value ||
      region?.fields?.Flag?.value ||
      region?.fields?.flag?.value;

    return flagObj?.src || flagObj?.url || "";
  };

  const getAppendUrl = (region: any): string => {
    const urlField =
      region?.fields?.Url ||
      region?.fields?.url ||
      region?.fields?.["Append Url"] ||
      region?.fields?.["append_url"] ||
      region?.fields?.["AppendUrl"];

    const rawUrl =
      urlField?.value?.href ||
      urlField?.href ||
      (typeof urlField?.value === "string" ? urlField.value : null) ||
      (typeof urlField === "string" ? urlField : null);

    if (rawUrl && rawUrl !== "#") {
      return rawUrl.startsWith("http")
        ? rawUrl
        : rawUrl.startsWith("/")
        ? rawUrl
        : `/${rawUrl}`;
    }

    const languageCode =
      region?.fields?.["Language Code Field"]?.value ||
      region?.fields?.LanguageCode?.value ||
      region?.fields?.Code?.value;

    if (typeof languageCode === "string" && languageCode.trim()) {
      const clean = languageCode.trim();
      return clean.toLowerCase() === "en" ? "/" : `/${clean}`;
    }

    return "/";
  };

  const getLanguageCode = (region: any): string => {
    const code =
      region?.fields?.["Language Code Field"]?.value ||
      region?.fields?.LanguageCode?.value ||
      region?.fields?.Code?.value;

    if (typeof code === "string" && code.trim()) {
      return code.trim();
    }

    const appendUrl = getAppendUrl(region).replace(/^\/+|\/+$/g, "");
    if (appendUrl && appendUrl !== "#") {
      return appendUrl;
    }

    if (typeof region?.name === "string" && region.name.trim()) {
      return region.name.trim();
    }

    return "en";
  };

  const getRegionCodes = (region: any): string[] => {
    const codes: string[] = [];
    const add = (val: any) => {
      if (typeof val === "string" && val.trim()) {
        const clean = val.trim().toLowerCase().replace(/^\/+|\/+$/g, "");
        if (clean && clean !== "#" && !codes.includes(clean)) {
          codes.push(clean);
        }
      }
    };

    add(region?.fields?.["Language Code Field"]?.value);
    add(region?.fields?.["Second Language Code Field"]?.value);
    add(region?.fields?.["Third Language Code Field"]?.value);
    add(region?.fields?.LanguageCode?.value);
    add(region?.fields?.Code?.value);
    add(getAppendUrl(region));
    if (typeof region?.name === "string") {
      add(region.name);
    }
    return codes;
  };

  const getName = (region: any) => {
    const nameStr =
      region?.fields?.["Language Name Field"]?.value ||
      region?.fields?.Name?.value ||
      region?.name ||
      "Language";

    const codes = [
      region?.fields?.["Language Code Field"]?.value,
      region?.fields?.["Second Language Code Field"]?.value,
      region?.fields?.["Third Language Code Field"]?.value,
    ].filter(Boolean);

    return codes.length > 0 ? `${nameStr} (${codes.join(" | ")})` : nameStr;
  };

  const normalizePath = (url: string) => {
    if (!url) return "/";
    const clean = url.split("?")[0].split("#")[0];
    return clean.length > 1 ? clean.replace(/\/+$/, "") : clean;
  };

  const regionsList: any[] = Array.isArray(regions) ? regions : [];

  // ============================================================
  // FETCH TRANSLATED URLS FOR THE CURRENT ITEM
  // Runs once per item
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
  const isRegionActive = (region: any): boolean => {
    const codes = getRegionCodes(region);

    // Direct match with currentLocale (e.g. 'en', 'sv-se', 'sv')
    if (
      codes.includes(currentLocale) ||
      codes.some(
        (c) =>
          c === currentLocale ||
          currentLocale.startsWith(`${c}-`) ||
          c.startsWith(`${currentLocale}-`)
      )
    ) {
      return true;
    }

    // Path prefix match for current route (e.g. /sv-se/... or /sv/...)
    const currentPath = (router?.asPath || "").toLowerCase();
    for (const code of codes) {
      if (code && code !== "en" && code !== "/") {
        if (
          currentPath === `/${code}` ||
          currentPath.startsWith(`/${code}/`) ||
          currentPath.startsWith(`/${code}?`)
        ) {
          return true;
        }
      }
    }

    // Default English fallback if currentLocale is English
    if (
      (currentLocale === "en" || currentLocale === "en-us") &&
      (codes.includes("en") || codes.includes("en-us") || getAppendUrl(region) === "/")
    ) {
      return true;
    }

    return false;
  };

  const activeRegion =
    regionsList.find((r) => isRegionActive(r)) || regionsList[0];

  // ============================================================
  // BUILD TARGET LANGUAGE URL
  // ============================================================
  const getLanguageUrl = (region: any): string => {
    const targetCode = getLanguageCode(region);
    const targetCodes = getRegionCodes(region);
    const isTargetDefault =
      targetCode.toLowerCase() === "en" ||
      targetCodes.includes("en") ||
      getAppendUrl(region) === "/";

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
      const cleanPath = translatedPath.startsWith("/")
        ? translatedPath
        : `/${translatedPath}`;

      if (isTargetDefault) {
        // Strip out any leading /en for default English routing
        const withoutEn = cleanPath.replace(/^\/en(\/|$)/i, "/");
        return withoutEn || "/";
      }

      // For non-default languages (e.g. sv-SE)
      const targetPrefixLower = prefix.toLowerCase();
      if (
        prefix &&
        prefix !== "/" &&
        !cleanPath.toLowerCase().startsWith(targetPrefixLower)
      ) {
        return `${prefix}${cleanPath}`;
      }
      return cleanPath;
    }

    // Fallback if no translation returned
    if (isTargetDefault) {
      return "/";
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

    setIsOpen(false);
    const targetUrl = getLanguageUrl(region);

    e.preventDefault();
    window.location.href = targetUrl;
  };

  const activeFlagSrc = getFlagSrc(activeRegion);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="relative inline-block text-left" ref={drawerRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex items-center gap-2.5 px-3 py-2 rounded-full border text-sm font-medium transition-all duration-200 cursor-pointer ${
          isOpen
            ? "bg-white border-[#399BEA] shadow-md ring-2 ring-[#399BEA]/20"
            : "bg-white/80 backdrop-blur-md border-gray-200 hover:border-[#399BEA]/50 hover:bg-white shadow-sm"
        }`}
        aria-label="Select Language"
        type="button"
      >
        {activeFlagSrc ? (
          <div className="relative flex items-center justify-center overflow-hidden rounded-sm w-5 h-3.5 shadow-sm ring-1 ring-black/5">
            <img
              src={activeFlagSrc}
              alt="Current Language"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <svg
            className="w-4 h-4 text-gray-700 group-hover:text-[#399BEA] transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
            />
          </svg>
        )}

        <span className="text-xs font-semibold uppercase tracking-wider text-gray-700 group-hover:text-gray-900">
          {getLanguageCode(activeRegion)}
        </span>

        {/* Chevron Icon with animated rotate */}
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-[#399BEA]" : "group-hover:text-gray-600"
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Language Selection Drawer Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2.5 w-[320px] sm:w-[520px] bg-white/95 backdrop-blur-xl border border-gray-100 rounded-2xl shadow-2xl z-50 p-5 ring-1 ring-black/5 transition-all animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header Subtitle Accent */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#399BEA]">
              Select Region / Language
            </span>
            <span className="text-[11px] text-gray-400 font-medium">
              {regionsList.length} Available
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {regionsList.map((region: any, i: number) => {
              const flagSrc = getFlagSrc(region);
              const name = getName(region);
              const isActive = isRegionActive(region);
              const languageUrl = getLanguageUrl(region);

              return (
                <a
                  key={region.id || i}
                  href={languageUrl}
                  onClick={(e) => handleLanguageClick(e, region)}
                  className={`group relative flex items-center justify-between p-2.5 rounded-xl transition-all duration-150 cursor-pointer ${
                    isActive
                      ? "bg-[#399BEA]/10 border border-[#399BEA]/30 text-[#399BEA]"
                      : "hover:bg-gray-50 border border-transparent text-gray-700 hover:text-gray-900"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    {flagSrc ? (
                      <div className="relative flex-shrink-0 w-6 h-4 rounded-sm overflow-hidden shadow-xs ring-1 ring-black/10">
                        <img
                          src={flagSrc}
                          alt={name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex-shrink-0 w-6 h-4 bg-gray-200 rounded-sm" />
                    )}
                    <span
                      className={`text-sm truncate transition-colors ${
                        isActive
                          ? "font-semibold text-[#399BEA]"
                          : "font-medium group-hover:text-gray-900"
                      }`}
                    >
                      {name}
                    </span>
                  </div>

                  {isActive ? (
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#399BEA] flex items-center justify-center text-white shadow-xs">
                      <svg
                        className="w-3.5 h-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  ) : (
                    <svg
                      className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 group-hover:text-gray-400 transition-all transform group-hover:translate-x-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 5l7 7-7 7"
                      />
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