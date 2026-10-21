'use client';

import React from 'react';
import { Placeholder } from '@sitecore-content-sdk/nextjs';
import { ColumnSplitterProps } from './ColumnSplitter.props';

// --- Helper: Safely parses a width string (e.g. "40%", "40", "40.5") into a valid number ---
const parsePercentage = (value?: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const raw =
    typeof value === 'object' && value !== null && 'value' in value
      ? String((value as { value?: unknown }).value || '')
      : String(value);

  const cleaned = raw.replace('%', '').trim();
  if (!cleaned) return null;
  const num = parseFloat(cleaned);
  return isNaN(num) || num <= 0 ? null : Math.min(Math.max(num, 10), 90);
};

const ColumnSplitterLayout: React.FC<ColumnSplitterProps> = ({
  rendering,
  params,
  fields,
}) => {
  // Extract datasource fields or raw fields
  const dsFields: any =
    (fields as any)?.data?.datasource?.fields ||
    (fields as any)?.fields ||
    fields ||
    {};

  // Extract author-defined widths from fields or params
  const rawLeft =
    dsFields?.['Left Column Width'] ??
    dsFields?.LeftColumnWidth ??
    dsFields?.leftColumnWidth ??
    params?.LeftColumnWidth ??
    params?.leftColumnWidth ??
    params?.['Left Column Width'];

  const rawRight =
    dsFields?.['Right Column Width'] ??
    dsFields?.RightColumnWidth ??
    dsFields?.rightColumnWidth ??
    params?.RightColumnWidth ??
    params?.rightColumnWidth ??
    params?.['Right Column Width'];

  const parsedLeft = parsePercentage(rawLeft);
  const parsedRight = parsePercentage(rawRight);

  let leftPercentage = 38;
  let rightPercentage = 62;

  if (parsedLeft !== null && parsedRight !== null) {
    leftPercentage = parsedLeft;
    rightPercentage = parsedRight;
  } else if (parsedLeft !== null) {
    leftPercentage = parsedLeft;
    rightPercentage = Math.round((100 - parsedLeft) * 100) / 100;
  } else if (parsedRight !== null) {
    rightPercentage = parsedRight;
    leftPercentage = Math.round((100 - parsedRight) * 100) / 100;
  }

  const dynamicPlaceholderId =
    params?.DynamicPlaceholderId ||
    rendering?.params?.DynamicPlaceholderId ||
    '';

  // Support SXA EnabledPlaceholders parameter (e.g., "1,2")
  const enabledPlaceholders = params?.EnabledPlaceholders
    ? params.EnabledPlaceholders.split(',').map((p) => p.trim())
    : ['1', '2'];

  const col1 = enabledPlaceholders[0] || '1';
  const col2 = enabledPlaceholders[1] || '2';

  // Extract all placeholders returned by Sitecore in layout data
  const rawExisting = Object.keys(rendering?.placeholders || {});
  const existingPlaceholders = rawExisting.flatMap((k) =>
    k.includes(',') || k.includes('|') ? k.split(/[,|]/).map((s) => s.trim()) : [k]
  );

  let placeholderColumn1 = '';
  let placeholderColumn2 = '';

  // 1. If Sitecore returned 2 or more placeholders, assign them directly to each column
  if (existingPlaceholders.length >= 2) {
    placeholderColumn1 = existingPlaceholders[0];
    placeholderColumn2 = existingPlaceholders[1];
  } else if (existingPlaceholders.length === 1) {
    // 2. If Sitecore only returned 1 key, derive the matching second key
    const single = existingPlaceholders[0];
    const isWildcard = single.includes('{*}');

    if (single.toLowerCase().includes('column-1') || single.toLowerCase().includes('column1')) {
      placeholderColumn1 = single;
      placeholderColumn2 = isWildcard ? 'column-2-{*}' : 'column-2';
    } else if (single.toLowerCase().includes('container-content-1')) {
      placeholderColumn1 = single;
      placeholderColumn2 = isWildcard ? 'container-content-2-{*}' : 'container-content-2';
    } else if (single.toLowerCase().includes('container-1')) {
      placeholderColumn1 = single;
      placeholderColumn2 = isWildcard ? 'container-2-{*}' : 'container-2';
    } else {
      placeholderColumn1 = single;
      placeholderColumn2 = isWildcard ? `container-content-${col2}-{*}` : `container-content-${col2}`;
    }
  } else {
    // 3. Fallback when layout data has no placeholders yet
    placeholderColumn1 = dynamicPlaceholderId
      ? `container-content-${col1}-${dynamicPlaceholderId}`
      : `container-content-${col1}`;
    placeholderColumn2 = dynamicPlaceholderId
      ? `container-content-${col2}-${dynamicPlaceholderId}`
      : `container-content-${col2}`;
  }

  // Ensure both placeholders exist in rendering.placeholders so Pages generates chromes for both
  const safeRendering = {
    ...rendering,
    placeholders: {
      ...(rendering?.placeholders || {}),
    },
  };

  if (!safeRendering.placeholders[placeholderColumn1]) {
    safeRendering.placeholders[placeholderColumn1] = [];
  }
  if (!safeRendering.placeholders[placeholderColumn2]) {
    safeRendering.placeholders[placeholderColumn2] = [];
  }

  // Column widths exposed as CSS variables.
  // --left-col-width is also read by common.css to position the "Back to home"
  // link at the top-left of the right column.
  const widthVars = {
    '--left-col-width': `${leftPercentage}%`,
    '--right-col-width': `${rightPercentage}%`,
  } as React.CSSProperties;

  return (
    <div
      className="column-splitter w-full min-h-screen h-full m-0 p-0 overflow-x-hidden"
      style={widthVars}
    >
      {/* Asymmetrical split: author-defined widths on md+ screens, stacked full width on mobile */}
      <div className="flex flex-col md:flex-row w-full min-h-screen h-full m-0 p-0 gap-0 items-stretch">
        {/* Column 1 (Left) */}
        <div className="relative w-full md:w-[var(--left-col-width)] md:basis-[var(--left-col-width)] min-h-screen h-full flex flex-col justify-center items-center m-0 p-0 overflow-hidden shrink-0">
          <Placeholder
            name={placeholderColumn1}
            rendering={safeRendering as any}
          />
        </div>

        {/* Column 2 (Right) */}
        <div className="w-full md:w-[var(--right-col-width)] md:basis-[var(--right-col-width)] min-w-0 min-h-screen flex flex-col justify-center m-0 p-0 overflow-hidden flex-1">
          <Placeholder
            name={placeholderColumn2}
            rendering={safeRendering as any}
          />
        </div>
      </div>
    </div>
  );
};

export const Default = ColumnSplitterLayout;
export default ColumnSplitterLayout;