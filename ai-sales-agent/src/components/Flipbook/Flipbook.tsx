'use client';

import React, { useMemo } from 'react';
import { useSitecore } from '@sitecore-content-sdk/nextjs';
import { normalizeFlipbook } from './model';
import { FlipbookViewer } from './FlipbookViewer';
import type { FlipbookProps } from './Flipbook.props';

/**
 * Flipbook — a Sitecore rendering that renders a flipbook viewer.
 *
 * The datasource is a "Flipbook" item whose `Pages` multilist contains
 * "Flipbook Page" items (each with an image, optional thumbnail, search
 * text, and a `Hotspots` multilist) and whose `Table Of Contents` multilist
 * contains TOC entries pointing at those pages.
 */
export const Flipbook: React.FC<FlipbookProps> = (props) => {
  const { fields, params } = props;
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;

  const model = useMemo(() => normalizeFlipbook(fields), [fields]);

  const rawTitle = model.settings.title;
  const rawDescription = model.settings.description;

  if (model.pages.length === 0 && !isEditing) {
    return null;
  }

  return (
    <section
      className={`flipbook ${params?.styles ?? ''}`}
      aria-label={rawTitle ?? 'Flipbook'}
    >
      {(rawTitle || rawDescription || isEditing) && (
        <header className="sr-only">
          {rawTitle && <h2>{rawTitle}</h2>}
          {rawDescription && <p>{rawDescription}</p>}
        </header>
      )}

      {model.pages.length === 0 ? (
        <div className="p-8 text-center text-gray-500 border border-dashed border-gray-300 rounded">
          Flipbook has no pages. Add "Flipbook Page" items to the Pages field.
        </div>
      ) : (
        <FlipbookViewer model={model} />
      )}
    </section>
  );
};
