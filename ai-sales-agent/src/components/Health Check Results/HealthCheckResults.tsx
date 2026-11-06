'use client';

import { JSX, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Placeholder,
  Text,
  RichText,
  Field,
  LinkField,
  useSitecore,
} from '@sitecore-content-sdk/nextjs';
import {
  HealthCheckResultsProps,
  HygieneTier,
  TierFields,
  ZoneResult,
  ConsultationModalProps,
} from './HealthCheckResults.props';
import { normalizeHref } from 'lib/useLinkNormalizer';
import { generateHygieneReport } from 'lib/generateHygieneReport';

// ─── Shared field normalization helpers ───────────────────────────────────────

const normalizeSitecoreField = (field: any): any => {
  if (field === null || field === undefined) return field;
  if (typeof field === 'string') return { value: field };
  if (typeof field === 'number') return { value: field };
  if (typeof field !== 'object') return field;

  if (field.jsonValue !== undefined) {
    const inner =
      typeof field.jsonValue === 'object' && field.jsonValue !== null
        ? { ...field.jsonValue }
        : { value: field.jsonValue };
    return {
      ...inner,
      metadata: field.metadata ?? inner.metadata,
      editable: field.editable ?? inner.editable,
    };
  }
  return field;
};

const mapSitecoreFields = (fieldsArray: any[]): Record<string, any> => {
  if (!Array.isArray(fieldsArray)) return {};
  return fieldsArray.reduce(
    (acc, f) => {
      acc[f.name] = normalizeSitecoreField(f);
      return acc;
    },
    {} as Record<string, any>
  );
};

const resolveField = (obj: any, ...keys: string[]): any => {
  if (!obj) return undefined;
  for (const key of keys) {
    if (obj[key] !== undefined) return normalizeSitecoreField(obj[key]);
  }
  const objKeys = Object.keys(obj);
  for (const key of keys) {
    const normalizedKey = key.toLowerCase().replace(/[\s_-]/g, '');
    const matched = objKeys.find(
      (k) => k.toLowerCase().replace(/[\s_-]/g, '') === normalizedKey
    );
    if (matched && obj[matched] !== undefined) {
      return normalizeSitecoreField(obj[matched]);
    }
  }
  return undefined;
};

const getStringValue = (field: any): string => {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (typeof field === 'number') return String(field);
  if (field.value !== undefined) return String(field.value ?? '');
  if (field.jsonValue?.value !== undefined) return String(field.jsonValue.value ?? '');
  return '';
};

const getNumberValue = (field: any): number => {
  if (field === null || field === undefined) return 0;
  if (typeof field === 'number') return field;
  if (typeof field === 'string') return parseFloat(field) || 0;
  const raw = field?.value ?? field?.jsonValue?.value;
  if (raw !== undefined) return parseFloat(String(raw)) || 0;
  return 0;
};

const normalizeTierFields = (tier: any): TierFields => {
  if (!tier) return {};
  const raw = tier.fields;
  if (!raw) return {};
  if (Array.isArray(raw)) return mapSitecoreFields(raw);
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(raw)) {
    result[k] = normalizeSitecoreField(v);
  }
  return result as TierFields;
};

const computeZoneResults = (
  answers?: Record<string, any>,
  zoneMaxMap?: Record<string, number>
): ZoneResult[] => {
  if (!answers && !zoneMaxMap) return [];

  const zonesOrder: string[] = [];
  const zoneEarned: Record<string, number> = {};
  const zoneMax: Record<string, number> = { ...(zoneMaxMap || {}) };

  if (zoneMaxMap) {
    Object.keys(zoneMaxMap).forEach((zName) => {
      const trimmed = zName.trim();
      if (trimmed && !zonesOrder.includes(trimmed)) {
        zonesOrder.push(trimmed);
      }
    });
  }

  if (answers && typeof answers === 'object') {
    Object.values(answers).forEach((ans: any) => {
      const label = String(ans.zoneLabel || ans.zoneKey || '').trim();
      if (!label) return;
      if (!zonesOrder.includes(label)) {
        zonesOrder.push(label);
      }
      const pts = typeof ans.points === 'number' ? ans.points : parseFloat(ans.points) || 0;
      zoneEarned[label] = (zoneEarned[label] || 0) + pts;
    });
  }

  return zonesOrder.map((name) => {
    const earned = zoneEarned[name] || 0;
    const max = Math.max(zoneMax[name] || 10, earned);
    const percentage = max > 0 ? Math.min(100, Math.round((earned / max) * 100)) : 0;
    return {
      name,
      earned,
      max,
      percentage,
    };
  });
};

