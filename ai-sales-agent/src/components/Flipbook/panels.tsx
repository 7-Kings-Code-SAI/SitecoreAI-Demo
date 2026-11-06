import React from 'react';
import type { FlipbookPage, FlipbookTocEntry } from './model';

interface ToolbarProps {
  canPrev: boolean;
  canNext: boolean;
  pageIndicator: string;
  showPageNumbers: boolean;
  rightToLeft: boolean;
  activePanel: 'none' | 'toc' | 'thumbs' | 'search';
  onPrev: () => void;
  onNext: () => void;
  onFirst: () => void;
  onLast: () => void;
  onTogglePanel: (panel: 'toc' | 'thumbs' | 'search') => void;
  showToc: boolean;
  showThumbs: boolean;
  showSearch: boolean;
  hasToc: boolean;
}

const btn =
  'px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors';

export const Toolbar: React.FC<ToolbarProps> = ({
  canPrev,
  canNext,
  pageIndicator,
  showPageNumbers,
  rightToLeft,
  activePanel,
  onPrev,
  onNext,
  onFirst,
  onLast,
  onTogglePanel,
  showToc,
  showThumbs,
  showSearch,
  hasToc,
}) => {
  const prev = rightToLeft ? onNext : onPrev;
  const next = rightToLeft ? onPrev : onNext;

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-gray-900/90 text-white">
      <button type="button" className={btn} onClick={onFirst} disabled={!canPrev}>
        « First
      </button>
      <button type="button" className={btn} onClick={prev} disabled={!canPrev}>
        ‹ Prev
      </button>
      <button type="button" className={btn} onClick={next} disabled={!canNext}>
        Next ›
      </button>
      <button type="button" className={btn} onClick={onLast} disabled={!canNext}>
        Last »
      </button>

      {showPageNumbers && (
        <span className="text-sm px-2 text-gray-200">{pageIndicator}</span>
      )}

      <div className="flex-1" />

      {showSearch && (
        <button
          type="button"
          className={`${btn} ${activePanel === 'search' ? 'bg-blue-600 text-white border-blue-600' : ''}`}
          onClick={() => onTogglePanel('search')}
        >
          Search
        </button>
      )}
      {showToc && hasToc && (
        <button
          type="button"
          className={`${btn} ${activePanel === 'toc' ? 'bg-blue-600 text-white border-blue-600' : ''}`}
          onClick={() => onTogglePanel('toc')}
        >
          Contents
        </button>
      )}
      {showThumbs && (
        <button
          type="button"
          className={`${btn} ${activePanel === 'thumbs' ? 'bg-blue-600 text-white border-blue-600' : ''}`}
          onClick={() => onTogglePanel('thumbs')}
        >
          Pages
        </button>
      )}
    </div>
  );
};

interface TocPanelProps {
  toc: FlipbookTocEntry[];
  currentIndex: number;
  onSelect: (targetIndex: number) => void;
  onClose: () => void;
}

export const TocPanel: React.FC<TocPanelProps> = ({
  toc,
  currentIndex,
  onSelect,
  onClose,
}) => (
  <aside className="panel panelLeft">
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
      <h3 className="font-semibold text-gray-900">Table of Contents</h3>
      <button
        type="button"
        onClick={onClose}
        className="text-gray-500 hover:text-gray-900 text-xl leading-none"
        aria-label="Close contents"
      >
        ×
      </button>
    </div>
    <nav className="flex-1 overflow-y-auto py-2">
      {toc.map((entry) => {
        const target = entry.targetIndex ?? -1;
        const active = target === currentIndex;
        return (
          <button
            key={entry.id}
            type="button"
            disabled={target < 0}
            onClick={() => onSelect(target)}
            className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 disabled:opacity-50 ${
              active ? 'bg-blue-100 text-blue-800 font-medium' : 'text-gray-700'
            }`}
          >
            {entry.caption}
          </button>
        );
      })}
    </nav>
  </aside>
);

interface ThumbnailPanelProps {
  pages: FlipbookPage[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}

export const ThumbnailPanel: React.FC<ThumbnailPanelProps> = ({
  pages,
  currentIndex,
  onSelect,
  onClose,
}) => (
  <div className="absolute bottom-14 left-0 right-0 z-20">
    <div className="thumbStrip">
      {pages.map((page) => (
        <button
          key={page.id}
          type="button"
          className={`thumbItem ${page.index === currentIndex ? 'active' : ''}`}
          onClick={() => onSelect(page.index)}
          aria-label={`Go to page ${page.label}`}
        >
          {page.thumb?.src || page.image.src ? (
            <img
              src={page.thumb?.src ?? page.image.src}
              alt={page.image.alt ?? `Page ${page.label}`}
              className="w-full h-auto block"
              loading="lazy"
            />
          ) : (
            <span className="block w-full aspect-[1.4] bg-gray-100 text-[10px] text-gray-400 flex items-center justify-center">
              {page.label}
            </span>
          )}
        </button>
      ))}
    </div>
    <button
      type="button"
      onClick={onClose}
      className="absolute -top-8 right-3 bg-gray-900 text-white text-xs px-2 py-1 rounded"
    >
      Hide pages
    </button>
  </div>
);

export interface SearchResult {
  pageIndex: number;
  label: string;
  snippet: string;
}

interface SearchPanelProps {
  query: string;
  onQueryChange: (q: string) => void;
  results: SearchResult[];
  onSelect: (pageIndex: number) => void;
  onClose: () => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({
  query,
  onQueryChange,
  results,
  onSelect,
  onClose,
}) => (
  <div className="absolute top-14 right-3 z-30 w-80">
    <div className="bg-white border border-gray-200 shadow-lg rounded-md p-3">
      <div className="flex items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search in book…"
          className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
        <button
          type="button"
          onClick={onClose}
          className="text-gray-500 hover:text-gray-900"
          aria-label="Close search"
        >
          ×
        </button>
      </div>
      {query.trim().length > 0 && (
        <div className="searchResults static mt-2 max-h-64 shadow-none border-0">
          {results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-500">No results</p>
          ) : (
            results.map((r) => (
              <button
                key={r.pageIndex}
                type="button"
                onClick={() => onSelect(r.pageIndex)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-0"
              >
                <span className="font-medium text-blue-700">
                  Page {r.label}
                </span>
                <span className="block text-gray-600 truncate">
                  {r.snippet}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  </div>
);
