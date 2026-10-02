"use client";

import { JSX, useMemo, useRef, useState, useCallback, useEffect } from "react";
import { Field, TextField, LinkField } from "@sitecore-content-sdk/nextjs";
import { ComponentProps } from "lib/component-props";

export interface VideoPlayerFields {
  "Video URL"?: LinkField | TextField | Field<string> | string;
  "Shade Color"?: TextField | Field<string> | string;
  [key: string]: unknown;
}

export interface VideoPlayerProps extends Partial<ComponentProps> {
  fields?: VideoPlayerFields | any;
  rendering?: any;
  params?: any;
}

const resolveField = (fieldsObj: any, ...keys: string[]) => {
  if (!fieldsObj) return undefined;

  if (Array.isArray(fieldsObj)) {
    for (const key of keys) {
      const found = fieldsObj.find(
        (f: any) =>
          f?.name?.toLowerCase() === key.toLowerCase() ||
          f?.displayName?.toLowerCase() === key.toLowerCase()
      );

      if (found) {
        return found.jsonValue ?? found.value ?? found;
      }
    }
  }

  for (const key of keys) {
    if (fieldsObj[key] !== undefined) {
      const val = fieldsObj[key];
      return val?.jsonValue ?? val;
    }

    const matchKey = Object.keys(fieldsObj).find(
      (k) => k.toLowerCase() === key.toLowerCase()
    );

    if (matchKey && fieldsObj[matchKey] !== undefined) {
      const val = fieldsObj[matchKey];
      return val?.jsonValue ?? val;
    }
  }

  return undefined;
};

const extractStringValue = (field: any): string => {
  if (!field) return "";

  if (typeof field === "string") return field.trim();

  if (typeof field?.value === "string") {
    return field.value.trim();
  }

  if (typeof field?.value?.href === "string") {
    return field.value.href.trim();
  }

  if (typeof field?.value?.url === "string") {
    return field.value.url.trim();
  }

  if (typeof field?.value?.src === "string") {
    return field.value.src.trim();
  }

  if (typeof field?.href === "string") {
    return field.href.trim();
  }

  if (typeof field?.url === "string") {
    return field.url.trim();
  }

  if (typeof field?.src === "string") {
    return field.src.trim();
  }

  if (typeof field?.jsonValue?.value === "string") {
    return field.jsonValue.value.trim();
  }

  if (typeof field?.jsonValue?.value?.href === "string") {
    return field.jsonValue.value.href.trim();
  }

  if (typeof field?.jsonValue?.value?.url === "string") {
    return field.jsonValue.value.url.trim();
  }

  if (typeof field?.jsonValue?.value?.src === "string") {
    return field.jsonValue.value.src.trim();
  }

  return "";
};

/**
 * YouTube URL → autoplay muted embed
 */
const getYouTubeEmbedUrl = (url: string): string | null => {
  if (!url) return null;

  const youtubeRegex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i;

  const match = url.match(youtubeRegex);

  if (!match?.[1]) return null;

  return `https://www.youtube-nocookie.com/embed/${match[1]}?autoplay=1&mute=1&rel=0&modestbranding=1&playsinline=1`;
};

/**
 * Vimeo URL → autoplay muted embed
 */
const getVimeoEmbedUrl = (url: string): string | null => {
  if (!url) return null;

  const vimeoRegex =
    /(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/[^\/]*\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+))/i;

  const match = url.match(vimeoRegex);

  if (!match?.[1]) return null;

  return `https://player.vimeo.com/video/${match[1]}?autoplay=1&muted=1&playsinline=1`;
};

/**
 * Check for direct video files
 */
const isDirectVideoFile = (url: string): boolean => {
  if (!url) return false;

  const cleanUrl = url.split("?")[0].toLowerCase();

  return (
    cleanUrl.endsWith(".mp4") ||
    cleanUrl.endsWith(".webm") ||
    cleanUrl.endsWith(".ogg") ||
    cleanUrl.endsWith(".mov")
  );
};