const resolvePlaceholderName = (rendering: any, dynamicPlaceholderId: string): string => {
  if (!rendering) return `HealthcheckForm-container-${dynamicPlaceholderId}`;
  const rawPlaceholders = rendering.placeholders || {};
  const existingKeys = Object.keys(rawPlaceholders);

  const populatedKey = existingKeys.find(
    (k) => Array.isArray(rawPlaceholders[k]) && rawPlaceholders[k].length > 0
  );
  if (populatedKey) {
    if (populatedKey.includes('{*}')) {
      return populatedKey.replace('{*}', dynamicPlaceholderId);
    }
    return populatedKey;
  }

  const matched = existingKeys.find(
    (k) =>
      k.toLowerCase().includes('healthcheckform') ||
      k.toLowerCase().includes('healthcheck') ||
      k.toLowerCase().includes('form')
  );
  if (matched) {
    if (matched.includes('{*}')) {
      return matched.replace('{*}', dynamicPlaceholderId);
    }
    return matched;
  }

  return `HealthcheckForm-container-${dynamicPlaceholderId}`;
};

// ─── Helpers for Lead Extraction & Persistence ───────────────────────────────────

const extractFormDataFromElement = (form: HTMLFormElement | null) => {
  if (!form) return {};
  try {
    const getValue = (...fieldNames: string[]): string => {
      for (const name of fieldNames) {
        const elements = Array.from(
          form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
            `input, textarea, select`
          )
        );
        for (const el of elements) {
          if (el.name === 'form_name' || el.id === 'form_name') continue;
          const attrName = (el.name || '').toLowerCase();
          const attrId = (el.id || '').toLowerCase();
          const target = name.toLowerCase();
          if (
            attrName === target ||
            attrId === target ||
            attrName.endsWith(`_${target}`) ||
            attrId.endsWith(`_${target}`) ||
            attrName.includes(target)
          ) {
            if (el.value && el.value.trim().length > 0) return el.value.trim();
          }
        }
      }
      return '';
    };

    const getCustomerValue = (): string => {
      const elements = Array.from(
        form.querySelectorAll<HTMLInputElement>(
          'input[name*="customer" i], input[id*="customer" i]'
        )
      );
      for (const el of elements) {
        if (el.type === 'checkbox' || el.type === 'radio') {
          if (el.checked) return el.value || 'true';
        } else if (el.value && el.value.trim().length > 0) {
          return el.value.trim();
        }
      }
      return '';
    };

    const fullName = getValue('full_name', 'fullname', 'name');
    const email = getValue('email');
    const zipcode = getValue('zipcode', 'zip');
    const city = getValue('city');
    const phone = getValue('phone');
    const company = getValue('company');
    const isCustomer = getCustomerValue();

    return {
      firstName: fullName,
      fullName: fullName,
      full_name: fullName,
      email,
      zip: zipcode,
      zipcode: zipcode,
      city,
      phone,
      company,
      consent: false,
      is_customer: isCustomer,
    };
  } catch (err) {
    console.warn('Error extracting form data in HealthCheckResults:', err);
    return {};
  }
};

const hasGateFormDetails = (form: HTMLFormElement | null): boolean => {
  if (!form) return false;

  // 1. Check required visible inputs only (ignore hidden system fields)
  const requiredInputs = Array.from(
    form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      'input[required], select[required], textarea[required]'
    )
  ).filter((el) => el.type !== 'hidden' && el.offsetParent !== null);

  for (const input of requiredInputs) {
    if (typeof input.checkValidity === 'function' && !input.checkValidity()) {
      if (typeof input.reportValidity === 'function') {
        input.reportValidity();
      }
      return false;
    }
  }

  // 2. Validate that key contact fields for Salesforce Lead generation are filled
  const data = extractFormDataFromElement(form);
  const hasValidContact = Boolean(
    (data.email && data.email.trim().length > 0 && data.email.includes('@')) ||
    (data.phone && data.phone.trim().length >= 6) ||
    (data.firstName && data.firstName.trim().length > 0)
  );

  if (!hasValidContact) {
    const firstInput = form.querySelector<HTMLInputElement>(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"])'
    );
    if (firstInput) {
      firstInput.focus();
      if (typeof (firstInput as any).reportValidity === 'function') {
        (firstInput as any).reportValidity();
      }
    }
    return false;
  }

  return true;
};

