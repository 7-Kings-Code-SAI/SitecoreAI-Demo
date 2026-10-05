"use client";

import { JSX } from "react";
import {
    Text,
    RichText,
    Image as JssImage,
    Link as JssLink,
    ImageField,
    LinkField,
    TextField,
    RichTextField,
} from "@sitecore-content-sdk/nextjs";
import { ComponentProps } from "lib/component-props";

type IndustryGridVariant = 'default' | 'SecurityGrid';

interface IndustryCard {
    id?: string;
    name?: string;
    displayName?: string;
    url?: string;

    fields?: {
        "Card Icon"?: ImageField;
        "Card Title"?: TextField;
        "Card Description"?: TextField;
        "Card description"?: TextField;

        cardIcon?: ImageField;
        cardTitle?: TextField;
        cardDescription?: TextField;
    };
}

interface IndustryGridFields {
    "Tag Label"?: TextField;
    Heading?: TextField;
    "Sub Heading"?: TextField | RichTextField | any;
    "Industry Cards"?: IndustryCard[] | {
        value?: IndustryCard[];
    };
    "Bullet Points"?: TextField | string[] | any;
    "CTA"?: LinkField;
    "Primary CTA"?: LinkField;

    tagLabel?: TextField;
    heading?: TextField;
    subHeading?: TextField | RichTextField | any;
    industryCards?: IndustryCard[];
    bulletPoints?: TextField | string[] | any;
    cta?: LinkField;
    primaryCta?: LinkField;
}

export type IndustryGridProps = Partial<ComponentProps> & {
    fields?: IndustryGridFields | any;
    params?: any;
    rendering?: any;
};

export function IndustryGrid({
    fields,
    params,
    variant = 'default',
}: IndustryGridProps & { variant?: IndustryGridVariant }): JSX.Element {
    const styles = params?.styles || "";

    // Auto-detect variant from props or Sitecore rendering params
    const activeVariant: IndustryGridVariant =
        (params?.Variant as IndustryGridVariant) ||
        (params?.variant as IndustryGridVariant) ||
        (params?.renderingVariant as IndustryGridVariant) ||
        variant ||
        'default';

    /*
     * Support both:
     * 1. Direct array: fields["Industry Cards"] as Array
     * 2. Object with .value: fields["Industry Cards"].value
     * 3. CamelCase fallback: fields.industryCards
     */
    const rawCards = fields?.["Industry Cards"] || fields?.industryCards;
    const cards: IndustryCard[] = Array.isArray(rawCards)
        ? rawCards
        : (rawCards as { value?: IndustryCard[] })?.value || [];

    const tagLabel =
        fields?.["Tag Label"] ||
        fields?.tagLabel;

    const heading =
        fields?.Heading ||
        fields?.heading;

    const subHeading =
        fields?.["Sub Heading"] ||
        fields?.subHeading;

    // Render SecurityGrid variant
    if (activeVariant === 'SecurityGrid') {
        return (
            <SecurityGridView
                fields={fields}
                cards={cards}
                tagLabel={tagLabel}
                heading={heading}
                subHeading={subHeading}
                styles={styles}
            />
        );
    }

    // Default Grid layout
    return (
        <section
            className={`w-full bg-white py-16 md:py-20 lg:py-24 ${styles}`}
        >
            <div className="mx-auto w-full max-w-[1200px] px-6 md:px-8">

                {/* =========================
                    SECTION HEADER
                ========================== */}
                <div className="mx-auto mb-14 max-w-[760px] text-center">

                    {/* Tag */}
                    {tagLabel && (
                        <div className="mb-6 flex justify-center">
                            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5">
                                <span className="flex h-4 w-4 items-center justify-center text-sky-500">
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        className="h-3.5 w-3.5"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M6 4h12v16H6z"
                                        />
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M9 8h6M9 12h6M9 16h4"
                                        />
                                    </svg>
                                </span>

                                <Text
                                    field={tagLabel}
                                    tag="span"
                                    className="text-[11px] font-medium uppercase tracking-[0.08em] text-sky-600"
                                />
                            </div>
                        </div>
                    )}

                    {/* Heading */}
                    {heading && (
                        <Text
                            field={heading}
                            tag="h2"
                            className="
                text-3xl
                font-bold
                leading-tight
                tracking-[-0.03em]
                text-slate-950
                sm:text-4xl
                md:text-[32px]
                lg:text-[34px]
              "
                        />
                    )}

                    {/* Sub Heading */}
                    {subHeading && (
                        <Text
                            field={subHeading as any}
                            tag="p"
                            className="
                mx-auto
                mt-5
                max-w-[680px]
                text-sm
                leading-6
                text-slate-500
                md:text-[13px]
                md:leading-5
              "
                        />
                    )}
                </div>

                {/* =========================
                    INDUSTRY CARDS
                ========================== */}
                {cards.length > 0 && (
                    <div
                        className="
              grid
              grid-cols-1
              gap-4
              sm:grid-cols-2
              lg:grid-cols-4
            "
                    >
                        {cards.map((card, index) => (
                            <IndustryCardItem
                                key={card.id || card.name || index}
                                card={card}
                            />
                        ))}
                    </div>
                )}

            </div>
        </section>
    );
}

