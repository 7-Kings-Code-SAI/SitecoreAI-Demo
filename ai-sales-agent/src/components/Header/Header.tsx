"use client";

import { useState, useEffect, useRef } from "react";
import { LanguageDrawer } from "./LanguageDrawer"; // Adjust the import path if necessary

export default function Header(props: any) {
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const dropdownRef = useRef<HTMLDivElement>(null);

    const data = props?.fields?.data?.data;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setOpenDropdown(null);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );
        };
    }, []);

    if (!data) {
        return null;
    }

    const getField = (name: string) => {
        return data.fields?.find(
            (field: any) => field.name === name
        );
    };

    // Header fields
    const logo = getField("Logo")?.jsonValue?.value;
    const logoLink = getField("Logo Link")?.jsonValue?.value;
    const loginLink = getField("Login Link")?.jsonValue?.value;
    const signUpLink = getField("Sign Up Link")?.jsonValue?.value;
    
    // Fallback support for Layout Service vs GraphQL query structures
    const supportedLanguages = 
        getField("Supported Languages")?.jsonValue || 
        props?.fields?.['Supported Languages'] || 
        [];

    // Navigation items from Sitecore
    const navigationItems =
        data.children?.results?.filter((item: any) => {
            const showInNavigation = item.fields?.find(
                (field: any) =>
                    field.name === "Show in Navigation"
            );

            return showInNavigation?.jsonValue?.value === true;
        }) || [];

    const toggleDropdown = (id: string) => {
        setOpenDropdown((previous) =>
            previous === id ? null : id
        );
    };

    return (
        <header className="w-full border-b border-gray-200 bg-white">
            <div className="mx-auto flex h-16 w-full max-w-7xl items-center px-4 sm:h-[72px] sm:px-6 lg:px-8">

                {/* Logo */}
                <a
                    href={logoLink?.href || "#"}
                    className="flex shrink-0 items-center"
                >
                    {logo?.src && (
                        <img
                            src={logo.src}
                            alt={
                                logo.alt ||
                                data.displayName ||
                                "Logo"
                            }
                            className="h-auto w-24 sm:w-28 lg:w-[130px]"
                        />
                    )}
                </a>

                {/* Desktop Navigation */}
                <nav className="mx-auto hidden h-full items-center gap-5 lg:flex xl:gap-7">
                    {navigationItems.map((item: any) => {
                        const navigationTitle =
                            item.fields?.find(
                                (field: any) =>
                                    field.name ===
                                    "Navigation Title"
                            )?.jsonValue?.value;

                        const link =
                            item.fields?.find(
                                (field: any) =>
                                    field.name === "Link"
                            )?.jsonValue?.value;

                        if (!navigationTitle) {
                            return null;
                        }

                        const children =
                            item.children?.results || [];

                        const hasChildren =
                            children.length > 0;

                        /*
                         * Navigation item with children
                         */
                        if (hasChildren) {
                            const isOpen =
                                openDropdown === item.id;

                            return (
                                <div
                                    key={item.id}
                                    ref={
                                        isOpen
                                            ? dropdownRef
                                            : undefined
                                    }
                                    className="relative flex h-full items-center"
                                    onMouseEnter={() =>
                                        setOpenDropdown(
                                            item.id
                                        )
                                    }
                                    onMouseLeave={() =>
                                        setOpenDropdown(null)
                                    }
                                >
                                    <button
                                        type="button"
                                        onClick={() =>
                                            toggleDropdown(
                                                item.id
                                            )
                                        }
                                        aria-expanded={isOpen}
                                        className={`
                                            flex
                                            items-center
                                            gap-1
                                            whitespace-nowrap
                                            text-sm
                                            font-medium
                                            transition-colors
                                            duration-200
                                            ${
                                                isOpen
                                                    ? "text-gray-900"
                                                    : "text-gray-600"
                                            }
                                            hover:text-gray-900
                                        `}
                                    >
                                        <span>
                                            {navigationTitle}
                                        </span>

                                        <svg
                                            className={`
                                                h-4 w-4
                                                transition-transform
                                                duration-200
                                                ${
                                                    isOpen
                                                        ? "rotate-180"
                                                        : ""
                                                }
                                            `}
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <polyline points="6 9 12 15 18 9" />
                                        </svg>
                                    </button>

                                    {/* Desktop Dropdown */}
                                    {isOpen && (
                                        <div
                                            className="
                                                absolute
                                                right-0
                                                top-full
                                                z-50
                                                w-56
                                                overflow-hidden
                                                rounded-lg
                                                border
                                                border-gray-200
                                                bg-white
                                                py-2
                                                shadow-xl
                                            "
                                        >
                                            {children.map(
                                                (child: any) => {
                                                    const childTitle =
                                                        child.fields?.find(
                                                            (field: any) =>
                                                                field.name ===
                                                                "Navigation Title"
                                                        )?.jsonValue
                                                            ?.value ||
                                                        child.displayName;

                                                    const childLink =
                                                        child.fields?.find(
                                                            (field: any) =>
                                                                field.name ===
                                                                "Link"
                                                        )?.jsonValue
                                                            ?.value;

                                                    if (
                                                        !childTitle
                                                    ) {
                                                        return null;
                                                    }

                                                    return (
                                                        <a
                                                            key={
                                                                child.id
                                                            }
                                                            href={
                                                                childLink?.href ||
                                                                "#"
                                                            }
                                                            className="
                                                                block
                                                                px-4
                                                                py-2.5
                                                                text-sm
                                                                text-gray-600
                                                                transition-colors
                                                                hover:bg-gray-50
                                                                hover:text-gray-900
                                                            "
                                                        >
                                                            {
                                                                childTitle
                                                            }
                                                        </a>
                                                    );
                                                }
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        /*
                         * Normal navigation item
                         */
                        return (
                            <a
                                key={item.id}
                                href={link?.href || "#"}
                                className="
                                    whitespace-nowrap
                                    text-sm
                                    font-medium
                                    text-gray-600
                                    transition-colors
                                    duration-200
                                    hover:text-gray-900
                                "
                            >
                                {navigationTitle}
                            </a>
                        );
                    })}
                </nav>

                {/* Desktop Actions & Utilities */}
                <div className="flex shrink-0 items-center gap-3 ml-auto md:gap-5 lg:ml-10 lg:gap-4">
                    {loginLink && (
                        <a
                            href={loginLink?.href || "#"}
                            className="
                                hidden
                                md:block
                                whitespace-nowrap
                                text-sm
                                font-medium
                                text-gray-600
                                transition-colors
                                hover:text-gray-900
                            "
                        >
                            {loginLink?.text}
                        </a>
                    )}

                    {signUpLink && (
                        <a
                            href={signUpLink?.href || "#"}
                            className="
                                flex
                                h-10
                                shrink-0
                                items-center
                                justify-center
                                rounded-full
                                bg-[#079bea]
                                px-5
                                text-sm
                                font-semibold
                                text-white
                                transition-colors
                                hover:bg-[#078bd3]
                            "
                        >
                            {signUpLink?.text}
                        </a>
                    )}

                    {/* Language Switcher */}
                    <LanguageDrawer regions={supportedLanguages} />
                </div>

                {/* Mobile Menu Button */}
                <button
                    type="button"
                    aria-label="Toggle navigation"
                    aria-expanded={isMobileMenuOpen}
                    onClick={() =>
                        setIsMobileMenuOpen(
                            (previous) => !previous
                        )
                    }
                    className="
                        ml-3
                        md:ml-4
                        flex
                        h-10
                        w-10
                        items-center
                        justify-center
                        rounded-lg
                        text-gray-700
                        transition-colors
                        duration-200
                        hover:bg-gray-100
                        lg:hidden
                    "
                >
                    {/* Animated hamburger → X icon */}
                    <svg
                        className="h-6 w-6"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        {/* Top line: slides up and rotates to first X stroke */}
                        <line
                            x1="3"
                            y1="6"
                            x2="21"
                            y2="6"
                            style={{
                                transformOrigin: "12px 6px",
                                transition:
                                    "transform 0.25s ease, opacity 0.25s ease",
                                transform: isMobileMenuOpen
                                    ? "translateY(6px) rotate(45deg)"
                                    : "none",
                            }}
                        />
                        {/* Middle line: fades out */}
                        <line
                            x1="3"
                            y1="12"
                            x2="21"
                            y2="12"
                            style={{
                                transition:
                                    "opacity 0.15s ease",
                                opacity: isMobileMenuOpen ? 0 : 1,
                            }}
                        />
                        {/* Bottom line: slides up and rotates to second X stroke */}
                        <line
                            x1="3"
                            y1="18"
                            x2="21"
                            y2="18"
                            style={{
                                transformOrigin: "12px 18px",
                                transition:
                                    "transform 0.25s ease, opacity 0.25s ease",
                                transform: isMobileMenuOpen
                                    ? "translateY(-6px) rotate(-45deg)"
                                    : "none",
                            }}
                        />
                    </svg>
                </button>
            </div>

            {/* Mobile Navigation — always mounted, animated with max-height + opacity */}
            <div
                className="overflow-hidden border-gray-200 bg-white lg:hidden"
                style={{
                    borderTopWidth: isMobileMenuOpen ? "1px" : "0px",
                    maxHeight: isMobileMenuOpen ? "100vh" : "0px",
                    opacity: isMobileMenuOpen ? 1 : 0,
                    transition:
                        "max-height 0.35s ease, opacity 0.3s ease, border-top-width 0.35s ease",
                }}
                aria-hidden={!isMobileMenuOpen}
            >
                <nav className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
                    <div className="flex flex-col">
                        {navigationItems.map(
                            (item: any) => {
                                const navigationTitle =
                                    item.fields?.find(
                                        (field: any) =>
                                            field.name ===
                                            "Navigation Title"
                                    )?.jsonValue?.value;

                                const link =
                                    item.fields?.find(
                                        (field: any) =>
                                            field.name ===
                                            "Link"
                                    )?.jsonValue?.value;

                                if (
                                    !navigationTitle
                                ) {
                                    return null;
                                }

                                const children =
                                    item.children?.results ||
                                    [];

                                const hasChildren =
                                    children.length > 0;

                                if (hasChildren) {
                                    const isOpen =
                                        openDropdown ===
                                        item.id;

                                    return (
                                        <div
                                            key={item.id}
                                            className="border-b border-gray-100 last:border-0"
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    toggleDropdown(
                                                        item.id
                                                    )
                                                }
                                                className="
                                                    flex
                                                    w-full
                                                    items-center
                                                    justify-between
                                                    py-4
                                                    text-left
                                                    text-sm
                                                    font-medium
                                                    text-gray-700
                                                    transition-colors
                                                    duration-150
                                                    hover:text-gray-900
                                                "
                                            >
                                                <span>
                                                    {
                                                        navigationTitle
                                                    }
                                                </span>

                                                <svg
                                                    className={`
                                                        h-4 w-4
                                                        transition-transform
                                                        duration-200
                                                        ${
                                                            isOpen
                                                                ? "rotate-180"
                                                                : ""
                                                        }
                                                    `}
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <polyline points="6 9 12 15 18 9" />
                                                </svg>
                                            </button>

                                            {/* Sub-items: slide in with max-height */}
                                            <div
                                                style={{
                                                    maxHeight: isOpen
                                                        ? "500px"
                                                        : "0px",
                                                    overflow: "hidden",
                                                    transition:
                                                        "max-height 0.3s ease",
                                                }}
                                            >
                                                <div className="pb-3 pl-4">
                                                    {children.map(
                                                        (
                                                            child: any
                                                        ) => {
                                                            const childTitle =
                                                                child.fields?.find(
                                                                    (
                                                                        field: any
                                                                    ) =>
                                                                        field.name ===
                                                                        "Navigation Title"
                                                                )
                                                                    ?.jsonValue
                                                                    ?.value ||
                                                                child.displayName;

                                                            const childLink =
                                                                child.fields?.find(
                                                                    (
                                                                        field: any
                                                                    ) =>
                                                                        field.name ===
                                                                        "Link"
                                                                )
                                                                    ?.jsonValue
                                                                    ?.value;

                                                            if (
                                                                !childTitle
                                                            ) {
                                                                return null;
                                                            }

                                                            return (
                                                                <a
                                                                    key={
                                                                        child.id
                                                                    }
                                                                    href={
                                                                        childLink?.href ||
                                                                        "#"
                                                                    }
                                                                    className="
                                                                        block
                                                                        py-2.5
                                                                        text-sm
                                                                        text-gray-500
                                                                        transition-colors
                                                                        duration-150
                                                                        hover:text-gray-900
                                                                    "
                                                                >
                                                                    {
                                                                        childTitle
                                                                    }
                                                                </a>
                                                            );
                                                        }
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <a
                                        key={item.id}
                                        href={
                                            link?.href ||
                                            "#"
                                        }
                                        className="
                                            border-b
                                            border-gray-100
                                            py-4
                                            text-sm
                                            font-medium
                                            text-gray-700
                                            last:border-0
                                            transition-colors
                                            duration-150
                                            hover:text-gray-900
                                        "
                                    >
                                        {
                                            navigationTitle
                                        }
                                    </a>
                                );
                            }
                        )}

                        {/* Mobile Actions */}
                        <div className="mt-4 flex flex-col gap-3 border-t border-gray-200 pt-4 md:hidden">
                            {loginLink && (
                                <a
                                    href={
                                        loginLink?.href ||
                                        "#"
                                    }
                                    className="
                                        py-2
                                        text-sm
                                        font-medium
                                        text-gray-700
                                        transition-colors
                                        duration-150
                                        hover:text-gray-900
                                    "
                                >
                                    {loginLink?.text}
                                </a>
                            )}

                            {signUpLink && (
                                <a
                                    href={
                                        signUpLink?.href ||
                                        "#"
                                    }
                                    className="
                                        flex
                                        h-11
                                        items-center
                                        justify-center
                                        rounded-full
                                        bg-[#079bea]
                                        px-5
                                        text-sm
                                        font-semibold
                                        text-white
                                        transition-colors
                                        duration-150
                                        hover:bg-[#078bd3]
                                    "
                                >
                                    {signUpLink?.text}
                                </a>
                            )}
                        </div>
                    </div>
                </nav>
            </div>
        </header>
    );
}