export const VideoPlayer = (props: VideoPlayerProps): JSX.Element => {
  const raw = props?.fields || props?.rendering?.fields;

  const dataSource =
    raw?.data?.datasource ||
    raw?.data?.item ||
    raw?.data?.data ||
    raw?.data ||
    raw?.datasource ||
    raw?.item ||
    raw;

  const fields = dataSource?.fields || dataSource;

  const rawVideoUrl = resolveField(fields, "Video URL", "VideoUrl", "videoUrl", "Video", "video");
  const rawShadeColor = resolveField(fields, "Shade Color", "ShadeColor", "shadeColor");

  let videoUrl = extractStringValue(rawVideoUrl);

  // Hack: Proxy video through middleware to bypass ERR_BLOCKED_BY_RESPONSE.NotSameSite
  if (videoUrl.includes('aisaleagent.com')) {
    videoUrl = videoUrl.replace('https://aisaleagent.com/', '/proxy-media/aisaleagent/');
  }

  const shadeColor =
    extractStringValue(rawShadeColor) || "rgba(15, 23, 42, 0.4)";

  const youtubeEmbedUrl = useMemo(
    () => getYouTubeEmbedUrl(videoUrl),
    [videoUrl]
  );

  const vimeoEmbedUrl = useMemo(
    () => getVimeoEmbedUrl(videoUrl),
    [videoUrl]
  );

  const isDirectFile = useMemo(
    () => isDirectVideoFile(videoUrl),
    [videoUrl]
  );

  // Refs & state for controls
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Force load and play the video when URL changes
  useEffect(() => {
    if (videoRef.current && isDirectFile && videoUrl) {
      videoRef.current.muted = isMuted;
      videoRef.current.load();
      videoRef.current.play().catch((err) => {
        console.warn("VideoPlayer: autoPlay failed", err);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl, isDirectFile]);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
      mozRequestFullScreen?: () => Promise<void>;
      msRequestFullscreen?: () => Promise<void>;
    };
    const doc = document as Document & {
      webkitExitFullscreen?: () => Promise<void>;
      mozCancelFullScreen?: () => Promise<void>;
      msExitFullscreen?: () => Promise<void>;
      webkitFullscreenElement?: Element | null;
      mozFullScreenElement?: Element | null;
      msFullscreenElement?: Element | null;
    };

    const fullscreenEl =
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement;

    if (!fullscreenEl) {
      const requestFs =
        el.requestFullscreen ||
        el.webkitRequestFullscreen ||
        el.mozRequestFullScreen ||
        el.msRequestFullscreen;
      if (requestFs) {
        requestFs.call(el).then(() => setIsFullscreen(true)).catch(() => {});
      }
    } else {
      const exitFs =
        doc.exitFullscreen ||
        doc.webkitExitFullscreen ||
        doc.mozCancelFullScreen ||
        doc.msExitFullscreen;
      if (exitFs) {
        exitFs.call(doc).then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  }, []);

  return (
    <section className="relative w-full py-10 sm:py-14 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Video Card */}
        <div
          ref={containerRef}
          className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-950 ring-1 ring-slate-900/10 transition-all duration-500"
          style={{
            boxShadow: `0 0 45px 10px ${shadeColor}`,
          }}
        >
          {/* 16:9 Video */}
          <div className="relative w-full aspect-video">

            {/* YouTube */}
            {youtubeEmbedUrl ? (
              <iframe
                src={youtubeEmbedUrl}
                title="Video Player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            ) : vimeoEmbedUrl ? (

              /* Vimeo */
              <iframe
                src={vimeoEmbedUrl}
                title="Video Player"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />

            ) : isDirectFile ? (

              /* MP4 / WebM / OGG / MOV */
              <video
                key={videoUrl}
                ref={videoRef}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              >
                <source src={videoUrl} type={videoUrl.endsWith('.webm') ? 'video/webm' : videoUrl.endsWith('.ogg') ? 'video/ogg' : 'video/mp4'} />
                Your browser does not support the video tag.
              </video>

            ) : (

              /* No valid video */
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 p-4 text-xs overflow-auto">
                <p className="text-red-400 font-bold mb-2">
                  DEBUG: No valid video source configured.
                </p>
                <div className="text-left text-slate-300 space-y-1 w-full max-w-lg">
                  <p><strong>videoUrl:</strong> {JSON.stringify(videoUrl)}</p>
                  <p><strong>rawVideoUrl:</strong> {JSON.stringify(rawVideoUrl)}</p>
                  <p><strong>fields object keys:</strong> {JSON.stringify(fields ? Object.keys(fields) : null)}</p>
                  <p><strong>raw object:</strong> {JSON.stringify(raw)}</p>
                </div>
              </div>
            )}

            {/* Shade Color Overlay */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundColor: shadeColor,
                opacity: 0.08,
              }}
            />

            {/* ── Control Buttons ── bottom-right corner */}
            <div
              style={{
                position: "absolute",
                bottom: "12px",
                right: "12px",
                display: "flex",
                gap: "8px",
                zIndex: 50,
              }}
            >
              {/* Mute / Unmute — only meaningful for direct video files */}
              {isDirectFile && (
                <button
                  onClick={toggleMute}
                  title={isMuted ? "Unmute" : "Mute"}
                  aria-label={isMuted ? "Unmute video" : "Mute video"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "32px",
                    height: "32px",
                    borderRadius: "6px",
                    background: "rgba(0,0,0,0.75)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#fff",
                    cursor: "pointer",
                    backdropFilter: "blur(4px)",
                    transition: "background 0.2s",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.background =
                      "rgba(0,0,0,0.92)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.background =
                      "rgba(0,0,0,0.75)")
                  }
                >
                  {isMuted ? (
                    /* Muted icon */
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <line x1="23" y1="9" x2="17" y2="15" />
                      <line x1="17" y1="9" x2="23" y2="15" />
                    </svg>
                  ) : (
                    /* Unmuted icon */
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </svg>
                  )}
                </button>
              )}

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "32px",
                  height: "32px",
                  borderRadius: "6px",
                  background: "rgba(0,0,0,0.75)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff",
                  cursor: "pointer",
                  backdropFilter: "blur(4px)",
                  transition: "background 0.2s",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(0,0,0,0.92)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(0,0,0,0.75)")
                }
              >
                {isFullscreen ? (
                  /* Exit fullscreen icon */
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                    <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                    <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                    <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
                  </svg>
                ) : (
                  /* Enter fullscreen icon */
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                    <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                    <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                    <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                  </svg>
                )}
              </button>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

export default VideoPlayer;