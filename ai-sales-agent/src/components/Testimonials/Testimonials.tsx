"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Text,
  RichText,
  Image,
  useSitecore,
} from "@sitecore-content-sdk/nextjs";

// ============================================================================
// DESKTOP ARC GEOMETRY
//
// Every avatar centre is defined in ONE coordinate system (px, relative to the
// left column). The SVG arc is computed from those same three points, so the
// line always passes exactly through the middle of every avatar and the
// avatars can never drift out of alignment.
//
//   top    ●  (cx 90)
//        ╱
//   mid ●      (cx 42)   <- active, larger
//        ╲
//   bottom ●  (cx 90)
// ============================================================================

type SlotName = "top" | "middle" | "bottom";

const ARC_HEIGHT = 340;
const ARC_WIDTH = 120;
const TEXT_RIGHT_GUTTER = 60; // room reserved for the up/down arrows

const SLOTS: Record<SlotName, { cx: number; cy: number; size: number }> = {
  // `size` is the photo itself; the ring + white gap add ~3-4px on each side,
  // giving the ~48px (side) / ~62px (active) outer size of the reference.
  top: { cx: 90, cy: 60, size: 42 },
  middle: { cx: 42, cy: 170, size: 54 },
  bottom: { cx: 90, cy: 280, size: 42 },
};

// Circle through the three slot centres (centre lies on the right of the arc).
const ARC_RADIUS = (() => {
  const dx = SLOTS.top.cx - SLOTS.middle.cx;
  const dy = SLOTS.middle.cy - SLOTS.top.cy;
  return (dx * dx + dy * dy) / (2 * dx);
})();

const ARC_PATH = `M ${SLOTS.top.cx} ${SLOTS.top.cy} A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 0 ${SLOTS.bottom.cx} ${SLOTS.bottom.cy}`;

// ============================================================================
// HELPERS
// ============================================================================

const getField = (item: any, fieldName: string) =>
  item?.fields?.[fieldName] ?? { value: "" };

const getRating = (item: any) => {
  const value = Number(getField(item, "Rating Stars")?.value);
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(5, value));
};

const getVisibleTestimonials = (list: any[], activeIndex: number) => {
  const total = list.length;

  if (total === 0) return [];

  if (total === 1) {
    return [{ item: list[0], index: 0, position: "middle" as SlotName }];
  }

  const prev = (activeIndex - 1 + total) % total;
  const next = (activeIndex + 1) % total;

  if (total === 2) {
    return [
      { item: list[prev], index: prev, position: "top" as SlotName },
      { item: list[activeIndex], index: activeIndex, position: "middle" as SlotName },
    ];
  }

  return [
    { item: list[prev], index: prev, position: "top" as SlotName },
    { item: list[activeIndex], index: activeIndex, position: "middle" as SlotName },
    { item: list[next], index: next, position: "bottom" as SlotName },
  ];
};

// ============================================================================
// SMALL PRESENTATIONAL COMPONENTS
// (defined outside the main component so they are not re-created every render)
// ============================================================================


const StarRating = ({
  rating,
  active,
  className = "",
}: {
  rating: number;
  active?: boolean;
  className?: string;
}) => (
  <span className={`flex items-center gap-[3px] ${className}`} aria-label={`${rating} out of 5 stars`}>
    {Array.from({ length: 5 }).map((_, index) => (
      <svg
        key={index}
        viewBox="0 0 20 20"
        className={`h-[10px] w-[10px] ${
          index < rating
            ? active
              ? "fill-emerald-500"
              : "fill-emerald-200"
            : "fill-slate-200"
        }`}
        aria-hidden="true"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ))}
  </span>
);

