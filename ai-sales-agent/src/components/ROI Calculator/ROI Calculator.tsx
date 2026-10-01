"use client";

import { useState } from "react";
import {
  Text,
  RichText,
  Link,
  useSitecore,
} from "@sitecore-content-sdk/nextjs";

export const RoiCalculator = (props: any) => {
  const { page } = useSitecore();

  const isEditing = page?.mode?.isEditing;

  const fields = props?.fields ?? {};

  // --------------------------------------------------------------------------
  // Sitecore Fields
  // --------------------------------------------------------------------------

  const badgeLabel = fields["Badge Label"];
  const headingTitle = fields["Heading Title"];
  const description = fields["Description"];
  const footerNote = fields["Footer Note"];

  const leadsLabel = fields["Leads Label"];
  const leadsMin = fields["Leads Min Value"];
  const leadsMax = fields["Leads Max Value"];
  const leadsDefault = fields["Leads Default Value"];
  const leadsStep = fields["Leads Step"];
  const leadsSuffix = fields["Leads Suffix"];

  const rateLabel = fields["Rate Label"];
  const rateMin = fields["Rate Min Value"];
  const rateMax = fields["Rate Max Value"];
  const rateDefault = fields["Rate Default Value"];
  const rateStep = fields["Rate Step"];
  const rateCurrencySymbol = fields["Rate Currency Symbol"];
  const rateSuffix = fields["Rate Suffix"];

  const cardTitle = fields["Card Title"];
  const laborSavedLabel = fields["Labor Saved Label"];
  const costReductionLabel = fields["Cost Reduction Label"];
  const costReductionPercentage =
    fields["Cost Reduction Percentage"];

  const handoffsLabel = fields["Hand-offs Label"];
  const ctaLink = fields["CTA Link"];

  // --------------------------------------------------------------------------
  // Calculation Configuration
  // --------------------------------------------------------------------------

  const savingsMultiplier =
    Number(fields["Savings Per Lead Multiplier"]?.value) || 10;

  const hoursMultiplier =
    Number(fields["Hours Saved Per Lead Multiplier"]?.value) || 20;

  const handoffsRatio =
    Number(fields["Hand-offs Ratio"]?.value) || 30;

  // --------------------------------------------------------------------------
  // Slider Configuration
  // --------------------------------------------------------------------------

  const minLeads =
    Number(leadsMin?.value) || 500;

  const maxLeads =
    Number(leadsMax?.value) || 50000;

  const defaultLeads =
    Number(leadsDefault?.value) || 5000;

  const stepLeads =
    Number(leadsStep?.value) || 500;

  const minRate =
    Number(rateMin?.value) || 15;

  const maxRate =
    Number(rateMax?.value) || 50;

  const defaultRate =
    Number(rateDefault?.value) || 15;

  const stepRate =
    Number(rateStep?.value) || 1;

  const [leads, setLeads] =
    useState<number>(defaultLeads);

  const [rate, setRate] =
    useState<number>(defaultRate);

  // --------------------------------------------------------------------------
  // Calculations
  // --------------------------------------------------------------------------

  const monthlySavings = Math.round(
    leads * rate * (savingsMultiplier / 39)
  );

  const hoursSaved = Math.round(
    leads * hoursMultiplier
  );

  const handoffs = Math.round(
    leads * handoffsRatio
  );

  return (
    <section className="bg-[#f7f9fc] py-16">

      {/* ================================================================== */}
      {/* Header                                                             */}
      {/* ================================================================== */}

      <div className="max-w-[1360px] mx-auto text-center">

        {/* Badge */}
        <div className="mb-7">
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-sky-500">

            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <rect
                x="6"
                y="4"
                width="12"
                height="16"
                rx="2"
                stroke="currentColor"
                strokeWidth="2"
              />

              <path
                d="M9 8h6M9 12h6M9 16h3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>

            <Text field={badgeLabel} />

          </span>
        </div>

        {/* Heading */}
        <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-[#202124] sm:text-4xl">

          <Text field={headingTitle} />

        </h2>

        {/* Description */}
        <div className="mx-auto mt-4 max-w-3xl text-sm leading-6 text-[#667085] sm:text-[15px]">

          <RichText field={description} />

        </div>

      </div>

      {/* ================================================================== */}
      {/* Calculator Card                                                    */}
      {/* ================================================================== */}

      <div className="mx-auto mt-12 max-w-[860px] rounded-[24px] border border-slate-100 bg-white p-7 shadow-[0_10px_35px_rgba(15,23,42,0.04)] sm:p-9 lg:p-8">

        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_360px] lg:gap-8">

          {/* ============================================================ */}
          {/* Left - Sliders                                                */}
          {/* ============================================================ */}

          <div className="space-y-9 px-1 sm:px-2">

            {/* ---------------------------------------------------------- */}
            {/* Leads                                                       */}
            {/* ---------------------------------------------------------- */}

            <div>

              <div className="mb-3 flex items-center justify-between gap-4">

                <label className="text-[13px] font-semibold text-[#344054] sm:text-sm">
                  <Text field={leadsLabel} />
                </label>

                <span className="shrink-0 rounded-full bg-sky-50 px-3 py-1 text-sm font-bold text-sky-500">
                  {leads.toLocaleString()}
                </span>

              </div>

              <input
                type="range"
                min={minLeads}
                max={maxLeads}
                step={stepLeads}
                value={leads}
                disabled={isEditing}
                onChange={(e) =>
                  setLeads(Number(e.target.value))
                }
                className="
                  h-1.5
                  w-full
                  cursor-pointer
                  appearance-none
                  rounded-full
                  bg-slate-100
                  accent-sky-500
                  disabled:cursor-default
                "
              />

              <div className="mt-3 flex justify-between text-[10px] font-medium text-slate-400">

                <span>
                  <Text field={leadsMin} />{" "}
                  <Text field={leadsSuffix} />
                </span>

                <span>
                  <Text field={leadsMax} />{" "}
                  <Text field={leadsSuffix} />
                </span>

              </div>

            </div>

            {/* ---------------------------------------------------------- */}
            {/* Rate                                                        */}
            {/* ---------------------------------------------------------- */}

            <div>

              <div className="mb-3 flex items-center justify-between gap-4">

                <label className="text-[13px] font-semibold text-[#344054] sm:text-sm">
                  <Text field={rateLabel} />
                </label>

                <span className="shrink-0 rounded-full bg-sky-50 px-3 py-1 text-sm font-bold text-sky-500">

                  <Text field={rateCurrencySymbol} />

                  {rate}

                  <Text field={rateSuffix} />

                </span>

              </div>

              <input
                type="range"
                min={minRate}
                max={maxRate}
                step={stepRate}
                value={rate}
                disabled={isEditing}
                onChange={(e) =>
                  setRate(Number(e.target.value))
                }
                className="
                  h-1.5
                  w-full
                  cursor-pointer
                  appearance-none
                  rounded-full
                  bg-slate-100
                  accent-sky-500
                  disabled:cursor-default
                "
              />

              <div className="mt-3 flex justify-between text-[10px] font-medium text-slate-400">

                <span>
                  <Text field={rateCurrencySymbol} />
                  <Text field={rateMin} />
                  <Text field={rateSuffix} />
                </span>

                <span>
                  <Text field={rateCurrencySymbol} />
                  <Text field={rateMax} />
                  <Text field={rateSuffix} />
                </span>

              </div>

            </div>

          </div>

          {/* ============================================================ */}
          {/* Right - Results Card                                          */}
          {/* ============================================================ */}

          <div
            className="
              relative
              overflow-hidden
              rounded-[19px]
              bg-[#17191b]
              p-6
              text-white
              shadow-[0_15px_35px_rgba(15,23,42,0.18)]
              sm:p-7
            "
          >

            {/* Grid Background */}
            <div
              className="
                pointer-events-none
                absolute
                inset-0
                opacity-40
                bg-[linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px)]
                bg-[size:11px_11px]
              "
            />

            {/* Blue glow */}
            <div
              className="
                pointer-events-none
                absolute
                -right-20
                -top-20
                h-48
                w-48
                rounded-full
                bg-sky-500/10
                blur-3xl
              "
            />

            <div className="relative">

              {/* Card Title */}
              <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-sky-400">
                <Text field={cardTitle} />
              </div>

              {/* Savings */}
              <div className="mb-6 flex items-baseline gap-1">

                <span className="text-4xl font-extrabold tracking-tight sm:text-[38px]">

                  <Text field={rateCurrencySymbol} />

                  {monthlySavings.toLocaleString()}

                </span>

                <span className="text-[11px] font-medium text-slate-400">
                  /mo
                </span>

              </div>

              {/* Divider */}
              <div className="border-t border-white/10" />

              {/* -------------------------------------------------------- */}
              {/* Labor Saved                                               */}
              {/* -------------------------------------------------------- */}

              <div className="flex items-center justify-between gap-3 border-b border-white/10 py-3.5">

                <div className="flex items-center gap-3">

                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">

                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-3.5 w-3.5 text-sky-400"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="7"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />

                      <path
                        d="M12 8v4l2.5 2"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>

                  </div>

                  <span className="text-[11px] font-medium text-slate-300">
                    <Text field={laborSavedLabel} />
                  </span>

                </div>

                <span className="whitespace-nowrap text-[12px] font-bold text-white">
                  {hoursSaved.toLocaleString()} Hours
                </span>

              </div>

              {/* -------------------------------------------------------- */}
              {/* Cost Reduction                                            */}
              {/* -------------------------------------------------------- */}

              <div className="flex items-center justify-between gap-3 border-b border-white/10 py-3.5">

                <div className="flex items-center gap-3">

                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">

                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-3.5 w-3.5 text-emerald-400"
                    >
                      <path
                        d="M5 16l5-5 3 3 6-7"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      <path
                        d="M15 7h4v4"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>

                  </div>

                  <span className="text-[11px] font-medium text-slate-300">
                    <Text field={costReductionLabel} />
                  </span>

                </div>

                <span className="whitespace-nowrap rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400">

                  Up to{" "}

                  <Text field={costReductionPercentage} />

                  %

                </span>

              </div>

              {/* -------------------------------------------------------- */}
              {/* Handoffs                                                   */}
              {/* -------------------------------------------------------- */}

              <div className="flex items-center justify-between gap-3 py-3.5">

                <div className="flex items-center gap-3">

                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">

                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-3.5 w-3.5 text-sky-400"
                    >
                      <path
                        d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />

                      <circle
                        cx="12"
                        cy="10"
                        r="2.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />

                    </svg>

                  </div>

                  <span className="text-[11px] font-medium text-slate-300">
                    <Text field={handoffsLabel} />
                  </span>

                </div>

                <span className="whitespace-nowrap text-[12px] font-bold text-white">
                  {handoffs.toLocaleString()} Leads
                </span>

              </div>

              {/* -------------------------------------------------------- */}
              {/* CTA                                                        */}
              {/* -------------------------------------------------------- */}

              <div className="mt-5">

                <Link
                  field={ctaLink}
                  className="
                    flex
                    w-full
                    items-center
                    justify-center
                    rounded-full
                    bg-sky-500
                    px-5
                    py-2.5
                    text-center
                    text-[11px]
                    font-bold
                    text-white
                    transition
                    hover:bg-sky-400
                  "
                />

              </div>

            </div>

          </div>

        </div>

      </div>

      {/* ================================================================== */}
      {/* Footer                                                             */}
      {/* ================================================================== */}

      <div className="mx-auto mt-8 max-w-2xl text-center text-[11px] leading-5 text-slate-500">

        <RichText field={footerNote} />

      </div>

    </section>
  );
};

export default RoiCalculator;