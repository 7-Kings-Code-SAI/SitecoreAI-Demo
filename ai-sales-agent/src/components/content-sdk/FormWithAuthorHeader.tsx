'use client';

import { useEffect, useRef, useState } from 'react';
import { useSitecore } from '@sitecore-content-sdk/nextjs';

/**
 * Wraps the built-in Sitecore SDK Form component.
 * Automatically extracts the hidden form_name field from the form markup
 * and displays an Author Banner at the top ONLY in Page Builder / Experience Editor.
 * On live pages, this banner is completely omitted.
 */
export const withAuthorFormHeader = (BuiltInForm: any) => {
  return function WrappedForm(props: any) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [formName, setFormName] = useState<string>('');
    const { page } = useSitecore();

    // Check if in Page Builder / Experience Editor
    const isEditing = Boolean(
      page?.mode?.isEditing ||
      props?.params?.isEditing ||
      props?.rendering?.params?.isEditing ||
      (typeof window !== 'undefined' && (
        window.location.search.includes('sc_mode=edit') ||
        window.location.search.includes('sc_mode=preview') ||
        window.location.pathname.startsWith('/api/editing')
      ))
    );

    useEffect(() => {
      if (!isEditing || !containerRef.current) return;

      const extractFormName = () => {
        if (!containerRef.current) return;
        // Find the hidden field containing form name (e.g. name="form_name", data-prefill, etc.)
        const input = containerRef.current.querySelector<HTMLInputElement>(
          'input[name="form_name"], input[name*="form_name"], input[data-prefill], [data-id*="form_name"]'
        );
        if (input) {
          const val = input.value || input.getAttribute('data-prefill') || input.placeholder;
          if (val && val.trim()) {
            setFormName(val.trim());
          }
        }
      };

      extractFormName();

      // Form markup is injected dynamically by the SDK's client-side loadForm()
      const observer = new MutationObserver(() => {
        extractFormName();
      });

      observer.observe(containerRef.current, { childList: true, subtree: true });
      return () => observer.disconnect();
    }, [isEditing]);

    return (
      <div ref={containerRef} className="w-full relative">
        {/* ── AUTHOR BANNER: Only shown in Page Builder / Experience Editor ── */}
        {isEditing && (
          <div className="mb-4 p-3.5 bg-blue-50 border-l-4 border-blue-500 rounded-r shadow-sm flex items-center justify-between text-sm text-blue-900 font-sans pointer-events-none select-none">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>
                <span className="font-bold">Attached Form: </span>
                <span className="text-blue-700 font-semibold">{formName || 'Detecting form...'}</span>
              </span>
            </div>
            {props?.params?.FormId && (
              <span className="text-xs text-blue-500 font-mono">ID: {props.params.FormId}</span>
            )}
          </div>
        )}

        {/* ── Built-in Sitecore SDK Form ── */}
        {BuiltInForm && <BuiltInForm {...props} />}
      </div>
    );
  };
};