const Avatar = ({
  field,
  size,
  active,
  pop,
}: {
  field: any;
  size: number;
  active: boolean;
  pop?: boolean;
}) => (
  <span
    className={`relative block shrink-0 rounded-full transition-all duration-300 ease-out motion-reduce:transition-none ${
      active
        ? "bg-white ring-2 ring-emerald-500 ring-offset-2 ring-offset-white shadow-[0_0_16px_rgba(16,185,129,0.35)]"
        : "border border-slate-200/80 bg-slate-50"
    } ${pop && active ? "tst-pop" : ""}`}
    style={{ width: size, height: size }}
  >
    <span className="block h-full w-full overflow-hidden rounded-full">
      <Image
        field={field}
        className={`h-full w-full object-cover transition-all duration-300 motion-reduce:transition-none ${
          active
            ? "opacity-100 grayscale-0"
            : "opacity-35 grayscale contrast-75 hover:opacity-60"
        }`}
      />
    </span>
  </span>
);

const Dots = ({
  count,
  activeIndex,
  onSelect,
  className = "",
}: {
  count: number;
  activeIndex: number;
  onSelect: (index: number) => void;
  className?: string;
}) => (
  <div className={`flex flex-wrap items-center gap-[9px] ${className}`}>
    {Array.from({ length: count }).map((_, index) => (
      <button
        key={index}
        type="button"
        onClick={() => onSelect(index)}
        aria-label={`Go to testimonial ${index + 1}`}
        aria-current={index === activeIndex ? "true" : undefined}
        className={`h-[6px] cursor-pointer rounded-full transition-all duration-500 ease-out motion-reduce:transition-none ${
          index === activeIndex
            ? "w-[27px] bg-emerald-500"
            : "w-[6px] bg-slate-200 hover:bg-slate-300"
        }`}
      />
    ))}
  </div>
);

const Badge = ({ field, isEditing }: { field: any; isEditing?: boolean }) => {
  if (!field?.value && !isEditing) return null;
  return (
    <div className="inline-flex h-[30px] items-center gap-[7px] rounded-full border border-sky-200 bg-sky-50 px-[12px] text-[11px] font-medium uppercase tracking-[0.4px] text-sky-500">
      <svg className="h-[12px] w-[12px] fill-current" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" />
      </svg>
      <Text field={field} />
    </div>
  );
};

const NameAndRole = ({ name, role }: { name: any; role: any }) => (
  <>
    <Text field={name} />
    {role?.value && (
      <>
        <span>, </span>
        <Text field={role} />
      </>
    )}
  </>
);

// ============================================================================
// COMPONENT
// ============================================================================

