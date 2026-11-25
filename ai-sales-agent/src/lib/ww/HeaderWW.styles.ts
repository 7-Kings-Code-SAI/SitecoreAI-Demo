/**
 * Visual tokens for HeaderWW (Workwear UI).
 */

/** Checkbox field on the page (route) template that enables the transparent hero header. */
export const HEADER_TRANSPARENT_FIELD = 'HeaderTransparent';

export interface HeaderWWTone {
  header: string;
  topBarShadow: string;
  utilityLinks: string;
  mobileIcon: string;
  mobileBar: string;
  navLink: string;
  navActive: string;
  navIdle: string;
}

const TRANSPARENT: HeaderWWTone = {
  header: 'lg:bg-gradient-to-b lg:from-black/30 lg:to-transparent',
  topBarShadow: '',
  utilityLinks:
    'lg:[&_[data-component=TopHeaderWW]_a]:text-white lg:[&_[data-component=TopHeaderWW]_span]:text-white lg:[&_[data-component=TopHeader]_a]:text-white lg:[&_[data-component=TopHeader]_span]:text-white',
  mobileIcon: '',
  mobileBar: 'bg-black',
  navLink: 'text-white',
  navActive: 'text-[#FFCE00] after:bg-[#FFCE00]',
  navIdle: 'text-white after:bg-[#FFCE00] hover:text-[#FFCE00] hover:after:scale-x-100',
};

const SOLID: HeaderWWTone = {
  header: 'bg-white',
  topBarShadow: 'shadow-[0_1px_12px_rgba(0,0,0,0.10)]',
  utilityLinks: '',
  mobileIcon: '',
  mobileBar: 'bg-black',
  navLink: 'text-black',
  navActive: 'text-[#eb0045] after:bg-[#eb0045]',
  navIdle: 'text-black after:bg-[#eb0045] hover:text-[#eb0045] hover:after:scale-x-100',
};

export const getHeaderWWTone = (isSolid: boolean): HeaderWWTone => (isSolid ? SOLID : TRANSPARENT);

const PILL =
  'inline-flex h-[28px] w-[102px] cursor-pointer items-center justify-center rounded-full text-[14px] leading-none font-bold no-underline shadow-[0_1px_3.5px_rgba(0,0,0,0.1)] transition-colors duration-200';
const MOBILE_PILL =
  'flex w-full cursor-pointer items-center justify-center rounded-full px-4 py-2 text-[14px] font-bold no-underline shadow-lg';

export const headerWWLayout = {
  topBarRow: 'relative justify-center lg:h-[72px]',
  topBarContainer: 'lg:max-w-none lg:px-0',
  utility:
    'lg:[&_[data-component=TopHeaderWW]_a]:transition-colors lg:[&_[data-component=TopHeaderWW]_a:hover]:text-[#eb0045] lg:[&_[data-component=TopHeaderWW]_a:hover_span]:text-[#eb0045] lg:[&_[data-component=TopHeader]_a]:transition-colors lg:[&_[data-component=TopHeader]_a:hover]:text-[#eb0045] lg:absolute lg:top-0 lg:right-[31px] lg:h-full lg:w-[calc(50%-153px)] lg:justify-end lg:gap-3 lg:[&>div]:min-w-0',
  mobileControls: 'absolute top-1/2 right-2 -translate-y-1/2',
  navRow: 'lg:pointer-events-none lg:absolute lg:inset-x-0 lg:top-0 lg:z-[75]',
  navRowInner: 'lg:relative lg:max-w-none lg:px-[34px] lg:pt-[16px] lg:pb-0',
  navPointer:
    'lg:pointer-events-auto lg:h-auto lg:max-w-[calc(50%-122px)] lg:flex-wrap lg:gap-x-7 lg:gap-y-1',
  navItem: 'text-[15px] whitespace-nowrap',
  buttonStack:
    'lg:pointer-events-auto lg:absolute lg:top-[105px] lg:right-[27px] lg:flex-col lg:items-end lg:gap-[10px] lg:transition-[opacity,visibility] lg:duration-[800ms] lg:ease-[cubic-bezier(0.42,0,1,1)] motion-reduce:transition-none',
  contactButton: `${PILL} bg-[#f9e244] text-black hover:bg-[#FFCE00]`,
  loginButton: `${PILL} bg-[#eb0045] text-white hover:bg-[#c8003c]`,
  mobileContactButton: `${MOBILE_PILL} bg-[#f9e244] text-black`,
  mobileLoginButton: `${MOBILE_PILL} bg-[#eb0045] text-white`,
  logoWrap:
    'relative w-[210px] max-w-[calc(100%-176px)] origin-center will-change-[translate,scale] lg:w-[196px] lg:max-w-none transition-[translate,scale] duration-[900ms] ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none [&_a]:block [&_img]:aspect-[7/1] [&_img]:h-auto [&_img]:w-full [&_img]:max-w-none [&_img]:object-contain [&_svg]:h-auto [&_svg]:w-full',
  logoHero:
    'z-[70] scale-[1.457] translate-y-[calc(42svh-27.5px)] md:translate-y-[calc(42svh-25px)] lg:scale-[2.4286] lg:translate-y-[calc(50svh-36px)]',
  logoReturn: 'z-0 scale-100 translate-y-0 lg:-translate-y-[2px]',
  buttonStackHero: 'lg:pointer-events-none lg:invisible lg:opacity-0',
  buttonStackReveal: 'lg:delay-[700ms]',
};

/** In-flow space reserved when the header does not overlay the hero (solid pages). */
export const getHeaderWWSpacer = (showMainNavigationBar: boolean): string =>
  showMainNavigationBar ? 'h-[55px] md:h-[50px] lg:h-[106px]' : 'h-[55px] md:h-[50px] lg:h-[72px]';