// ─── Embedded Consultation Modal Component ──────────────────────────────────────

const HealthCheckConsultationModal = ({ isOpen, onOpenChange, fields }: ConsultationModalProps) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'phone' | 'email'>('phone');
  const [phoneValue, setPhoneValue] = useState('');
  const [emailValue, setEmailValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onOpenChange]);

  // Pre-fill contact data from the unlock form submission saved in session formData
  useEffect(() => {
    if (isOpen) {
      try {
        const hcRaw = sessionStorage.getItem('hygiene-check');
        const hcData = hcRaw ? JSON.parse(hcRaw) : {};

        const storedPhone = hcData.formData?.phone || hcData.phone || '';
        const storedEmail = hcData.formData?.email || hcData.email || '';

        if (storedPhone) setPhoneValue(storedPhone);
        if (storedEmail) setEmailValue(storedEmail);
      } catch (e) {
        console.error('Could not parse session data for modal prefill', e);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const currentContact = activeTab === 'phone' ? phoneValue : emailValue;
    const payload = {
      subject: 'HS Appointment requested',
      priority: 'High',
      preferredContactMethod: activeTab,
      contactValue: currentContact,
      phone: phoneValue,
      email: emailValue,
      sessionId: sessionStorage.getItem('hygiene-check-session-id') || 'local-session-fallback',
    };

    try {
      // Submit consultation request via internal API route (bypasses browser CORS and adblocker issues)
      await fetch('/api/consultation', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      }).catch((fetchErr) => {
        console.warn('Consultation submission request caught:', fetchErr);
      });
    } catch (error) {
      console.warn('Error submitting consultation request:', error);
    } finally {
      // Mark consultation completed and update contact details in session
      try {
        const raw = sessionStorage.getItem('hygiene-check');
        const session = raw ? JSON.parse(raw) : {};
        session.consultationCompleted = true;
        session.formData = {
          ...(session.formData || {}),
          ...(phoneValue ? { phone: phoneValue } : {}),
          ...(emailValue ? { email: emailValue } : {}),
        };
        if (emailValue) session.email = emailValue;
        if (phoneValue) session.phone = phoneValue;
        sessionStorage.setItem('hygiene-check', JSON.stringify(session));
      } catch {
        // Ignore storage errors
      }

      // Route dynamically to success page using replace so Results page is removed from history
      const rawTarget =
        (fields.SuccessRoute as any)?.value?.href ||
        (fields.SuccessRoute as any)?.href ||
        '';
      const currentLocale = router.locale || 'en';
      const targetUrl = rawTarget ? normalizeHref(rawTarget, currentLocale) || rawTarget : '';

      setIsSubmitting(false);
      onOpenChange(false);
      if (targetUrl) {
        void router.replace(targetUrl);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div className="relative w-full max-w-sm p-6 bg-white rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-xl font-extrabold text-gray-900">
            <Text field={fields.ModalTitle as Field<string>} />
          </h3>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="p-1 text-gray-400 transition-colors rounded-full hover:text-gray-600 hover:bg-gray-100"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        <div className="mb-6 text-sm text-gray-500">
          <Text field={fields.ModalDescription as Field<string>} />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex p-1 mb-6 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('phone')}
              className={`flex items-center justify-center flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'phone' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              <Text field={fields.PhoneTabLabel as Field<string>} />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('email')}
              className={`flex items-center justify-center flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'email' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              <Text field={fields.EmailTabLabel as Field<string>} />
            </button>
          </div>

          <div className="mb-6">
            <label className="block mb-2 text-xs font-bold text-gray-700">
              {activeTab === 'phone' ? (
                <Text field={fields.PhoneTabLabel as Field<string>} />
              ) : (
                <Text field={fields.EmailTabLabel as Field<string>} />
              )}
            </label>
            <input
              required
              type={activeTab === 'phone' ? 'tel' : 'email'}
              value={activeTab === 'phone' ? phoneValue : emailValue}
              onChange={(e) => {
                if (activeTab === 'phone') {
                  setPhoneValue(e.target.value);
                } else {
                  setEmailValue(e.target.value);
                }
              }}
              className="w-full p-3 transition-all border border-gray-200 outline-none rounded-xl focus:ring-2 focus:ring-[#e2001a] focus:border-[#e2001a]"
            />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="flex items-center justify-center w-full py-4 font-bold text-white transition-colors bg-[#e2001a] rounded-xl hover:bg-red-700 disabled:opacity-70"
          >
            <Text field={fields.ModalSubmitLabel as Field<string>} />
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </form>
      </div>
    </div>
  );
};


// ─── Main Component ────────────────────────────────────────────────────────────

const HealthCheckResults = (props: HealthCheckResultsProps): JSX.Element => {
  const router = useRouter();
  const { rendering, fields, params } = props;
  const { page } = useSitecore();
  const isEditing = Boolean(page?.mode?.isEditing);

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);
  const [rawScore, setRawScore] = useState(0);
  const [zoneResults, setZoneResults] = useState<ZoneResult[]>(computeZoneResults(undefined));
  
  // State for controlling the Consultation Modal & PDF Download
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const loadSessionData = () => {
      try {
        const rawSession =
          typeof window !== 'undefined' ? sessionStorage.getItem('hygiene-check') : null;
        const hasTimestamp =
          typeof window !== 'undefined' &&
          window.location.search.includes('timestamp=');

        if (!rawSession && !hasTimestamp) {
          setRawScore(0);
          setDisplayScore(0);
          setZoneResults([]);
          setIsUnlocked(false);
          return;
        }

        const sessionData = rawSession ? JSON.parse(rawSession) : {};

        // If consultation form has already been submitted, prevent returning to results
        if (sessionData.consultationCompleted === true && !isEditing) {
          const successRaw =
            (fields.SuccessRoute as any)?.value?.href ||
            (fields.SuccessRoute as any)?.href ||
            '';
          const currentLocale = router.locale || 'en';
          const successUrl = successRaw ? normalizeHref(successRaw, currentLocale) || successRaw : '';
          if (successUrl) {
            void router.replace(successUrl);
            return;
          }
        }

        const score =
          typeof sessionData.score?.total === 'number'
            ? sessionData.score.total
            : typeof sessionData.total === 'number'
              ? sessionData.total
              : typeof sessionData.rawScore === 'number'
                ? sessionData.rawScore
                : 0;

        const maxScore =
          typeof sessionData.maxScore === 'number' && sessionData.maxScore > 0
            ? sessionData.maxScore
            : 70;
        setRawScore(score);

        const computedDisplay =
          typeof sessionData.displayScore === 'number'
            ? sessionData.displayScore
            : Math.min(100, Math.round((score / maxScore) * 100));

        setDisplayScore(computedDisplay);

        const shouldUnlock = sessionData.resultsUnlocked === true || hasTimestamp;
        setIsUnlocked(shouldUnlock);

        if (hasTimestamp && !sessionData.resultsUnlocked) {
          sessionData.resultsUnlocked = true;
          sessionStorage.setItem('hygiene-check', JSON.stringify(sessionData));
        }

        const answersMap =
          sessionData.detailedAnswers ||
          (typeof sessionData.answers === 'object' && !Array.isArray(sessionData.answers)
            ? sessionData.answers
            : null);

        if (answersMap) {
          setZoneResults(computeZoneResults(answersMap, sessionData.zoneMaxMap));
        } else if (sessionData.score?.zoneScores) {
          const zScores: Record<string, number> = sessionData.score.zoneScores;
          const formattedZones: ZoneResult[] = Object.entries(zScores).map(([key, val]) => {
            const earned = Number(val) || 0;
            const max = Math.max(20, earned);
            const titleName = key
              .replace(/([A-Z])/g, ' $1')
              .replace(/^./, (s) => s.toUpperCase())
              .trim();
            return {
              name: titleName,
              earned,
              max,
              percentage: Math.min(100, Math.round((earned / max) * 100)),
            };
          });
          setZoneResults(formattedZones);
        }
      } catch (err) {
        console.warn('Failed to parse health check session data:', err);
      }
    };

    loadSessionData();

    window.addEventListener('storage', loadSessionData);
    window.addEventListener('hygiene-check-unlocked', loadSessionData);
    window.addEventListener('healthcheck-unlocked', loadSessionData);

    return () => {
      window.removeEventListener('storage', loadSessionData);
      window.removeEventListener('hygiene-check-unlocked', loadSessionData);
      window.removeEventListener('healthcheck-unlocked', loadSessionData);
    };
  }, [isEditing]);

  const handleFormSubmit = (e?: React.FormEvent<HTMLDivElement> | React.MouseEvent) => {
    try {
      const target = (e?.target || e?.currentTarget) as HTMLElement | undefined;
      const form =
        (target?.closest('form') as HTMLFormElement | null) ||
        (target?.querySelector('form') as HTMLFormElement | null) ||
        (document.querySelector('form.health-check-ui-form') as HTMLFormElement | null) ||
        (document.querySelector('form') as HTMLFormElement | null);

      if (!form) return;

      const rawSession = sessionStorage.getItem('hygiene-check');
      const sessionData = rawSession ? JSON.parse(rawSession) : {};

      const scoreVal = String(sessionData.rawScore ?? rawScore ?? displayScore ?? 0);
      const scoreInput = form.querySelector<HTMLInputElement>(
        'input[name*="score" i], input[id*="score" i], input[data-id*="score" i], input[placeholder*="score" i], input[name*="points" i]'
      );
      if (scoreInput) {
        scoreInput.value = scoreVal;
        scoreInput.setAttribute('value', scoreVal);
        scoreInput.dispatchEvent(new Event('input', { bubbles: true }));
        scoreInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const payloadInput = form.querySelector<HTMLInputElement>(
        'input[name*="payload" i], input[name*="answers" i], input[id*="payload" i]'
      );
      if (payloadInput && sessionData.answers) {
        payloadInput.value = JSON.stringify(sessionData.answers);
        payloadInput.setAttribute('value', JSON.stringify(sessionData.answers));
      }

      // Prevent accidental submission when form has no details
      if (!hasGateFormDetails(form)) {
        if (e && 'preventDefault' in e && typeof (e as any).preventDefault === 'function') {
          (e as any).preventDefault();
        }
        if (e && 'stopPropagation' in e && typeof (e as any).stopPropagation === 'function') {
          (e as any).stopPropagation();
        }
        return;
      }

      // Extract form details from form inputs strictly on submission
      const extracted = extractFormDataFromElement(form);

      const currentRaw = sessionStorage.getItem('hygiene-check');
      const latestSession = currentRaw ? JSON.parse(currentRaw) : sessionData;

      const updatedSession = {
        ...latestSession,
        formData: {
          ...(latestSession.formData || {}),
          ...extracted,
        },
        resultsUnlocked: true,
      };
      if (extracted.email) updatedSession.email = extracted.email;
      if (extracted.phone) updatedSession.phone = extracted.phone;

      sessionStorage.setItem('hygiene-check', JSON.stringify(updatedSession));

      setIsUnlocked(true);
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('hygiene-check-unlocked'));
    } catch (err) {
      console.warn('Error handling form submit capture:', err);
    }
  };

  const rawProps = fields as any;
  const datasource = rawProps?.data?.datasource;

  let rootFields: any = {};
  if (datasource) {
    rootFields = Array.isArray(datasource.fields)
      ? mapSitecoreFields(datasource.fields)
      : datasource.fields || datasource;
  } else {
    rootFields = Array.isArray(rawProps) ? mapSitecoreFields(rawProps) : rawProps || {};
  }

  // Dashboard Fields
  const scoreLabelField = resolveField(rootFields, 'ScoreLabel', 'Score Label');
  const zoneBreakdownLabelField = resolveField(rootFields, 'ZoneBreakdownLabel', 'Zone Breakdown Label');
  const discussCtaLabelField = resolveField(rootFields, 'DiscussCtaLabel', 'Discuss CTA Label');
  const downloadCtaLabelField = resolveField(rootFields, 'DownloadCtaLabel', 'Download CTA Label');

  // Modal Fields (Approach 1: Pulled from the same datasource item)
  const modalTitleField = resolveField(rootFields, 'ModalTitle', 'Modal Title');
  const modalDescriptionField = resolveField(rootFields, 'ModalDescription', 'Modal Description');
  const phoneTabLabelField = resolveField(rootFields, 'PhoneTabLabel', 'Phone Tab Label');
  const emailTabLabelField = resolveField(rootFields, 'EmailTabLabel', 'Email Tab Label');
  const modalSubmitLabelField = resolveField(rootFields, 'ModalSubmitLabel', 'Modal Submit Label');
  const successRouteField = resolveField(rootFields, 'SuccessRoute', 'Success Route');

  const rawTiers =
    resolveField(rootFields, 'Tiers', 'tiers') ||
    (datasource as any)?.Tiers?.targetItems ||
    (datasource as any)?.tiers?.targetItems;

  const tiersList: HygieneTier[] = Array.isArray(rawTiers)
    ? rawTiers
    : Array.isArray(rawTiers?.targetItems)
      ? rawTiers.targetItems
      : [];

  const normalizedTiers = tiersList.map((tier) => ({
    ...tier,
    fields: normalizeTierFields(tier),
  }));

  const allMaxScores = normalizedTiers
    .map((t) => getNumberValue(resolveField(t.fields, 'MaxScore', 'Max Score')))
    .filter((n) => n > 0);

  const highestTierMax = allMaxScores.length > 0 ? Math.max(...allMaxScores) : 70;
  const tierScale = highestTierMax <= 75 ? 70 : 100;

  const tierIndexFromSession =
    typeof window !== 'undefined'
      ? (() => {
          try {
            const raw = sessionStorage.getItem('hygiene-check');
            if (raw) return JSON.parse(raw).tier;
          } catch {
            // Ignore
          }
          return null;
        })()
      : null;

  const currentTier =
    normalizedTiers.find((tier) => {
      const min = getNumberValue(resolveField(tier.fields, 'MinScore', 'Min Score'));
      const max = getNumberValue(resolveField(tier.fields, 'MaxScore', 'Max Score'));

      // If author entered points based on 0-70 scale (e.g. 0-34, 35-55, 56-70)
      if (highestTierMax <= 70) {
        return rawScore >= min && rawScore <= max;
      }

      const minPct = (min / tierScale) * 100;
      const maxPct = max >= highestTierMax ? 100 : (max / tierScale) * 100;

      return displayScore >= Math.floor(minPct) && displayScore <= Math.ceil(maxPct);
    }) ||
    (typeof tierIndexFromSession === 'number' &&
    tierIndexFromSession >= 1 &&
    tierIndexFromSession <= normalizedTiers.length
      ? normalizedTiers[tierIndexFromSession - 1]
      : null);

  const tFields: TierFields = currentTier?.fields || {};

  const defaultGaugeColor =
    rawScore >= 56 || displayScore >= 80
      ? '#10b981' // Green (Tier 3: Hygiene Leader)
      : rawScore >= 35 || displayScore >= 50
        ? '#f59e0b' // Yellow/Amber (Tier 2: Hygiene Aware)
        : '#e2001a'; // Red (Tier 1: Hygiene Opportunity)

  const getZoneColor = (pct: number): string => {
    if (pct >= 80) return '#10b981'; // Green
    if (pct >= 50) return '#f59e0b'; // Orange
    return '#e2001a'; // Red
  };

  const gaugeColor =
    getStringValue(resolveField(tFields, 'GaugeColor', 'Gauge Color')) || defaultGaugeColor;
  const badgeLabelField = resolveField(tFields, 'BadgeLabel', 'Badge Label');
  const summaryTextField = resolveField(tFields, 'SummaryText', 'Summary Text');

  const handleDownloadReport = async () => {
    setIsDownloading(true);
    try {
      const badgeStr = getStringValue(badgeLabelField) || '';
      const summaryHeadlineStr =
        getStringValue(resolveField(tFields, 'SummaryHeadline', 'Summary Headline', 'Headline')) || '';
      const summaryTextStr = getStringValue(summaryTextField) || '';

      const reportTitle =
        getStringValue(
          resolveField(rootFields, 'ReportTitle', 'Report Title', 'Title', 'title')
        ) || '';
      const reportSubtitle =
        getStringValue(
          resolveField(
            rootFields,
            'ReportSubtitle',
            'Report Subtitle',
            'Subtitle',
            'subtitle',
            'Description',
            'description'
          )
        ) || '';
      const scoreLabelStr = getStringValue(scoreLabelField) || '';
      const zoneBreakdownLabelStr = getStringValue(zoneBreakdownLabelField) || '';

      let headerLogoImg = '';
      try {
        const headerImg = (
          document.querySelector('header a img') ||
          document.querySelector('header img')
        ) as HTMLImageElement | null;

        if (headerImg && headerImg.src && !headerImg.src.toLowerCase().includes('social-links')) {
          headerLogoImg = headerImg.src;
          try {
            sessionStorage.setItem('hygiene-brand-logo', headerImg.src);
          } catch {
            // Ignore storage errors
          }
        }
      } catch {
        // Ignore DOM error
      }

      if (!headerLogoImg) {
        const stored = typeof window !== 'undefined' ? sessionStorage.getItem('hygiene-brand-logo') : null;
        if (stored && !stored.toLowerCase().includes('social-links') && !stored.toLowerCase().includes('linkdin')) {
          headerLogoImg = stored;
        }
      }

      await generateHygieneReport(badgeStr, gaugeColor, {
        reportTitle,
        reportSubtitle,
        scoreLabel: scoreLabelStr,
        zoneBreakdownLabel: zoneBreakdownLabelStr,
        summaryHeadline: summaryHeadlineStr,
        summaryText: summaryTextStr,
        zoneResults,
        headerLogoUrl: headerLogoImg,
      });
    } catch (error) {
      console.error('Failed to generate PDF report:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const blurClass =
    !isUnlocked && !isEditing
      ? 'blur-md opacity-40 select-none pointer-events-none transition-all duration-500'
      : 'transition-all duration-500';

  const dynamicPlaceholderId = String(
    params?.DynamicPlaceholderId ||
    rendering?.params?.DynamicPlaceholderId ||
    '1'
  );

  const rawPlaceholders = rendering?.placeholders || {};
  const placeholderKey = resolvePlaceholderName(rendering, dynamicPlaceholderId);

  const safeRendering = {
    ...rendering,
    placeholders: {
      ...rawPlaceholders,
    },
  };

  const wildcardKey = 'HealthcheckForm-container-{*}';
  const indexedKey = `HealthcheckForm-container-${dynamicPlaceholderId}`;

  if (rawPlaceholders[wildcardKey] && !safeRendering.placeholders[indexedKey]) {
    safeRendering.placeholders[indexedKey] = rawPlaceholders[wildcardKey];
  }
  if (rawPlaceholders[indexedKey] && !safeRendering.placeholders[wildcardKey]) {
    safeRendering.placeholders[wildcardKey] = rawPlaceholders[indexedKey];
  }

  if (!safeRendering.placeholders[placeholderKey]) {
    safeRendering.placeholders[placeholderKey] = [];
  }
  if (!safeRendering.placeholders[indexedKey]) {
    safeRendering.placeholders[indexedKey] = [];
  }
  if (!safeRendering.placeholders[wildcardKey]) {
    safeRendering.placeholders[wildcardKey] = [];
  }

  return (
    <div className="flex flex-col items-center w-full min-h-screen p-4 bg-gray-50 md:p-8">
      <div className="relative w-full max-w-4xl overflow-hidden bg-white border border-gray-200 shadow-sm rounded-2xl">
        <div className="flex flex-col border-b border-gray-100 md:flex-row">
          <div className="flex flex-col items-center justify-center p-8 border-b border-gray-100 md:w-1/2 md:border-b-0 md:border-r">
            <div className="relative flex items-center justify-center w-48 h-48">
              <svg viewBox="0 0 100 50" className="absolute top-0 w-full h-full overflow-visible">
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#e5e7eb" strokeWidth="8" strokeLinecap="round" />
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke={gaugeColor} strokeWidth="8" strokeLinecap="round" strokeDasharray="125.6" strokeDashoffset={125.6 - 125.6 * (displayScore / 100)} className="transition-all duration-1000 ease-out" />
              </svg>
              <div className={`mt-12 text-6xl font-extrabold text-gray-900 ${blurClass}`}>
                {displayScore}
              </div>
            </div>
            <div className="mt-4 text-sm font-medium text-gray-500">
              <Text field={scoreLabelField as Field<string>} />
            </div>
          </div>

          <div className="p-8 md:w-1/2">
            <h4 className="mb-6 text-sm font-bold text-gray-700">
              <Text field={zoneBreakdownLabelField as Field<string>} />
            </h4>
            <div className="flex flex-col space-y-4">
              {zoneResults.map((zone, index) => {
                const zoneColor = getZoneColor(zone.percentage);
                const displayWidth = zone.percentage === 0 ? 15 : zone.percentage;
                return (
                  <div key={zone.name} className={`flex items-center justify-between gap-4 ${!isUnlocked && !isEditing && index > 0 ? blurClass : ''}`}>
                    <span className="w-1/3 text-sm font-bold text-gray-900 truncate">{zone.name}</span>
                    <div className="w-2/3 h-2 overflow-hidden bg-gray-100 rounded-full">
                      <div
                        className="h-full transition-all duration-1000 ease-out rounded-full"
                        style={{ width: `${displayWidth}%`, backgroundColor: zoneColor }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="relative p-8">
          <h3 className="text-2xl font-extrabold text-gray-900">
            <Text field={badgeLabelField as Field<string>} />
          </h3>
          <div className={`mt-4 text-gray-600 prose max-w-none leading-relaxed [&_p]:m-0 [&_p]:inline [&_.ck-content]:inline ${blurClass}`}>
            <RichText field={summaryTextField as Field<string>} />
          </div>
          {!isUnlocked && !isEditing && (
            <div className="absolute inset-0 z-10 pointer-events-none bg-linear-to-t from-white via-white/80 to-transparent" aria-hidden="true" />
          )}
        </div>
      </div>

      {!isUnlocked ? (
        <div
          className="w-full max-w-[620px] mt-8 flex flex-col items-center"
          onSubmitCapture={(e) => {
            const form = (e.target as HTMLElement)?.closest('form');
            if (form && !hasGateFormDetails(form)) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            handleFormSubmit(e);
          }}
          onClickCapture={(e) => {
            const btn = (e.target as HTMLElement)?.closest(
              'button[type="submit"], input[type="submit"], .submit-button'
            );
            if (btn) {
              const form = btn.closest('form');
              if (form) {
                if (!hasGateFormDetails(form)) {
                  e.preventDefault();
                  e.stopPropagation();
                  return;
                }
                // When form has valid details and submit button is clicked, unlock immediately
                handleFormSubmit(e);
              }
            }
          }}
        >
          <Placeholder name={placeholderKey} rendering={safeRendering} />
        </div>
      ) : (
        <div className="flex flex-col items-center w-full max-w-lg mt-8 space-y-4">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full py-4 font-bold text-white transition-colors bg-[#e2001a] rounded-full hover:bg-red-700 shadow-md shadow-red-500/20"
          >
            <Text field={discussCtaLabelField as Field<string>} />
          </button>
          <button 
            onClick={handleDownloadReport}
            disabled={isDownloading}
            className="flex items-center justify-center w-full gap-2 py-4 font-bold text-gray-900 transition-colors bg-white border border-gray-900 rounded-full shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {isDownloading ? (
              <span>Generating PDF...</span>
            ) : (
              <>
                {downloadCtaLabelField ? (
                  <Text field={downloadCtaLabelField as Field<string>} />
                ) : (
                  <span>Download your Hygiene PDF Report</span>
                )}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              </>
            )}
          </button>
        </div>
      )}

      {/* Render Modal */}
      <HealthCheckConsultationModal 
        isOpen={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        fields={{
          ModalTitle: modalTitleField as Field<string>,
          ModalDescription: modalDescriptionField as Field<string>,
          PhoneTabLabel: phoneTabLabelField as Field<string>,
          EmailTabLabel: emailTabLabelField as Field<string>,
          ModalSubmitLabel: modalSubmitLabelField as Field<string>,
          SuccessRoute: successRouteField as LinkField,
        }}
      />
    </div>
  );
};

export const Default: React.FC<HealthCheckResultsProps> = HealthCheckResults;
export default HealthCheckResults;
export { HealthCheckResults };