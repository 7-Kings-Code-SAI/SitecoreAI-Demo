'use client';

import { JSX, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Text, Field, LinkField } from '@sitecore-content-sdk/nextjs';
import { normalizeHref } from 'lib/useLinkNormalizer';

export type HealthCheckSuccessProps = {
  fields: {
    Title: Field<string>;
    Description: Field<string>;
    ButtonLabel: Field<string>;
    StartRoute: LinkField;
  };
};

const HealthCheckSuccess = ({ fields }: HealthCheckSuccessProps): JSX.Element => {
  const router = useRouter();

  const getStartUrl = (): string => {
    const raw =
      fields?.StartRoute?.value?.href ||
      (fields?.StartRoute as any)?.href ||
      (fields?.StartRoute?.value as any)?.url ||
      '/';
    const currentLocale = router.locale || 'en';
    return normalizeHref(raw, currentLocale) || raw;
  };

  const clearSessionData = () => {
    try {
      sessionStorage.removeItem('hygiene-check');
      sessionStorage.removeItem('hygiene-quiz-answers');
      sessionStorage.removeItem('hygiene-check-lead');
      sessionStorage.removeItem('hygiene-check-session-id');
    } catch {
      // Ignore storage errors
    }
  };

  // Prevent browser Back button from returning to the results page.
  // Instead, intercept Back button and route to the start/check page for requiz.
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      clearSessionData();
      const targetUrl = getStartUrl();
      window.location.replace(targetUrl);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [fields?.StartRoute]);

  const handleRestart = (e: React.MouseEvent) => {
    e.preventDefault();
    clearSessionData();
    const targetUrl = getStartUrl();
    router.replace(targetUrl);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center bg-white">
      
      {/* Green Checkmark Icon */}
      <div className="flex items-center justify-center w-20 h-20 mb-8 bg-[#cbf4d5] rounded-full">
        <svg 
          width="32" height="32" viewBox="0 0 24 24" fill="none" 
          stroke="#00a651" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      {/* Title */}
      <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-gray-900 md:text-5xl">
        <Text field={fields?.Title} />
      </h1>

      {/* Description */}
      <p className="max-w-sm mb-10 text-lg text-gray-500">
        <Text field={fields?.Description} />
      </p>

      {/* Restart Button */}
      <button 
        onClick={handleRestart}
        className="px-10 py-4 font-bold text-white transition-colors bg-[#e2001a] rounded-full hover:bg-red-700 shadow-md shadow-red-500/20"
      >
        <Text field={fields?.ButtonLabel} />
      </button>

    </div>
  );
};

export const Default: React.FC<HealthCheckSuccessProps> = HealthCheckSuccess;
export default HealthCheckSuccess;