export const Testimonials = (props: any) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing;

  // --------------------------------------------------------------------------
  // FIELDS
  //
  // fields["Testimonials"] = [
  //   { id, url, name, displayName, fields: {
  //       "Author Name", "Author Role", "Author Avatar",
  //       "Quote Text", "Rating Stars" } }
  // ]
  // --------------------------------------------------------------------------

  const fields = props?.fields ?? {};
  const badgeLabel = fields["Badge Label"];
  const headingTitle = fields["Heading Title"];

  const rawTestimonials: any[] = Array.isArray(fields["Testimonials"])
    ? fields["Testimonials"]
    : [];

  const hasContent = (item: any) =>
    Boolean(
      getField(item, "Quote Text")?.value ||
        getField(item, "Author Name")?.value ||
        getField(item, "Author Role")?.value ||
        getField(item, "Author Avatar")?.value?.src
    );

  const testimonials = isEditing
    ? rawTestimonials
    : rawTestimonials.filter(hasContent);

  // --------------------------------------------------------------------------
  // STATE (all hooks stay above any early return)
  // --------------------------------------------------------------------------

  const [activeIndex, setActiveIndex] = useState(0);
  const stripRef = useRef<HTMLDivElement>(null);
  const editScrollRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const scrollStartXRef = useRef(0);
  const hasMovedRef = useRef(false);

  const scrollEditRow = (delta: number) => {
    editScrollRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  const total = testimonials.length;
  const safeActiveIndex = total > 0 ? Math.min(activeIndex, total - 1) : 0;
  const activeTestimonial = testimonials[safeActiveIndex];

  // 1 = moving forward, -1 = moving back. Drives the direction of the motion.
  const [direction, setDirection] = useState<1 | -1>(1);
  // Only animate after the first interaction so nothing flashes on page load.
  const [animate, setAnimate] = useState(false);

  const goTo = (index: number, dir?: 1 | -1) => {
    if (index === safeActiveIndex) return;
    setDirection(dir ?? (index > safeActiveIndex ? 1 : -1));
    setAnimate(true);
    setActiveIndex(index);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!stripRef.current) return;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    dragStartXRef.current = e.pageX - stripRef.current.offsetLeft;
    scrollStartXRef.current = stripRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !stripRef.current) return;
    const x = e.pageX - stripRef.current.offsetLeft;
    const walk = x - dragStartXRef.current;
    if (Math.abs(walk) > 4) {
      hasMovedRef.current = true;
    }
    stripRef.current.scrollLeft = scrollStartXRef.current - walk;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleAvatarClick = (index: number) => {
    if (hasMovedRef.current) return;
    goTo(index);
  };

  const handleNext = () => {
    if (total <= 1) return;
    goTo((safeActiveIndex + 1) % total, 1);
  };

  const handlePrevious = () => {
    if (total <= 1) return;
    goTo(safeActiveIndex === 0 ? total - 1 : safeActiveIndex - 1, -1);
  };

  const motionVar = (axis: "x" | "y", px: number) =>
    ({ [`--tst-${axis}`]: `${direction * px}px` }) as React.CSSProperties;

  // Mobile: keep the active avatar centred inside the horizontal strip.
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;

    const button = strip.querySelector<HTMLElement>(
      `[data-index="${safeActiveIndex}"]`
    );
    if (!button) return;

    const left = button.offsetLeft - strip.clientWidth / 2 + button.offsetWidth / 2;
    strip.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [safeActiveIndex, total]);

  // Mobile: swipe on the quote card to change testimonial.
  const onTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0].clientX;
  };

  const onTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current === null) return;

    const deltaX = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(deltaX) < 50) return;

    if (deltaX < 0) {
      handleNext();
    } else {
      handlePrevious();
    }
  };

  const visibleTestimonials = getVisibleTestimonials(testimonials, safeActiveIndex);

  // ==========================================================================
  // PAGE BUILDER EDITING MODE
  //
  // Show every testimonial so authors can edit every datasource item.
  // ==========================================================================

  if (!isEditing && total === 0) {
    return null;
  }

  if (isEditing) {
    return (
      <section className="component w-full bg-slate-50/60 px-6 py-10 border-b border-slate-200">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <div className="mb-4">
              <Badge field={badgeLabel} isEditing={isEditing} />
            </div>

            <h2 className="max-w-[700px] text-2xl sm:text-3xl font-extrabold tracking-tight text-[#101828]">
              <Text field={headingTitle} />
            </h2>

            {/* Authoring guidance banner */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-3 text-xs text-sky-800">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 shrink-0 text-sky-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                <span className="font-semibold">Authoring Mode:</span>
                <span>Scroll horizontally to edit each testimonial card. Click any field to edit.</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-sky-200/70 px-2.5 py-0.5 font-bold text-sky-900">
                  {total} {total === 1 ? "Testimonial" : "Testimonials"}
                </span>
                {total > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => scrollEditRow(-370)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-sky-300 bg-white text-sky-700 shadow-sm transition hover:bg-sky-100 active:scale-90"
                      title="Scroll left"
                      aria-label="Scroll left"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollEditRow(370)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-sky-300 bg-white text-sky-700 shadow-sm transition hover:bg-sky-100 active:scale-90"
                      title="Scroll right"
                      aria-label="Scroll right"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {total === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-sky-200 bg-white p-10 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm font-bold text-slate-800">No testimonials configured</p>
              <p className="mt-1 text-xs text-slate-500">
                Add testimonial datasource items to the Testimonials field.
              </p>
            </div>
          ) : (
            <div className="relative">
              <div
                ref={editScrollRef}
                className="flex gap-5 overflow-x-auto pb-4 pt-2 px-1 scroll-smooth"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                {testimonials.map((item: any, index: number) => (
                  <div
                    key={item?.id ?? item?.url ?? index}
                    className="flex w-[350px] shrink-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                  >
                  {/* Card Header */}
                  <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-5 items-center rounded-full bg-emerald-50 px-2 text-[11px] font-bold text-emerald-700">
                        #{index + 1}
                      </span>
                      <span className="max-w-[150px] truncate text-xs font-semibold text-slate-700" title={item?.displayName ?? item?.name}>
                        {item?.displayName ?? item?.name ?? `Testimonial ${index + 1}`}
                      </span>
                    </div>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                      Card
                    </span>
                  </div>

                  {/* Top Area: Avatar + Details */}
                  <div className="mb-4 flex items-start gap-4">
                    {/* Avatar */}
                    <div className="shrink-0 text-center">
                      <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-sky-300 bg-sky-50/60 hover:border-sky-500">
                        <Image
                          field={getField(item, "Author Avatar")}
                          className="h-full w-full object-cover"

                        />
                      </div>
                      <span className="mt-1 block text-[10px] font-medium text-slate-400">Avatar</span>
                    </div>

                    {/* Author Info */}
                    <div className="min-w-0 flex-1 space-y-2">
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Author Name
                        </span>
                        <div className="text-sm font-bold text-slate-900">
                          <Text
                            field={getField(item, "Author Name")}

                          />
                        </div>
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Role / Title
                        </span>
                        <div className="text-xs text-slate-600">
                          <Text
                            field={getField(item, "Author Role")}

                          />
                        </div>
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Rating (1-5)
                        </span>
                        <div className="inline-flex items-center gap-1.5 rounded bg-slate-50 px-2 py-0.5 text-xs text-slate-700">
                          <svg className="h-3 w-3 fill-amber-400" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <Text
                            field={getField(item, "Rating Stars")}

                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quote area */}
                  <div className="mt-auto flex-1 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Quote Content
                      </span>
                      <span className="font-serif text-base leading-none text-slate-300">“</span>
                    </div>
                    <div className="text-xs italic leading-relaxed text-slate-600">
                      <RichText
                        field={getField(item, "Quote Text")}

                      />
                    </div>
                  </div>
                </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  // ==========================================================================
  // NORMAL / PREVIEW MODE
  // ==========================================================================

  return (
    <section className="component w-full bg-white">
      <style>{`
        @keyframes tst-slide-y {
          from { opacity: 0; transform: translateY(var(--tst-y, 14px)); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes tst-slide-x {
          from { opacity: 0; transform: translateX(var(--tst-x, 24px)); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes tst-pop {
          from { transform: scale(0.85); }
          to   { transform: scale(1); }
        }
        .tst-slide-y { animation: tst-slide-y 480ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        .tst-slide-x { animation: tst-slide-x 480ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        .tst-pop     { animation: tst-pop 520ms cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        .tst-no-scrollbar::-webkit-scrollbar { display: none; width: 0; height: 0; }
        .tst-no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @media (prefers-reduced-motion: reduce) {
          .tst-slide-y, .tst-slide-x, .tst-pop { animation: none; }
        }
      `}</style>

      <div className="mx-auto max-w-[1200px] px-5 pb-14 pt-10 sm:px-6 lg:pb-[70px] lg:pt-[45px]">
        {/* ================================================================== */}
        {/* HEADER                                                             */}
        {/* ================================================================== */}

        <div className="mb-10 lg:mb-[56px]">
          <div className="mb-5 lg:mb-[27px]">
            <Badge field={badgeLabel} isEditing={isEditing} />
          </div>

          <h2 className="max-w-[650px] text-[28px] font-extrabold leading-[1.2] tracking-[-0.75px] text-[#101828] sm:text-[32px] lg:text-[38px] lg:leading-[1.17] lg:tracking-[-1.25px]">
            <Text field={headingTitle} />
          </h2>
        </div>

        {total > 0 && activeTestimonial && (
          <>
            {/* ============================================================== */}
            {/* DESKTOP (lg and up)                                            */}
            {/* ============================================================== */}

            <div className="hidden lg:grid lg:grid-cols-[minmax(0,540px)_minmax(0,1fr)]">
              {/* ------------------------------ LEFT ------------------------------ */}

              <div className="pr-9">
                <div className="relative" style={{ height: ARC_HEIGHT }}>
                  {/* Static arc - computed from the same slot coordinates as the avatars */}
                  <svg
                    className="pointer-events-none absolute left-0 top-0 z-0"
                    width={ARC_WIDTH}
                    height={ARC_HEIGHT}
                    viewBox={`0 0 ${ARC_WIDTH} ${ARC_HEIGHT}`}
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d={ARC_PATH}
                      stroke="#DCE4EC"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>

                  {visibleTestimonials.map(({ item, index, position }) => {
                    const slot = SLOTS[position];
                    const isActive = index === safeActiveIndex;
                    const left = slot.cx - slot.size / 2;

                    return (
                      <button
                        key={position}
                        type="button"
                        onClick={() =>
                          goTo(index, position === "top" ? -1 : 1)
                        }
                        aria-current={isActive ? "true" : undefined}
                        className={`group absolute z-10 block -translate-y-1/2 rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400 ${
                          isActive ? "cursor-default" : "cursor-pointer"
                        }`}
                        style={{
                          top: slot.cy,
                          left,
                          width: `calc(100% - ${left + TEXT_RIGHT_GUTTER}px)`,
                        }}
                      >
                        {/* Re-mounts whenever this slot's testimonial changes, replaying the slide-in */}
                        <span
                          key={`${position}-${index}`}
                          className={`flex w-full items-center gap-[22px] ${
                            animate ? "tst-slide-y" : ""
                          }`}
                          style={{
                            ...motionVar("y", 16),
                            animationDelay: isActive ? "0ms" : "50ms",
                          }}
                        >
                          <Avatar
                            field={getField(item, "Author Avatar")}
                            size={slot.size}
                            active={isActive}
                            pop={animate}
                          />

                          <span className="block min-w-0 flex-1">
                            <span
                              className={`block text-[14px] leading-[20px] transition-colors duration-500 motion-reduce:transition-none ${
                                isActive
                                  ? "font-bold text-[#101828]"
                                  : "font-semibold text-[#B4BDCA] group-hover:text-[#8A94A6]"
                              }`}
                            >
                              <NameAndRole
                                name={getField(item, "Author Name")}
                                role={getField(item, "Author Role")}
                              />
                            </span>

                            <StarRating
                              rating={getRating(item)}
                              active={isActive}
                              className="mt-[6px]"
                            />
                          </span>
                        </span>
                      </button>
                    );
                  })}

                  {/* Arrows */}
                  {total > 1 && (
                    <div className="absolute right-0 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2">
                      <button
                        type="button"
                        onClick={handlePrevious}
                        aria-label="Previous testimonial"
                        className="flex h-[40px] w-[32px] cursor-pointer items-center justify-center rounded-md border border-[#E4E7EC] bg-white text-[#667085] transition duration-200 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 active:scale-90 motion-reduce:transition-none"
                      >
                        <svg viewBox="0 0 24 24" fill="none" className="h-[15px] w-[15px]" aria-hidden="true">
                          <path d="M5 15l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={handleNext}
                        aria-label="Next testimonial"
                        className="flex h-[40px] w-[32px] cursor-pointer items-center justify-center rounded-md border border-[#E4E7EC] bg-white text-[#667085] transition duration-200 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 active:scale-90 motion-reduce:transition-none"
                      >
                        <svg viewBox="0 0 24 24" fill="none" className="h-[15px] w-[15px]" aria-hidden="true">
                          <path d="M5 9l7 7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ------------------------------ RIGHT ----------------------------- */}

              <div
                className="flex items-center border-l border-[#EAECF0] pl-9"
                style={{ minHeight: ARC_HEIGHT }}
              >
                <div className="w-full max-w-[540px]">
                  <div className="relative">
                    <span
                      className="absolute -left-5 -top-[14px] font-serif text-[52px] leading-none text-emerald-200"
                      aria-hidden="true"
                    >
                      “
                    </span>

                    <div
                      key={safeActiveIndex}
                      className={`text-[15px] italic leading-[24px] text-[#667085] ${
                        animate ? "tst-slide-y" : ""
                      }`}
                      style={motionVar("y", 16)}
                    >
                      <RichText field={getField(activeTestimonial, "Quote Text")} />
                    </div>
                  </div>

                  {total > 1 && (
                    <Dots
                      count={total}
                      activeIndex={safeActiveIndex}
                      onSelect={(index) => goTo(index)}
                      className="mt-10"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* ============================================================== */}
            {/* MOBILE / TABLET (below lg)                                     */}
            {/* ============================================================== */}

            <div className="lg:hidden">
              {/* Quote card */}
              <div
                className="relative rounded-2xl border border-[#EEF1F5] bg-[#F8FAFC] py-6 pl-10 pr-5 sm:py-8 sm:pl-14 sm:pr-8"
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
              >
                <span
                  className="absolute left-4 top-3 font-serif text-[48px] leading-none text-emerald-200 sm:left-6 sm:top-5"
                  aria-hidden="true"
                >
                  “
                </span>

                <div
                  key={safeActiveIndex}
                  className={`text-[15px] italic leading-[24px] text-[#475467] sm:text-[16px] sm:leading-[27px] ${
                    animate ? "tst-slide-x" : ""
                  }`}
                  style={motionVar("x", 24)}
                >
                  <RichText field={getField(activeTestimonial, "Quote Text")} />
                </div>
              </div>

              {/* Avatar strip: complete scrollable bar of circle avatars (scrollbar hidden) */}
              <div
                ref={stripRef}
                className="tst-no-scrollbar relative mt-6 flex w-full overflow-x-auto scroll-smooth py-2 select-none"
                style={{ WebkitOverflowScrolling: "touch" }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <div className="flex w-max min-w-full items-center justify-start sm:justify-center gap-3.5 px-3 py-1">
                  {testimonials.map((item: any, index: number) => {
                    const isActive = index === safeActiveIndex;

                    return (
                      <button
                        key={item?.id ?? item?.url ?? index}
                        type="button"
                        data-index={index}
                        onClick={() => handleAvatarClick(index)}
                        aria-label={`Show testimonial ${index + 1}`}
                        aria-current={isActive ? "true" : undefined}
                        className={`shrink-0 cursor-pointer rounded-full transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-500 ${
                          isActive ? "scale-105" : "scale-95 hover:scale-100"
                        }`}
                      >
                        <Avatar
                          field={getField(item, "Author Avatar")}
                          size={isActive ? 50 : 38}
                          active={isActive}
                          pop={animate}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active author */}
              <div
                key={safeActiveIndex}
                className={`mt-4 text-center ${animate ? "tst-slide-y" : ""}`}
                style={motionVar("y", 10)}
              >
                <div className="mx-auto max-w-[420px] text-[15px] font-bold leading-[22px] text-[#101828]">
                  <NameAndRole
                    name={getField(activeTestimonial, "Author Name")}
                    role={getField(activeTestimonial, "Author Role")}
                  />
                </div>

                <StarRating
                  rating={getRating(activeTestimonial)}
                  active
                  className="mt-2 justify-center"
                />
              </div>

              {/* Dots */}
              {total > 1 && (
                <Dots
                  count={total}
                  activeIndex={safeActiveIndex}
                  onSelect={(index) => goTo(index)}
                  className="mt-7 justify-center"
                />
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default Testimonials;