/* ============================================================
   PAGE BUILDER PLACEHOLDER ICONS
============================================================ */

const EMPTY_IMAGE_PLACEHOLDER_SRC =
    'data:image/svg+xml,%3Csvg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 240 240" style="enable-background:new 0 0 240 240;" xml:space="preserve"%3E%3Cstyle type="text/css"%3E .st0%7Bfill:none;%7D .st1%7Bfill:%23969696;%7D .st2%7Bfill:%23FFFFFF;%7D .st3%7Bfill:%23FFFFFF;stroke:%23FFFFFF;stroke-width:0.75;stroke-miterlimit:10;%7D%0A%3C/style%3E%3Cg%3E%3Crect class="st0" width="240" height="240"/%3E%3Cg%3E%3Cg%3E%3Crect x="20" y="20" class="st1" width="200" height="200"/%3E%3C/g%3E%3Cg%3E%3Ccircle class="st2" cx="174" cy="67" r="14"/%3E%3Cpath class="st2" d="M174,54c7.17,0,13,5.83,13,13s-5.83,13-13,13s-13-5.83-13-13S166.83,54,174,54 M174,52 c-8.28,0-15,6.72-15,15s6.72,15,15,15s15-6.72,15-15S182.28,52,174,52L174,52z"/%3E%3C/g%3E%3Cpolyline class="st3" points="29.5,179.25 81.32,122.25 95.41,137.75 137.23,91.75 209.5,179.75 "/%3E%3C/g%3E%3C/g%3E%3C/svg%3E';

const EmptySecurityCardIconPlaceholder: React.FC<any> = ({
    field: _field,
    ...rest
}) => (
    <img
        {...rest}
        suppressContentEditableWarning
        alt="Select icon"
        src={EMPTY_IMAGE_PLACEHOLDER_SRC}
        className={`scEmptyImage industry-grid-empty-image ${rest.className || ""}`}
        style={{
            width: "40px",
            height: "40px",
            maxWidth: "40px",
            maxHeight: "40px",
            minWidth: "0px",
            minHeight: "0px",
            cursor: "pointer",
            objectFit: "contain",
            display: "block",
            margin: "0 auto",
            ...(rest.style || {}),
        }}
    />
);

const EmptyDefaultCardIconPlaceholder: React.FC<any> = ({
    field: _field,
    ...rest
}) => (
    <img
        {...rest}
        suppressContentEditableWarning
        alt="Select icon"
        src={EMPTY_IMAGE_PLACEHOLDER_SRC}
        className={`scEmptyImage industry-default-empty-image ${rest.className || ""}`}
        style={{
            width: "20px",
            height: "20px",
            maxWidth: "20px",
            maxHeight: "20px",
            minWidth: "0px",
            minHeight: "0px",
            cursor: "pointer",
            objectFit: "contain",
            display: "block",
            margin: "0 auto",
            ...(rest.style || {}),
        }}
    />
);

/* ============================================================
   INDUSTRY CARD
============================================================ */

