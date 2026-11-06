import React, { useEffect } from 'react';
import type { FlipbookHotspot } from './model';
import styles from './Flipbook.module.css';

export interface PopupState {
  hotspot: FlipbookHotspot;
}

interface PopupHostProps {
  popup: PopupState | null;
  onClose: () => void;
}

const YOUTUBE_RE = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/;
const VIMEO_RE = /vimeo\.com\/(\d+)/;

const toEmbedUrl = (url: string): { type: 'youtube' | 'vimeo'; embed: string } | null => {
  const yt = url.match(YOUTUBE_RE);
  if (yt) return { type: 'youtube', embed: `https://www.youtube.com/embed/${yt[1]}` };
  const vm = url.match(VIMEO_RE);
  if (vm) return { type: 'vimeo', embed: `https://player.vimeo.com/video/${vm[1]}` };
  return null;
};

export const PopupHost: React.FC<PopupHostProps> = ({ popup, onClose }) => {
  useEffect(() => {
    if (!popup) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [popup, onClose]);

  if (!popup) return null;

  const { hotspot } = popup;
  const url = hotspot.url ?? '';

  const renderBody = () => {
    switch (hotspot.type) {
      case 'popupImage':
        return hotspot.popupImage?.src ? (
          <img
            src={hotspot.popupImage.src}
            alt={hotspot.popupImage.alt ?? hotspot.label ?? 'Popup'}
            className="max-w-full max-h-[80vh] object-contain"
          />
        ) : null;

      case 'popupVideo': {
        const embed = toEmbedUrl(url);
        if (embed) {
          return (
            <div className="w-[min(800px,80vw)] aspect-video">
              <iframe
                src={embed.embed}
                title={hotspot.label ?? 'Video'}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          );
        }
        return url ? (
          <video src={url} controls className="max-w-full max-h-[80vh]" />
        ) : null;
      }

      case 'iframe':
        return url ? (
          <iframe
            src={url}
            title={hotspot.label ?? 'Embedded content'}
            className="w-[min(900px,85vw)] h-[70vh] border-0"
            allowFullScreen
          />
        ) : null;

      case 'audio':
        return url ? (
          <audio src={url} controls autoPlay className="w-80" />
        ) : null;

      case 'externalLink':
        return (
          <div className="p-6 text-center">
            <p className="mb-4 text-gray-700">
              {hotspot.label ?? 'Open external link?'}
            </p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Open link
            </a>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={styles.popupOverlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className={styles.popupContent} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={styles.popupClose}
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        {renderBody()}
      </div>
    </div>
  );
};
