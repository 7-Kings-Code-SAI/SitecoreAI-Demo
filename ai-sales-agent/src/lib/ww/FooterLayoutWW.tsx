'use client';

import type { FC, MouseEvent, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { cn, formatHrefWW, isUrlActiveWW } from 'src/lib/ww/utils';
import type { NormalizedFooterWWLink } from './footer-data-ww';
import { FooterCtaButtonsWW } from './FooterCtaButtonsWW';

export interface ContactBlockWW {
  type: 'title' | 'text' | 'link';
  content: string;
  href?: string;
}

export interface WorkwearColumnWW {
  id?: string;
  title?: string;
  links: NormalizedFooterWWLink[];
}

const TITLE = 'text-[12px] leading-[29px] font-bold md:text-[14px] lg:text-[16px]';
const TEXT =
  'text-[11.5px] leading-[16px] sm:text-[12px] md:text-[14px] md:leading-[20px] lg:text-[15px] lg:leading-[22px]';

const FooterLinkColumnWW: FC<{
  column: WorkwearColumnWW;
  locale: string;
  onLinkClick: (value: string, type?: string) => void;
}> = ({ column, locale, onLinkClick }) => {
  const router = useRouter();

  return (
    <div className="flex w-full min-w-0 flex-col gap-[13px] lg:w-[305px] lg:gap-[16px]">
      <p className="m-0 text-[15px] leading-[18px] font-bold md:text-[19px] md:leading-[24px] lg:text-[24px] lg:leading-[29px]">
        {column.title ?? ''}
      </p>
      <ul
        className="m-0 grid list-none grid-flow-col grid-cols-2 gap-x-8 gap-y-1 p-0 text-[12px] leading-[16px] md:gap-y-2 md:text-[15px] md:leading-[20px] lg:gap-y-3 lg:text-[18px] lg:leading-[24px]"
        style={{ gridTemplateRows: `repeat(${Math.ceil(Math.max(column.links.length, 1) / 2)}, auto)` }}
      >
        {column.links.map((link, i) => {
          const isContactHref = link.href.startsWith('mailto:') || link.href.startsWith('tel:');
          const href = isContactHref
            ? link.href
            : (formatHrefWW(link.href, locale) ?? link.href);
          const isActive = isUrlActiveWW(href, router?.asPath, locale);

          return (
            <li key={link.id || i}>
              <a
                href={href}
                className={cn(
                  'break-words no-underline transition-colors hover:text-[#eb0045]',
                  isActive ? 'text-[#eb0045]' : 'text-black',
                )}
                onClick={(e: MouseEvent) => {
                  if (href.startsWith('mailto:') || href.startsWith('tel:')) {
                    e.preventDefault();
                    onLinkClick(href);
                  }
                }}
              >
                {link.text}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const ContactBlocksWW: FC<{
  title?: string;
  blocks: ContactBlockWW[];
  onLinkClick: (value: string, type?: string) => void;
  className?: string;
}> = ({ title, blocks, onLinkClick, className }) => {
  const firstBlockIsTitle = !title && blocks[0]?.type === 'title';
  const heading = title ?? (firstBlockIsTitle ? blocks[0]?.content : undefined);
  const bodyBlocks = firstBlockIsTitle ? blocks.slice(1) : blocks;

  return (
    <div className={cn('flex min-w-0 flex-col gap-[12px] lg:gap-[15px]', className)}>
      {heading && <p className={cn(TITLE, 'm-0')}>{heading}</p>}
      <div className="flex min-w-0 flex-col">
        {bodyBlocks.map((b, i) =>
          b.type === 'title' ? (
            <p key={i} className={cn(TEXT, 'm-0 font-bold')}>
              {b.content}
            </p>
          ) : b.type === 'link' ? (
            <a
              key={i}
              href={`mailto:${b.href}`}
              className={cn(TEXT, 'text-black no-underline transition-colors hover:text-[#eb0045]')}
              onClick={(e) => {
                e.preventDefault();
                onLinkClick(b.href ?? '', 'mailto');
              }}
            >
              {b.content}
            </a>
          ) : (
            <p key={i} className={cn(TEXT, 'm-0 text-black')}>
              {b.content}
            </p>
          ),
        )}
      </div>
    </div>
  );
};

interface FooterLayoutWWProps {
  fields: unknown;
  isEditing: boolean;
  locale: string;
  contactTitle?: string;
  phoneNumber?: string;
  workingHours?: string;
  hasContactContent: boolean;
  linkColumns: WorkwearColumnWW[];
  pressContact?: ContactBlockWW[] | null;
  prAgency?: ContactBlockWW[] | null;
  socialSlot: ReactNode;
  onLinkClick: (value: string, type?: string) => void;
}

export const FooterLayoutWW: FC<FooterLayoutWWProps> = ({
  fields,
  isEditing,
  locale,
  contactTitle,
  phoneNumber,
  workingHours,
  hasContactContent,
  linkColumns,
  pressContact,
  prAgency,
  socialSlot,
  onLinkClick,
}) => (
  <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-[24px] px-6 pt-[48px] pb-[20px] text-black lg:gap-[48px] lg:px-[41px] lg:pt-[36px] lg:pb-[44px]">
    <FooterCtaButtonsWW fields={fields} isEditing={isEditing} locale={locale} />

    <div className="flex w-full flex-col items-center gap-[24px] lg:flex-row lg:items-start lg:justify-start lg:gap-16 xl:gap-[310px]">
      <div className="flex flex-col items-center lg:w-[149px] lg:shrink-0 lg:items-start">
        {socialSlot}
      </div>
      <div className="flex w-full flex-col gap-[18px] lg:w-auto lg:flex-row lg:gap-[56px]">
        {linkColumns.map((column, i) => (
          <FooterLinkColumnWW
            key={column.id || i}
            column={column}
            locale={locale}
            onLinkClick={onLinkClick}
          />
        ))}
      </div>
    </div>

    <div className="mt-[4px] grid w-full grid-cols-2 gap-x-3 gap-y-[26px] lg:mt-0 lg:grid-cols-[256px_392px_1fr] lg:gap-x-0">
      {(hasContactContent || isEditing) && (
        <div className="order-3 col-span-2 flex flex-col gap-[15px] lg:order-1 lg:col-span-1">
          <p className={cn(TITLE, 'm-0')}>{contactTitle || 'Contact'}</p>
          <div className="flex flex-col">
            {phoneNumber && (
              <a
                href={`tel:${phoneNumber.replace(/\s/g, '')}`}
                className={cn(TEXT, 'text-black no-underline transition-colors hover:text-[#eb0045]')}
                onClick={(e) => {
                  e.preventDefault();
                  onLinkClick(phoneNumber, 'tel');
                }}
              >
                {phoneNumber}
              </a>
            )}
            {workingHours && <span className={TEXT}>{workingHours}</span>}
          </div>
        </div>
      )}
      {pressContact && (
        <ContactBlocksWW
          blocks={pressContact}
          onLinkClick={onLinkClick}
          className="order-1 lg:order-2"
        />
      )}
      {prAgency && (
        <ContactBlocksWW
          blocks={prAgency}
          onLinkClick={onLinkClick}
          className="order-2 lg:order-3"
        />
      )}
    </div>
  </div>
);

export default FooterLayoutWW;
