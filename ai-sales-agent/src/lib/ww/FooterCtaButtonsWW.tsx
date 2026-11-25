'use client';

import type { FC, KeyboardEvent } from 'react';
import { Text as SitecoreText, type LinkField } from '@sitecore-content-sdk/nextjs';
import { LinkWW } from 'src/lib/ww/LinkWW';
import { cn, normalizeLinkFieldWW, resolveLinkHrefWW } from 'src/lib/ww/utils';
import { readFieldValueWW, resolveFooterButtonsWW } from './footer-buttons-ww';

const PILL =
  'inline-flex h-10 items-center justify-center rounded-[38px] px-[29px] py-[7px] text-[13px] font-medium tracking-[1.69px] no-underline transition-colors duration-200 lg:text-[16px] lg:tracking-[2.08px]';

interface Props {
  fields: unknown;
  isEditing: boolean;
  locale: string;
}

export const FooterCtaButtonsWW: FC<Props> = ({ fields, isEditing, locale }) => {
  const { loginLink, getInTouchLabel, contactLink } = resolveFooterButtonsWW(fields);
  const loginFieldObj =
    loginLink && typeof loginLink === 'object' ? (loginLink as { jsonValue?: LinkField }) : undefined;
  const rawLogin = (loginFieldObj?.jsonValue ?? loginLink) as LinkField | undefined;
  const login = rawLogin ? (normalizeLinkFieldWW(rawLogin, locale) ?? rawLogin) : undefined;
  const hasLogin = Boolean(login) && (isEditing || Boolean(resolveLinkHrefWW(login)));

  const contactFieldObj =
    contactLink && typeof contactLink === 'object'
      ? (contactLink as { jsonValue?: LinkField })
      : undefined;
  const rawContact = (contactFieldObj?.jsonValue ?? contactLink) as LinkField | undefined;
  const normalizedContactLink = rawContact
    ? (normalizeLinkFieldWW(rawContact, locale) ?? rawContact)
    : undefined;
  const hasContactHref = Boolean(resolveLinkHrefWW(normalizedContactLink));

  const label = readFieldValueWW(getInTouchLabel);
  const displayLabel = label || 'Get in touch';
  const hasGetInTouch = Boolean(displayLabel) || isEditing;

  const openContact = () => {
    if (isEditing) return;
    const target = document.querySelector('#contact, form[data-formid], main');
    target?.scrollIntoView({ behavior: 'smooth' });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openContact();
    }
  };

  return (
    <div className="flex flex-col items-center gap-[17px] pt-5 lg:flex-row lg:justify-center lg:gap-[52px] lg:pb-5">
      {hasLogin ? (
        <LinkWW
          field={login as LinkField}
          className={cn(
            PILL,
            'w-[211px] border border-black text-black uppercase hover:bg-black hover:text-white lg:w-[264px]',
          )}
        />
      ) : (
        isEditing && (
          <div
            className={cn(
              PILL,
              'w-[211px] border border-dashed border-black text-black lg:w-[264px]',
            )}
          >
            LoginLink
          </div>
        )
      )}
      {!hasLogin && !isEditing && (
        <span
          aria-label="Log in link is not configured"
          className={cn(
            PILL,
            'w-[211px] border border-black text-black uppercase lg:w-[264px]',
          )}
        >
          Log in
        </span>
      )}

      {hasGetInTouch && hasContactHref && !isEditing ? (
        <LinkWW
          field={normalizedContactLink as LinkField}
          className={cn(
            PILL,
            'w-[197px] cursor-pointer bg-[#eb0045] text-white hover:bg-white hover:text-black lg:w-[247px]',
          )}
        >
          {displayLabel}
        </LinkWW>
      ) : (
        hasGetInTouch && (
          <div
            role="button"
            tabIndex={0}
            onClick={openContact}
            onKeyDown={onKeyDown}
            className={cn(
              PILL,
              'w-[197px] cursor-pointer bg-[#eb0045] text-white hover:bg-white hover:text-black lg:w-[247px]',
              isEditing &&
                !label &&
                'border border-dashed border-black bg-transparent text-black',
            )}
          >
            {isEditing && getInTouchLabel ? (
              <SitecoreText field={getInTouchLabel as any} />
            ) : (
              displayLabel
            )}
          </div>
        )
      )}
    </div>
  );
};

export default FooterCtaButtonsWW;
