'use client';

import { useEffect, useRef, useState } from 'react';
import { useSitecore } from '@sitecore-content-sdk/nextjs';

/**
 * Wraps the built-in Sitecore SDK Form component.
 * 1. Automatically extracts the hidden form_name field from the form markup
 *    and displays an Author Banner at the top ONLY in Page Builder / Experience Editor.
 * 2. Automatically detects the hidden "health_check_ui" field and applies the
 *    custom Health Check Gate Form UI, 2-column layout, pink CTA, and score injection.
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
      if (!containerRef.current) return;

      let isProcessing = false;

      const processForm = () => {
        if (isProcessing) return;
        isProcessing = true;

        try {
          const root = containerRef.current;
          if (!root) return;

          // ── 0. Hide completely if results are already unlocked ──
          try {
            const raw = typeof window !== 'undefined' ? sessionStorage.getItem('hygiene-check') : null;
            if (raw && JSON.parse(raw).resultsUnlocked === true && !isEditing) {
              root.style.setProperty('display', 'none', 'important');
              return;
            }
          } catch (e) {
            console.warn('Could not read session unlock state:', e);
          }

          // ── 1. Author Banner Extraction (Editing mode only) ──
          if (isEditing) {
            const nameInput = root.querySelector<HTMLInputElement>(
              'input[name="form_name"], input[name*="form_name"], input[data-prefill], [data-id*="form_name"]'
            );
            if (nameInput) {
              const val = nameInput.value || nameInput.getAttribute('data-prefill') || nameInput.placeholder;
              if (val && val.trim() && val.trim() !== formName) {
                setFormName(val.trim());
              }
            }
          }

          // ── 2. Health Check UI Trigger Detection ──
          const healthCheckTrigger = root.querySelector(
            'input[name*="health_check_ui"], input[value*="health_check_ui"], input[id*="health_check_ui"], [data-id*="health_check_ui"], [data-prefill*="health_check_ui"], input[placeholder*="health_check_ui"]'
          );

          if (!healthCheckTrigger) return;

          const form = root.querySelector('form');
          if (!form) return;

          // If already fully transformed, don't repeat DOM manipulations
          if (form.getAttribute('data-hc-styled') === 'true') {
            return;
          }

          // Apply health-check classes
          if (!form.classList.contains('health-check-ui-form')) {
            form.classList.add('health-check-ui-form');
          }
          if (!root.classList.contains('health-check-ui-container')) {
            root.classList.add('health-check-ui-container');
          }

          // Hide trigger field and its parent row wrapper completely
          const triggerWrapper = healthCheckTrigger.closest('.landing-page-row, .shared-input-field, .component') as HTMLElement;
          if (triggerWrapper) {
            triggerWrapper.style.setProperty('display', 'none', 'important');
          }

          const formPage = (form.querySelector('.form-page') || form) as HTMLElement;

          // Find or create .hc-inner-card (the white floating card)
          let innerCard = formPage.querySelector('.hc-inner-card') as HTMLElement;
          if (!innerCard) {
            innerCard = document.createElement('div');
            innerCard.className = 'hc-inner-card';
            formPage.appendChild(innerCard);
          }

          // ── Helper to find top-level row container for an input matching keywords ──
          const findFieldRow = (matchers: string[]): HTMLElement | null => {
            const inputs = Array.from(
              form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
                'input, select, textarea'
              )
            );
            for (const input of inputs) {
              if (input.type === 'hidden' || input.type === 'submit') continue;
              const name = (input.name || '').toLowerCase();
              const id = (input.id || '').toLowerCase();
              const placeholder = (input.placeholder || '').toLowerCase();

              const parentContainer =
                input.closest('.shared-input-field, .form-field, [class*="field"], .landing-page-row') ||
                input.parentElement;
              const labelText =
                parentContainer
                  ?.querySelector('label, .global-input-label, .form-field-label')
                  ?.textContent?.toLowerCase() || '';

              const combined = `${name} ${id} ${placeholder} ${labelText}`;
              if (matchers.some((m) => combined.includes(m.toLowerCase()))) {
                let curr: HTMLElement = input;
                while (
                  curr.parentElement &&
                  curr.parentElement !== formPage &&
                  curr.parentElement !== form &&
                  !curr.parentElement.classList.contains('hc-inner-card')
                ) {
                  curr = curr.parentElement;
                }
                return curr;
              }
            }
            return null;
          };

          // ── Title & Subtitle Rows ──
          const textComponents = Array.from(
            form.querySelectorAll<HTMLElement>('.text-component, .global-text, p')
          );
          for (const tc of textComponents) {
            const txt = (tc.textContent || '').toLowerCase().trim();
            if (txt.includes('unlock') || (txt.includes('personal') && txt.includes('result'))) {
              let titleRow: HTMLElement = tc;
              while (
                titleRow.parentElement &&
                titleRow.parentElement !== formPage &&
                titleRow.parentElement !== form &&
                !titleRow.parentElement.classList.contains('hc-inner-card')
              ) {
                titleRow = titleRow.parentElement;
              }
              titleRow.classList.add('hc-title-row');
              if (formPage.contains(titleRow) && innerCard) {
                formPage.insertBefore(titleRow, innerCard);
              }
            } else if (
              txt.includes('recommendation') ||
              txt.includes('hygiene') ||
              txt.includes('instantly') ||
              txt.includes('details')
            ) {
              let subRow: HTMLElement = tc;
              while (
                subRow.parentElement &&
                subRow.parentElement !== formPage &&
                subRow.parentElement !== form &&
                !subRow.parentElement.classList.contains('hc-inner-card')
              ) {
                subRow = subRow.parentElement;
              }
              subRow.classList.add('hc-subtitle-row');
              if (formPage.contains(subRow) && innerCard) {
                formPage.insertBefore(subRow, innerCard);
              }
            }
          }

          // ── Collect and position field rows inside innerCard ──
          const nameRow = findFieldRow(['name', 'full_name', 'fullname', 'first name']);
          const emailRow = findFieldRow(['email', 'business email', 'bussiness email']);
          const zipRow = findFieldRow(['zip', 'zipcode', 'postal', 'dodvxy76', 'd02']);
          const cityRow = findFieldRow(['city', 'dublin']);
          const phoneRow = findFieldRow(['phone', 'tel', '84984984084', '+353']);
          const companyRow = findFieldRow(['company', '7kc', 'hospital', 'st. james']);

          if (nameRow && !innerCard.contains(nameRow)) {
            innerCard.appendChild(nameRow);
          }
          if (emailRow && !innerCard.contains(emailRow)) {
            innerCard.appendChild(emailRow);
          }

          // ── Pair Zipcode & City into a 2-column row ──
          if (zipRow && cityRow && zipRow !== cityRow) {
            let zipCityRow = innerCard.querySelector('.hc-zip-city-row') as HTMLElement;
            if (!zipCityRow) {
              zipCityRow = document.createElement('div');
              zipCityRow.className = 'hc-row-2col hc-zip-city-row';
              innerCard.appendChild(zipCityRow);
            }
            if (!zipCityRow.contains(zipRow)) zipCityRow.appendChild(zipRow);
            if (!zipCityRow.contains(cityRow)) zipCityRow.appendChild(cityRow);
          } else {
            if (zipRow && !innerCard.contains(zipRow)) innerCard.appendChild(zipRow);
            if (cityRow && !innerCard.contains(cityRow)) innerCard.appendChild(cityRow);
          }

          // ── Pair Phone & Company into a 2-column row ──
          if (phoneRow && companyRow && phoneRow !== companyRow) {
            let phoneCompRow = innerCard.querySelector('.hc-phone-comp-row') as HTMLElement;
            if (!phoneCompRow) {
              phoneCompRow = document.createElement('div');
              phoneCompRow.className = 'hc-row-2col hc-phone-comp-row';
              innerCard.appendChild(phoneCompRow);
            }
            if (!phoneCompRow.contains(phoneRow)) phoneCompRow.appendChild(phoneRow);
            if (!phoneCompRow.contains(companyRow)) phoneCompRow.appendChild(companyRow);
          } else {
            if (phoneRow && !innerCard.contains(phoneRow)) innerCard.appendChild(phoneRow);
            if (companyRow && !innerCard.contains(companyRow)) innerCard.appendChild(companyRow);
          }

          // ── Ensure other stray inputs are safely inside innerCard ──
          const allInputs = Array.from(
            form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
              'input, select, textarea'
            )
          );
          for (const inp of allInputs) {
            if (inp.type === 'hidden' || inp.type === 'submit' || inp.type === 'radio' || inp.type === 'checkbox') continue;
            let inpRow: HTMLElement = inp;
            while (
              inpRow.parentElement &&
              inpRow.parentElement !== formPage &&
              inpRow.parentElement !== form &&
              !inpRow.parentElement.classList.contains('hc-inner-card')
            ) {
              inpRow = inpRow.parentElement;
            }
            if (inpRow && !innerCard.contains(inpRow) && inpRow !== triggerWrapper) {
              innerCard.appendChild(inpRow);
            }
          }

          // ── Radio group (Customer check) ──
          const radioInputs = Array.from(form.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
          if (radioInputs.length > 0) {
            const firstRadio = radioInputs[0];
            let radioRow: HTMLElement = firstRadio;
            while (
              radioRow.parentElement &&
              radioRow.parentElement !== formPage &&
              radioRow.parentElement !== form &&
              !radioRow.parentElement.classList.contains('hc-inner-card')
            ) {
              radioRow = radioRow.parentElement;
            }
            if (radioRow && !innerCard.contains(radioRow)) {
              innerCard.appendChild(radioRow);
            }

            const radioContainer =
              firstRadio.closest('.radio-group-field, [class*="radio-group"], .form-input-wrapper-div') ||
              firstRadio.parentElement?.parentElement;
            if (radioContainer) {
              radioContainer.classList.add('hc-radio-group');
            }

            radioInputs.forEach((radio) => {
              const parentLabel = radio.closest('label');
              if (parentLabel && !parentLabel.classList.contains('hc-radio-card')) {
                parentLabel.classList.add('hc-radio-card');
              }
            });
          }

          // ── Checkbox (Consent / Privacy) ──
          const checkInput = form.querySelector<HTMLInputElement>('input[type="checkbox"]');
          if (checkInput) {
            let checkRow: HTMLElement = checkInput;
            while (
              checkRow.parentElement &&
              checkRow.parentElement !== formPage &&
              checkRow.parentElement !== form &&
              !checkRow.parentElement.classList.contains('hc-inner-card')
            ) {
              checkRow = checkRow.parentElement;
            }
            if (checkRow && !innerCard.contains(checkRow)) {
              innerCard.appendChild(checkRow);
            }
          }

          // ── Submit Button ──
          const submitBtn = form.querySelector<HTMLElement>(
            'button.submit-button, button[type="submit"], input[type="submit"]'
          );
          if (submitBtn) {
            let btnRow: HTMLElement = submitBtn;
            while (
              btnRow.parentElement &&
              btnRow.parentElement !== formPage &&
              btnRow.parentElement !== form &&
              !btnRow.parentElement.classList.contains('hc-inner-card')
            ) {
              btnRow = btnRow.parentElement;
            }
            if (btnRow && !innerCard.contains(btnRow)) {
              innerCard.appendChild(btnRow);
            }

            if (submitBtn.tagName === 'INPUT') {
              (submitBtn as HTMLInputElement).value = 'See your results';
            } else {
              submitBtn.textContent = 'See your results';
            }
          }

          // ── Add reCAPTCHA footer if not present inside innerCard ──
          if (!innerCard.querySelector('.hc-recaptcha-notice')) {
            const notice = document.createElement('div');
            notice.className = 'hc-recaptcha-notice';
            notice.innerHTML =
              'This site is protected by reCAPTCHA and the Google <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Privacy Policy</a> and <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer">Terms of Service</a> apply.';
            innerCard.appendChild(notice);
          }

          // ── Helper to retrieve field values safely by multiple name variants ──
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

          // ── Extract form input fields strictly on actual submission and persist to session.formData ──
          const extractAndSaveFormData = () => {
            try {
              const fullName = getValue('full_name', 'fullname', 'name');
              const email = getValue('email');
              const zipcode = getValue('zipcode', 'zip');
              const city = getValue('city');
              const phone = getValue('phone');
              const company = getValue('company');
              const isCustomer = getCustomerValue();

              const raw = sessionStorage.getItem('hygiene-check');
              const session = raw ? JSON.parse(raw) : {};
              session.formData = {
                firstName: fullName || session.formData?.firstName || '',
                fullName: fullName || session.formData?.fullName || '',
                full_name: fullName || session.formData?.full_name || '',
                email: email || session.formData?.email || '',
                zip: zipcode || session.formData?.zip || '',
                zipcode: zipcode || session.formData?.zipcode || '',
                city: city || session.formData?.city || '',
                phone: phone || session.formData?.phone || '',
                company: company || session.formData?.company || '',
                consent: false,
                is_customer: isCustomer || session.formData?.is_customer || '',
              };
              if (email) session.email = email;
              if (phone) session.phone = phone;
              sessionStorage.setItem('hygiene-check', JSON.stringify(session));
            } catch (err) {
              console.warn('Could not extract form data in FormWithAuthorHeader:', err);
            }
          };

          // ── Check whether any details have been entered in the form ──
          const hasEnteredDetails = (): boolean => {
            // Check HTML5 validity on visible inputs only (ignore hidden system fields)
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

            const fullName = getValue('full_name', 'fullname', 'name');
            const email = getValue('email');
            const phone = getValue('phone');

            const hasContact = Boolean(
              (email && email.trim().length > 0 && email.includes('@')) ||
              (phone && phone.trim().length >= 6) ||
              (fullName && fullName.trim().length > 0)
            );

            if (!hasContact) {
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

          // ── Inject score and quiz answers into hidden form fields ──
          const injectScoreAndPayload = () => {
            try {
              const raw = sessionStorage.getItem('hygiene-check');
              const session = raw ? JSON.parse(raw) : {};

              const scoreVal = String(session.rawScore ?? session.displayScore ?? 0);
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
              if (payloadInput && session.answers) {
                payloadInput.value = JSON.stringify(session.answers);
                payloadInput.setAttribute('value', JSON.stringify(session.answers));
              }
            } catch (e) {
              console.warn('Error during score injection:', e);
            }
          };

          // ── Perform unlock and persist state to session storage ──
          const performUnlock = () => {
            injectScoreAndPayload();
            extractAndSaveFormData();

            try {
              const raw = sessionStorage.getItem('hygiene-check');
              const session = raw ? JSON.parse(raw) : {};
              session.resultsUnlocked = true;
              sessionStorage.setItem('hygiene-check', JSON.stringify(session));

              if (containerRef.current && !isEditing) {
                containerRef.current.style.setProperty('display', 'none', 'important');
              }
              if (form && !isEditing) {
                form.style.setProperty('display', 'none', 'important');
              }

              window.dispatchEvent(new Event('hygiene-check-unlocked'));
              window.dispatchEvent(new Event('storage'));
            } catch (err) {
              console.warn('Error during form unlock capture:', err);
            }
          };

          // ── Handle submission attempt and unlock ──
          const handleSubmitAttempt = (e: Event) => {
            // Prevent accidental Enter on an empty form with no details
            if (!hasEnteredDetails()) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }

            performUnlock();
          };

          if (!(form as any)._hcSubmitBound) {
            (form as any)._hcSubmitBound = true;
            form.addEventListener('submit', handleSubmitAttempt, true);

            // Prevent accidental Enter key submission when form is completely empty
            form.addEventListener(
              'keydown',
              (e: KeyboardEvent) => {
                if (e.key === 'Enter') {
                  const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
                  if (targetTag === 'input') {
                    if (!hasEnteredDetails()) {
                      e.preventDefault();
                      e.stopPropagation();
                    } else {
                      performUnlock();
                    }
                  }
                }
              },
              true
            );

            if (submitBtn) {
              submitBtn.addEventListener('click', (e: MouseEvent) => {
                if (!hasEnteredDetails()) {
                  e.preventDefault();
                  e.stopPropagation();
                  return;
                }
                performUnlock();
              });
            }
          }

          // Mark form as styled once inputs and buttons are placed inside innerCard
          if (innerCard && innerCard.children.length >= 3) {
            form.setAttribute('data-hc-styled', 'true');
          }
        } finally {
          isProcessing = false;
        }
      };

      processForm();

      const handleUnlocked = () => {
        if (!isEditing && containerRef.current) {
          containerRef.current.style.setProperty('display', 'none', 'important');
        }
      };

      window.addEventListener('hygiene-check-unlocked', handleUnlocked);
      window.addEventListener('storage', handleUnlocked);

      const observer = new MutationObserver(() => {
        processForm();
      });

      observer.observe(containerRef.current, { childList: true, subtree: true });
      return () => {
        observer.disconnect();
        window.removeEventListener('hygiene-check-unlocked', handleUnlocked);
        window.removeEventListener('storage', handleUnlocked);
      };
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
