'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  FlipbookHotspot,
  FlipbookModel,
  FlipbookPage,
} from './model';
import styles from './Flipbook.module.css';
import {
  SearchPanel,
  ThumbnailPanel,
  TocPanel,
  Toolbar,
  type SearchResult,
} from './panels';
import { PopupHost, type PopupState } from './popups';

type Panel = 'none' | 'toc' | 'thumbs' | 'search';

interface TurnState {
  dir: 1 | -1;
  /** Target spread index (flip mode) the book is animating toward. */
  to: number;
}

const TURN_MS = 680;

const readPageFromHash = (): number => {
  if (typeof window === 'undefined') return 0;
  const hash = window.location.hash || '';
  const hashMatch = hash.match(/[#&]p=(\d+)/);
  if (hashMatch) return Math.max(0, parseInt(hashMatch[1], 10) - 1);
  const params = new URLSearchParams(window.location.search);
  const q = params.get('p');
  return q ? Math.max(0, parseInt(q, 10) - 1) : 0;
};

const writePageToHash = (pageNumber: number) => {
  if (typeof window === 'undefined') return;
  const hash = `#p=${pageNumber}`;
  if (window.location.hash !== hash) {
    window.history.replaceState(null, '', hash);
  }
};

interface PageImageProps {
  page: FlipbookPage;
  aspectRatio: number;
  interactive?: boolean;
  onHotspot: (hotspot: FlipbookHotspot) => void;
}

const PageImage: React.FC<PageImageProps> = ({
  page,
  aspectRatio,
  interactive = true,
  onHotspot,
}) => (
  <div
    className="absolute inset-0"
    style={{ aspectRatio: `${aspectRatio}` }}
  >
    {page.image.src ? (
      <img
        src={page.image.src}
        alt={page.image.alt ?? `Page ${page.label}`}
        className="absolute inset-0 w-full h-full object-contain bg-white"
        draggable={false}
      />
    ) : (
      <div className="absolute inset-0 bg-white flex items-center justify-center text-gray-300 text-sm">
        Page {page.label}
      </div>
    )}

    {interactive &&
      page.hotspots.map((hotspot) => (
        <button
          key={hotspot.id}
          type="button"
          className={styles.hotspot}
          style={{
            left: `${hotspot.rect.left}%`,
            top: `${hotspot.rect.top}%`,
            width: `${hotspot.rect.width}%`,
            height: `${hotspot.rect.height}%`,
          }}
          aria-label={hotspot.label ?? 'Link'}
          onClick={() => onHotspot(hotspot)}
        />
      ))}
  </div>
);

export const FlipbookViewer: React.FC<{ model: FlipbookModel }> = ({
  model,
}) => {
  const { settings, pages, toc } = model;
  const aspectRatio = settings.pageWidth / settings.pageHeight;

  const isFlip = settings.flipStyle === 'flip';
  const isSlide = settings.flipStyle === 'slide';

  // For flip mode the unit of navigation is a spread (two faces).
  const spreadCount = isFlip ? Math.ceil(pages.length / 2) : pages.length;

  const [spread, setSpread] = useState(0);
  const [turn, setTurn] = useState<TurnState | null>(null);
  const [panel, setPanel] = useState<Panel>('none');
  const [query, setQuery] = useState('');
  const [popup, setPopup] = useState<PopupState | null>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const turnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clampSpread = useCallback(
    (s: number) => Math.min(Math.max(s, 0), Math.max(spreadCount - 1, 0)),
    [spreadCount]
  );

  const currentPageIndex = isFlip
    ? Math.min(spread * 2, Math.max(pages.length - 1, 0))
    : Math.min(spread, Math.max(pages.length - 1, 0));

  const goToPageIndex = useCallback(
    (pageIndex: number) => {
      const idx = Math.min(Math.max(pageIndex, 0), pages.length - 1);
      if (pages.length === 0) return;
      if (isFlip) {
        setSpread(clampSpread(Math.floor(idx / 2)));
      } else {
        setSpread(idx);
      }
      writePageToHash(idx + 1);
    },
    [isFlip, pages.length, clampSpread]
  );

  const goToSpread = useCallback(
    (target: number, dir?: 1 | -1) => {
      const clamped = clampSpread(target);
      if (clamped === spread && !turn) return;
      const direction = dir ?? (clamped > spread ? 1 : -1);
      if (isFlip && clamped !== spread) {
        setTurn({ dir: direction, to: clamped });
        if (turnTimer.current) clearTimeout(turnTimer.current);
        turnTimer.current = setTimeout(() => {
          setSpread(clamped);
          setTurn(null);
        }, TURN_MS);
        // Hash tracks the first visible page of the target spread.
        writePageToHash(clamped * 2 + 1);
      } else {
        setSpread(clamped);
        writePageToHash(isFlip ? clamped * 2 + 1 : clamped + 1);
      }
    },
    [clampSpread, isFlip, spread, turn]
  );

  const goPrev = useCallback(() => {
    if (turn) return;
    if (isFlip) goToSpread(spread - 1, -1);
    else goToPageIndex(spread - 1);
  }, [isFlip, spread, turn, goToSpread, goToPageIndex]);

  const goNext = useCallback(() => {
    if (turn) return;
    if (isFlip) goToSpread(spread + 1, 1);
    else goToPageIndex(spread + 1);
  }, [isFlip, spread, turn, goToSpread, goToPageIndex]);

  const goFirst = useCallback(() => {
    if (isFlip) goToSpread(0);
    else goToPageIndex(0);
  }, [isFlip, goToSpread, goToPageIndex]);

  const goLast = useCallback(() => {
    if (isFlip) goToSpread(spreadCount - 1);
    else goToPageIndex(pages.length - 1);
  }, [isFlip, spreadCount, pages.length, goToSpread, goToPageIndex]);

  // Deep-link: restore page from #p= / ?p= on mount.
  useEffect(() => {
    const idx = readPageFromHash();
    if (idx > 0 && pages.length > 0) {
      if (isFlip) setSpread(clampSpread(Math.floor(idx / 2)));
      else setSpread(Math.min(idx, pages.length - 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (popup) return;
      if (e.key === 'ArrowRight') settings.rightToLeft ? goPrev() : goNext();
      else if (e.key === 'ArrowLeft') settings.rightToLeft ? goNext() : goPrev();
      else if (e.key === 'Home') goFirst();
      else if (e.key === 'End') goLast();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, goFirst, goLast, popup, settings.rightToLeft]);

  // Touch swipe.
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (settings.flipStyle === 'scroll') return;
    if (settings.rightToLeft) {
      dx > 0 ? goNext() : goPrev();
    } else {
      dx < 0 ? goNext() : goPrev();
    }
  };

  // Auto play.
  useEffect(() => {
    if (!settings.autoPlay || pages.length < 2) return;
    const id = setInterval(() => {
      setSpread((s) => {
        if (s >= spreadCount - 1) return 0;
        return s + 1;
      });
      setTurn(null);
    }, settings.autoPlayInterval * 1000);
    return () => clearInterval(id);
  }, [settings.autoPlay, settings.autoPlayInterval, spreadCount, pages.length]);

  // Search.
  const searchResults = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return pages
      .map((page, i) => {
        const haystack = `${page.label} ${page.searchText ?? ''} ${page.image.alt ?? ''}`.toLowerCase();
        const pos = haystack.indexOf(q);
        if (pos < 0) return null;
        const source = `${page.label} ${page.searchText ?? ''} ${page.image.alt ?? ''}`;
        const start = Math.max(0, pos - 30);
        return {
          pageIndex: i,
          label: page.label,
          snippet: `…${source.slice(start, start + 90)}…`,
        };
      })
      .filter((r): r is SearchResult => r !== null)
      .slice(0, 30);
  }, [query, pages]);

  const handleHotspot = useCallback(
    (hotspot: FlipbookHotspot) => {
      switch (hotspot.type) {
        case 'internalPage':
          if (hotspot.targetIndex !== undefined && hotspot.targetIndex >= 0) {
            goToPageIndex(hotspot.targetIndex);
          } else if (hotspot.targetPageId) {
            // Fallback: try resolving by page label/id later; no-op for now.
          }
          break;
        case 'externalLink':
        case 'popupImage':
        case 'popupVideo':
        case 'iframe':
        case 'audio':
          if (hotspot.url || hotspot.popupImage?.src) {
            setPopup({ hotspot });
          }
          break;
        default:
          break;
      }
    },
    [goToPageIndex]
  );

  const handleTocSelect = useCallback(
    (targetIndex: number) => {
      if (targetIndex >= 0) {
        goToPageIndex(targetIndex);
        setPanel('none');
      }
    },
    [goToPageIndex]
  );

  const togglePanel = (p: 'toc' | 'thumbs' | 'search') =>
    setPanel((cur) => (cur === p ? 'none' : p));

  /* ---------------- render helpers ---------------- */

  const pageIndicator = useMemo(() => {
    if (pages.length === 0) return '';
    if (isFlip) {
      const left = spread * 2;
      const right = Math.min(left + 1, pages.length - 1);
      const leftLabel = pages[left]?.label ?? String(left + 1);
      const rightLabel = pages[right]?.label ?? leftLabel;
      return right > left
        ? `${leftLabel}–${rightLabel} / ${pages.length}`
        : `${leftLabel} / ${pages.length}`;
    }
    return `${pages[spread]?.label ?? spread + 1} / ${pages.length}`;
  }, [isFlip, spread, pages]);

  const renderFlipView = () => {
    if (pages.length === 0) return null;

    // During a turn, render the TARGET spread beneath and animate a leaf
    // showing the outgoing page (front) / incoming page (back).
    const shownSpread = turn ? turn.to : spread;
    const leaf = turn
      ? turn.dir === 1
        ? {
            front: pages[spread * 2 + 1], // current right page
            back: pages[turn.to * 2], // next spread's left page
          }
        : {
            front: pages[spread * 2], // current left page
            back: pages[turn.to * 2 + 1], // previous spread's right page
          }
      : null;

    return (
      <div className={styles.book} ref={bookRef}>
        <div
          className={styles.spread}
          style={{ height: '100%' }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {renderSpreadContent(shownSpread)}
        </div>

        {leaf?.front && (
          <div
            className={`${styles.leaf} ${turn!.dir === 1 ? styles.next : styles.prev} ${
              styles.flipped
            }`}
          >
            <div className={styles.leafFace}>
              <PageImage
                page={leaf.front}
                aspectRatio={aspectRatio}
                interactive={false}
                onHotspot={() => undefined}
              />
            </div>
            <div className={`${styles.leafFace} ${styles.back}`}>
              {leaf.back && (
                <PageImage
                  page={leaf.back}
                  aspectRatio={aspectRatio}
                  interactive={false}
                  onHotspot={() => undefined}
                />
              )}
            </div>
            <div className={`${styles.leafShadow} ${turn!.dir === 1 ? styles.next : styles.prev}`} />
          </div>
        )}
      </div>
    );
  };

  const renderSpreadContent = (s: number) => {
    const left = pages[s * 2];
    const right = pages[s * 2 + 1];
    const single = !left || !right;
    return (
      <>
        {left && (
          <div className={`${styles.pageSlot} ${single ? styles.single : ''}`}>
            <PageImage
              page={left}
              aspectRatio={aspectRatio}
              onHotspot={handleHotspot}
            />
          </div>
        )}
        {right && (
          <div className={styles.pageSlot}>
            <PageImage
              page={right}
              aspectRatio={aspectRatio}
              onHotspot={handleHotspot}
            />
          </div>
        )}
      </>
    );
  };

  const renderSlideView = () => (
    <div
      className="overflow-hidden h-full"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        className={styles.slideTrack}
        style={{
          transform: settings.rightToLeft
            ? `translateX(${spread * 100}%)`
            : `translateX(-${spread * 100}%)`,
        }}
      >
        {pages.map((page) => (
          <div key={page.id} className={styles.slidePage}>
            <PageImage
              page={page}
              aspectRatio={aspectRatio}
              onHotspot={handleHotspot}
            />
          </div>
        ))}
      </div>
    </div>
  );

  // Scroll mode: keep the active page in view when spread changes.
  useEffect(() => {
    if (settings.flipStyle === 'scroll' && scrollRef.current) {
      const el = scrollRef.current.children[spread] as HTMLElement | undefined;
      el?.scrollIntoView({ block: 'start' });
    }
  }, [spread, settings.flipStyle]);

  const renderScrollView = () => {
    return (
      <div ref={scrollRef} className={styles.scrollStack}>
        {pages.map((page) => (
          <div
            key={page.id}
            className={styles.scrollPage}
            style={{ maxWidth: `${Math.min(90, 100)}%` }}
          >
            <PageImage
              page={page}
              aspectRatio={aspectRatio}
              onHotspot={handleHotspot}
            />
          </div>
        ))}
      </div>
    );
  };

  if (pages.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        This flipbook has no pages yet.
      </div>
    );
  }

  return (
    <div
      className="relative w-full select-none"
      style={{ backgroundColor: settings.backgroundColor }}
    >
      {settings.showToolbar && (
        <Toolbar
          canPrev={spread > 0}
          canNext={spread < spreadCount - 1}
          pageIndicator={pageIndicator}
          showPageNumbers={settings.showPageNumbers}
          rightToLeft={settings.rightToLeft}
          activePanel={panel}
          onPrev={goPrev}
          onNext={goNext}
          onFirst={goFirst}
          onLast={goLast}
          onTogglePanel={togglePanel}
          showToc={settings.showTableOfContents}
          showThumbs={settings.showThumbnails}
          showSearch={settings.showSearch}
          hasToc={toc.length > 0}
        />
      )}

      <div className="relative" style={{ height: '70vh', minHeight: 420 }}>
        {isFlip && renderFlipView()}
        {isSlide && renderSlideView()}
        {!isFlip && !isSlide && renderScrollView()}

        {panel === 'toc' && (
          <TocPanel
            toc={toc}
            currentIndex={currentPageIndex}
            onSelect={handleTocSelect}
            onClose={() => setPanel('none')}
          />
        )}

        {settings.showSearch && panel === 'search' && (
          <SearchPanel
            query={query}
            onQueryChange={setQuery}
            results={searchResults}
            onSelect={(i) => {
              goToPageIndex(i);
              setPanel('none');
            }}
            onClose={() => setPanel('none')}
          />
        )}
      </div>

      {settings.showThumbnails && panel === 'thumbs' && (
        <ThumbnailPanel
          pages={pages}
          currentIndex={currentPageIndex}
          onSelect={(i) => {
            goToPageIndex(i);
            setPanel('none');
          }}
          onClose={() => setPanel('none')}
        />
      )}

      <PopupHost popup={popup} onClose={() => setPopup(null)} />
    </div>
  );
};