function IndustryCardItem({
    card,
}: {
    card: IndustryCard;
}): JSX.Element {
    const cardFields = card.fields || {};

    const icon =
        cardFields["Card Icon"] ||
        cardFields.cardIcon;

    const title =
        cardFields["Card Title"] ||
        cardFields.cardTitle;

    const description =
        cardFields["Card description"] ||
        cardFields["Card Description"] ||
        cardFields.cardDescription;

    const hasIcon = Boolean(
        icon && (icon.value?.src || (icon as any)?.src || (icon as any)?.metadata || (icon as any)?.editable)
    );

    return (
        <div
            className="
        group
        relative
        flex
        min-h-[186px]
        flex-col
        items-center
        rounded-[16px]
        border
        border-slate-200
        bg-white
        px-6
        py-6
        text-center
        transition-all
        duration-300
        hover:-translate-y-1
        hover:border-[#399BEA]
        hover:bg-[#399BEA]
        hover:shadow-[0_10px_30px_rgba(57,155,234,0.25)]
      "
        >
            {/* =========================
                ICON
            ========================== */}
            {hasIcon && (
                <div
                    className="
            industry-default-card-icon
            mb-5
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-full
            border
            border-slate-200
            bg-white
            shadow-[0_2px_6px_rgba(15,23,42,0.05)]
            transition-all
            duration-300
            group-hover:scale-105
            group-hover:border-transparent
            overflow-hidden
            [&_.scEmptyImage]:!h-5
            [&_.scEmptyImage]:!w-5
            [&_.scEmptyImage]:!max-h-5
            [&_.scEmptyImage]:!max-w-5
            [&_.scEmptyImage]:!min-w-0
            [&_.scEmptyImage]:!min-h-0
          "
                >
                    <JssImage
                        field={icon}
                        emptyFieldEditingComponent={EmptyDefaultCardIconPlaceholder}
                        className="h-5 w-5 object-contain"
                    />
                </div>
            )}

            {/* =========================
                TITLE
            ========================== */}
            {title && (
                <Text
                    field={title}
                    tag="h3"
                    className="
            text-sm
            font-semibold
            leading-5
            text-slate-900
            transition-colors
            duration-300
            group-hover:text-white
          "
                />
            )}

            {/* =========================
                DESCRIPTION
            ========================== */}
            {description && (
                <Text
                    field={description}
                    tag="p"
                    className="
            mt-2
            max-w-[185px]
            text-xs
            leading-[18px]
            text-slate-500
            transition-colors
            duration-300
            group-hover:text-white
          "
                />
            )}
        </div>
    );
}

/* ============================================================
   SECURITY GRID VARIANT (SecurityGrid)
============================================================ */

interface SecurityGridViewProps {
    fields?: IndustryGridFields;
    cards: IndustryCard[];
    tagLabel?: TextField;
    heading?: TextField;
    subHeading?: TextField | RichTextField | any;
    styles?: string;
}

function SecurityGridView({
    fields,
    cards,
    tagLabel,
    heading,
    subHeading,
    styles = "",
}: SecurityGridViewProps): JSX.Element {
    // Extract CTA
    const cta =
        fields?.CTA ||
        fields?.cta ||
        fields?.["Primary CTA"] ||
        fields?.primaryCta;

    // Extract bullet points
    const rawBullets = fields?.["Bullet Points"] || fields?.bulletPoints;
    let bulletItems: string[] = [];
    if (Array.isArray(rawBullets)) {
        bulletItems = rawBullets.map((b) => (typeof b === "string" ? b : b?.value || ""));
    } else if (typeof rawBullets === "string") {
        bulletItems = rawBullets.split("\n").map((s) => s.trim()).filter(Boolean);
    } else if (rawBullets?.value) {
        bulletItems = String(rawBullets.value)
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);
    }

    return (
        <section className={`w-full bg-[#F4F6F8] py-16 md:py-20 lg:py-24 ${styles}`}>
            <div className="mx-auto w-full max-w-[1240px] px-6 md:px-10">
                <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-14 xl:gap-20">

                    {/* =========================
                        LEFT COLUMN (HEADER & CTAS)
                    ========================== */}
                    <div className="flex flex-col items-start text-left lg:col-span-5 xl:col-span-5">

                        {/* Tag Badge */}
                        {tagLabel && (
                            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-200/90 bg-sky-50 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-sky-500">
                                <svg
                                    className="h-3.5 w-3.5 text-[#0099FF]"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    <path d="m9 12 2 2 4-4" />
                                </svg>
                                <Text field={tagLabel} tag="span" />
                            </div>
                        )}

                        {/* Heading */}
                        {heading && (
                            <Text
                                field={heading}
                                tag="h2"
                                className="text-3xl font-bold tracking-[-0.03em] text-slate-900 sm:text-4xl lg:text-[44px] lg:leading-[1.14]"
                            />
                        )}

                        {/* Sub Heading / Description */}
                        {subHeading && (
                            <div className="mt-5 text-sm leading-relaxed text-slate-500 sm:text-[15px]">
                                <RichText field={subHeading as any} />
                            </div>
                        )}

                        {/* Bullet Points */}
                        {bulletItems.length > 0 && (
                            <ul className="mt-6 space-y-3">
                                {bulletItems.map((item, idx) => (
                                    <li
                                        key={idx}
                                        className="flex items-center gap-3 text-sm font-medium text-slate-700 sm:text-[15px]"
                                    >
                                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#0099FF]" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {/* CTA Button */}
                        {(cta?.value?.href || (cta as any)?.metadata) && (
                            <div className="mt-8 sm:mt-10">
                                <JssLink
                                    field={cta as any}
                                    className="inline-flex items-center gap-2 rounded-full bg-[#0099FF] px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0088EE] hover:shadow-md"
                                />
                            </div>
                        )}
                    </div>

                    {/* =========================
                        RIGHT COLUMN (COMPLIANCE CARDS)
                    ========================== */}
                    {cards.length > 0 && (
                        <div className="lg:col-span-7 xl:col-span-7">
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
                                {cards.map((card, index) => (
                                    <SecurityCardItem
                                        key={card.id || card.name || index}
                                        card={card}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </section>
    );
}

/* ============================================================
   SECURITY CARD ITEM
============================================================ */

function SecurityCardItem({
    card,
}: {
    card: IndustryCard;
}): JSX.Element {
    const cardFields = card.fields || {};
    const icon = cardFields["Card Icon"] || cardFields.cardIcon;
    const title = cardFields["Card Title"] || cardFields.cardTitle;
    const description =
        cardFields["Card description"] ||
        cardFields["Card Description"] ||
        cardFields.cardDescription;

    const hasIcon = Boolean(
        icon && (icon.value?.src || (icon as any)?.src || (icon as any)?.metadata || (icon as any)?.editable)
    );

    return (
        <div className="group flex min-h-[190px] sm:min-h-[205px] flex-col items-center justify-center rounded-[24px] border border-slate-100/80 bg-white p-7 sm:p-9 text-center shadow-[0_4px_25px_rgba(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-1 hover:border-slate-200 hover:shadow-[0_14px_35px_rgba(0,0,0,0.06)]">
            {/* Icon Area */}
            {hasIcon && (
                <div className="industry-grid-card-icon mb-4 flex h-12 sm:h-14 w-full items-center justify-center overflow-hidden [&_.scEmptyImage]:!h-10 [&_.scEmptyImage]:!w-10 [&_.scEmptyImage]:!max-h-10 [&_.scEmptyImage]:!max-w-10 [&_.scEmptyImage]:!min-w-0 [&_.scEmptyImage]:!min-h-0">
                    <JssImage
                        field={icon}
                        emptyFieldEditingComponent={EmptySecurityCardIconPlaceholder}
                        className="max-h-12 max-w-[140px] w-auto h-auto object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                </div>
            )}

            {/* Title */}
            {title && (
                <Text
                    field={title}
                    tag="h3"
                    className="text-base font-bold text-slate-900 sm:text-[17px]"
                />
            )}

            {/* Description */}
            {description && (
                <Text
                    field={description}
                    tag="p"
                    className="mt-1.5 text-xs font-normal text-slate-500 sm:text-[13px] leading-relaxed"
                />
            )}
        </div>
    );
}

export const Default = (props: IndustryGridProps) => (
    <IndustryGrid {...props} variant="default" />
);

export const SecurityGrid = (props: IndustryGridProps) => (
    <IndustryGrid {...props} variant="SecurityGrid" />
);

export const DetailedCard = (props: IndustryGridProps) => (
    <IndustryGrid {...props} variant="SecurityGrid" />
);

export default Default;