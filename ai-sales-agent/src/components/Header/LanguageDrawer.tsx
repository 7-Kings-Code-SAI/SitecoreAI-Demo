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
      let formatted = rawUrl.startsWith("http")
        ? rawUrl
        : rawUrl.startsWith("/")
        ? rawUrl
        : `/${rawUrl}`;
      const lower = formatted.toLowerCase().replace(/\/+$/, "");
      if (lower === "" || lower === "/en") return "/en";
      return formatted;
    }

    const languageCode =
      region?.fields?.["Language Code Field"]?.value ||
      region?.fields?.LanguageCode?.value ||
      region?.fields?.Code?.value;

    if (typeof languageCode === "string" && languageCode.trim()) {
      const clean = languageCode.trim();
      const lower = clean.toLowerCase();
      if (lower === "en") return "/en";
      return `/${clean}`;
    }

    return "/en";
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
    if (!url) return "/en";
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

    // Path prefix match for current route (e.g. /sv-se/... or /en/...)
    const currentPath = (router?.asPath || "").toLowerCase();
    for (const code of codes) {
      if (code && code !== "/") {
        if (
          currentPath === `/${code}` ||
          currentPath.startsWith(`/${code}/`) ||
          currentPath.startsWith(`/${code}?`)
        ) {
          return true;
        }
      }
    }

    // Default English fallback if currentLocale is English or default
    if (
      (currentLocale === "en" || currentLocale === "en-us" || currentLocale === "default") &&
      (codes.includes("en") || codes.includes("en-us") || getAppendUrl(region) === "/en" || getAppendUrl(region) === "/")
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
      getAppendUrl(region) === "/en" ||
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
      let cleanPath = translatedPath.startsWith("/")
        ? translatedPath
        : `/${translatedPath}`;

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

    setIsOpen(false);
    const targetUrl = getLanguageUrl(region);

    e.preventDefault();
    window.location.href = targetUrl;
  };

  const activeFlagSrc = getFlagSrc(activeRegion);

  // ============================================================
  // LANGUAGE DISPLAY HELPERS
  // ============================================================
  const getLanguageLabel = (region: any) => {
    const rawName = getName(region);
    const code = getLanguageCode(region);
    const clean = rawName.replace(/\s*\([^)]*\)/g, "").trim();
    const lower = (code || clean).toLowerCase();

    if (lower.includes("de")) return "Deutsch";
    if (lower.includes("sv") || lower.includes("se")) return "Svenska";
    if (lower.includes("en")) return "English";
    if (lower.includes("fr")) return "Français";
    if (lower.includes("es")) return "Español";
    return clean || code.toUpperCase();
  };

  const renderFlag = (region: any) => {
    const flagSrc = getFlagSrc(region);
    const code = getLanguageCode(region).toLowerCase();

    if (flagSrc) {
      return (
        <img
          src={flagSrc}
          alt={code}
          className="w-full h-full object-cover"
        />
      );
    }

    if (code.includes("de")) {
      return (
        <svg className="w-full h-full" viewBox="0 0 640 480" fill="none">
          <path fill="#111" d="M0 0h640v160H0z"/>
          <path fill="#DD0000" d="M0 160h640v160H0z"/>
          <path fill="#FFCE00" d="M0 320h640v160H0z"/>
        </svg>
      );
    }
    if (code.includes("sv") || code.includes("se")) {
      return (
        <svg className="w-full h-full" viewBox="0 0 640 480" fill="none">
          <path fill="#006AA7" d="M0 0h640v480H0z"/>
          <path fill="#FECC00" d="M0 192h640v96H0z"/>
          <path fill="#FECC00" d="M176 0h96v480h-96z"/>
        </svg>
      );
    }
    if (code.includes("en") || code.includes("us") || code.includes("gb")) {
      return (
        <svg className="w-full h-full" viewBox="0 0 640 480" fill="none">
          <rect width="640" height="480" fill="#BD3D44"/>
          <path stroke="#FFF" strokeWidth="37" d="M0 55.4h640M0 129.2h640M0 203h640M0 276.9h640M0 350.8h640M0 424.6h640"/>
          <rect width="256" height="258" fill="#192F5D"/>
        </svg>
      );
    }

    return (
      <div className="w-full h-full bg-slate-200 text-slate-700 text-[9px] font-bold flex items-center justify-center uppercase">
        {code.slice(0, 2)}
      </div>
    );
  };

  // ============================================================
  // RENDER (SIMPLE CLEAN DROPDOWN)
  // ============================================================
  return (
    <div className="relative inline-block text-left" ref={drawerRef}>
      {/* Clean Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold tracking-wide transition-colors cursor-pointer ${
          isOpen
            ? "bg-gray-100 border-gray-300 text-gray-900"
            : "bg-white hover:bg-gray-50 border-gray-200 text-gray-700 hover:text-gray-900"
        }`}
        aria-label="Select Language"
        type="button"
      >
        <div className="relative flex items-center justify-center overflow-hidden rounded-[2px] w-4 h-3 shadow-2xs ring-1 ring-black/10 flex-shrink-0">
          {renderFlag(activeRegion)}
        </div>

        <span className="uppercase font-mono font-bold text-gray-800">
          {getLanguageCode(activeRegion)}
        </span>

        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 ${
            isOpen ? "rotate-180 text-gray-600" : ""
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Simple Minimal Dropdown List */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl border border-gray-200 shadow-lg p-1 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="py-0.5">
            {regionsList.map((region: any, i: number) => {
              const label = getLanguageLabel(region);
              const code = getLanguageCode(region);
              const isActive = isRegionActive(region);
              const languageUrl = getLanguageUrl(region);

              return (
                <a
                  key={region.id || i}
                  href={languageUrl}
                  onClick={(e) => handleLanguageClick(e, region)}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-blue-50 text-[#0c7abf] font-semibold"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative flex-shrink-0 w-4 h-3 rounded-[2px] overflow-hidden shadow-2xs ring-1 ring-black/10">
                      {renderFlag(region)}
                    </div>
                    <span className="truncate">{label}</span>
                  </div>

                  {isActive && (
                    <svg
                      className="w-3.5 h-3.5 text-[#0c7abf] flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
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