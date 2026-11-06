import { jsPDF } from 'jspdf';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface DetailedAnswer {
  option: string;
  optionText?: string;
  points: number;
  questionTitle?: string;
  zoneKey?: string;
  zoneLabel?: string;
  zoneDescription?: string;
  answerReason?: string;
  solutionsTitle?: string;
  solutionsText?: string;
  zoneImage?: string;
  solutionImage?: string;
  questionIndex?: number;
  questionId?: string;
}

interface HygieneSessionData {
  displayScore?: number;
  rawScore?: number;
  maxScore?: number;
  total?: number;
  detailedAnswers?: Record<string, DetailedAnswer>;
  answers?: any;
  tierInfo?: {
    title?: string;
    summaryHeadline?: string;
    description?: string;
  };
  formData?: {
    firstName?: string;
    lastName?: string;
    name?: string;
    company?: string;
    email?: string;
    phone?: string;
    city?: string;
    zip?: string;
  };
}

export interface GenerateReportOptions {
  reportTitle?: string;
  reportSubtitle?: string;
  scoreLabel?: string;
  zoneBreakdownLabel?: string;
  summaryHeadline?: string;
  summaryText?: string;
  headerLogoUrl?: string;
  zoneResults?: Array<{
    name: string;
    earned: number;
    max: number;
    percentage: number;
  }>;
}

// ─── Color Helper ─────────────────────────────────────────────────────────────

const hexToRgb = (hex?: string): [number, number, number] => {
  if (!hex) return [226, 0, 26];
  const clean = hex.replace('#', '');
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16) || 0;
    const g = parseInt(clean.slice(2, 4), 16) || 0;
    const b = parseInt(clean.slice(4, 6), 16) || 0;
    return [r, g, b];
  }
  return [226, 0, 26];
};

// ─── Helper: Asynchronously load image to base64 Data URL ─────────────────────

const loadImageDataUrl = async (url?: string | null): Promise<string | null> => {
  if (!url || typeof window === 'undefined') return null;
  if (url.startsWith('data:')) return url;

  // 1. First try the server-side proxy route (bypasses browser CORS completely)
  try {
    const proxyRes = await fetch(`/api/pdf-image?url=${encodeURIComponent(url)}`);
    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.dataUrl) return data.dataUrl;
    }
  } catch {
    // Fall back to client-side canvas
  }

  // 2. Client-side fallback via canvas
  return new Promise((resolve) => {
    try {
      const img = new (window as any).Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(null);
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.9));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    } catch {
      resolve(null);
    }
  });
};

// ─── Helper: Fetch Hero background image from signup page if not in session ──

const resolveHeroBackgroundUrl = async (): Promise<string | null> => {
  if (typeof window === 'undefined') return null;
  let heroSrc = sessionStorage.getItem('hygiene-hero-image');
  if (
    heroSrc &&
    heroSrc.trim().length > 0 &&
    !heroSrc.toLowerCase().includes('language') &&
    !heroSrc.toLowerCase().includes('logo') &&
    !heroSrc.toLowerCase().includes('icon')
  ) {
    return heroSrc;
  }

  // Fetch the signup page HTML to extract the hero background image URL
  try {
    const res = await fetch('/en/signup');
    if (res.ok) {
      const html = await res.text();
      const match =
        html.match(/<img[^>]+src="([^">]+home-bg-hero[^">]*)"/i) ||
        html.match(/src="([^">]+home-bg-hero[^">]*)"/i) ||
        html.match(/<img[^>]+src="([^">]+hero[^">]*)"/i) ||
        html.match(/<img[^>]+src="([^">]+cauliflower[^">]*)"/i) ||
        html.match(/<img[^>]+src="([^">]+)"[^>]*class="[^"]*object-cover/i);
      if (match && match[1]) {
        heroSrc = match[1].replace(/&amp;/g, '&');
        sessionStorage.setItem('hygiene-hero-image', heroSrc);
        return heroSrc;
      }
    }
  } catch {
    // Ignore fetch error
  }
  return null;
};

// ─── Helper: Crop & Zoom Hero image to left-mid section ──────────────────────

const cropHeroToBottomLeft = async (dataUrl: string): Promise<string> => {
  if (typeof window === 'undefined' || !dataUrl) return dataUrl;
  return new Promise((resolve) => {
    try {
      const img = new (window as any).Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const targetW = 1600;
          const targetH = Math.round(targetW * (52 / 210)); // ~396px
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }

          // Zoom in and crop from left-mid section of the artwork matching client reference
          const sw = img.naturalWidth * 0.55;
          const sh = sw * (52 / 210);
          const sx = 0; // Starts from left
          const sy = Math.max(0, Math.min(img.naturalHeight - sh, img.naturalHeight * 0.28)); // Left-mid part

          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
          resolve(canvas.toDataURL('image/jpeg', 0.95));
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch {
      resolve(dataUrl);
    }
  });
};

// ─── Helper: Draw SVG-accurate Gauge Arc in jsPDF ───────────────────────────────

const drawGaugeArc = (
  doc: jsPDF,
  cx: number,
  cy: number,
  radius: number,
  score: number,
  r: number,
  g: number,
  b: number
) => {
  const lineWidth = 4.5;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  // 1. Draw Gray Background Arc (180 deg to 360 deg)
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(lineWidth);
  doc.setLineCap('round');

  const step = 2;
  for (let a = 180; a < 360; a += step) {
    const a1 = toRad(a);
    const a2 = toRad(Math.min(360, a + step));
    doc.line(
      cx + radius * Math.cos(a1),
      cy + radius * Math.sin(a1),
      cx + radius * Math.cos(a2),
      cy + radius * Math.sin(a2)
    );
  }

  // 2. Draw Active Colored Arc (180 deg to 180 + (score / 100) * 180 deg)
  const clampedScore = Math.max(0, Math.min(100, score));
  if (clampedScore > 0) {
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(lineWidth);
    doc.setLineCap('round');

    const targetEndDeg = 180 + (clampedScore / 100) * 180;
    for (let a = 180; a < targetEndDeg; a += step) {
      const a1 = toRad(a);
      const a2 = toRad(Math.min(targetEndDeg, a + step));
      doc.line(
        cx + radius * Math.cos(a1),
        cy + radius * Math.sin(a1),
        cx + radius * Math.cos(a2),
        cy + radius * Math.sin(a2)
      );
    }
  }
};

// ─── Helper: Ensure image is raster PNG (converts WebP/SVG to PNG via canvas, preserving alpha transparency) ──

const ensureRasterDataUrl = async (dataUrl: string | null): Promise<string | null> => {
  if (!dataUrl || typeof window === 'undefined') return null;
  // If it's already a standard PNG data URL
  if (dataUrl.startsWith('data:image/png')) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    try {
      const img = new (window as any).Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const natW = img.naturalWidth || img.width || 300;
          const natH = img.naturalHeight || img.height || 75;
          const scale = Math.max(1, Math.min(3, Math.round(600 / natW)));
          const canvas = document.createElement('canvas');
          canvas.width = natW * scale;
          canvas.height = natH * scale;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(dataUrl);

          // Clear canvas to guarantee transparent background (never fill with black)
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Export strictly as PNG to keep transparent background
          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch {
      resolve(dataUrl);
    }
  });
};

// ─── Helper: Draw Brand Logo dynamically with transparency & aspect ratio ─────

const drawBrandLogo = (doc: jsPDF, rightMarginX: number, topY: number, logoDataUrl: string | null) => {
  if (!logoDataUrl) return;
  try {
    const isPng = logoDataUrl.startsWith('data:image/png');
    const format = isPng ? 'PNG' : 'JPEG';

    let w = 42;
    let h = 12;

    try {
      const props = doc.getImageProperties(logoDataUrl);
      if (props && props.width && props.height) {
        const aspect = props.width / props.height;
        const maxW = 46;
        const maxH = 13;
        w = maxH * aspect;
        if (w > maxW) {
          w = maxW;
          h = maxW / aspect;
        } else {
          h = maxH;
        }
      }
    } catch {
      // Fall back to default dimensions
    }

    const x = rightMarginX - w;
    doc.addImage(logoDataUrl, format, x, topY, w, h, undefined, 'FAST');
  } catch (err) {
    console.warn('Could not render dynamic header logo in PDF:', err);
  }
};

// ─── Helper: Draw Zone Images in the Page 1 Right Card ────────────────────────

const drawZoneImagesLayout = (
  doc: jsPDF,
  rightX: number,
  colY: number,
  colW: number,
  colH: number,
  uniqueImages: string[]
) => {
  const count = uniqueImages.length;
  if (count === 0) return; // Leave card clean without any dummy text

  const drawImg = (imgData: string, x: number, y: number, w: number, h: number) => {
    try {
      const format = imgData.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(imgData, format, x, y, w, h);
    } catch (err) {
      console.warn('Error drawing zone image in PDF:', err);
    }
  };

  try {
    if (count === 1) {
      // 1 unique image: centered
      const imgW = 70;
      const imgH = 68;
      const x = rightX + (colW - imgW) / 2;
      const y = colY + (colH - imgH) / 2;
      drawImg(uniqueImages[0], x, y, imgW, imgH);
    } else if (count === 2) {
      // 2 images: stacked vertically
      const imgW = 58;
      const imgH = 42;
      const x = rightX + (colW - imgW) / 2;
      drawImg(uniqueImages[0], x, colY + 5, imgW, imgH);
      drawImg(uniqueImages[1], x, colY + 49, imgW, imgH);
    } else if (count === 3) {
      // 3 images: 1 top centered, 2 bottom side-by-side
      const topW = 48;
      const topH = 40;
      drawImg(uniqueImages[0], rightX + (colW - topW) / 2, colY + 5, topW, topH);
      const bW = 38;
      const bH = 38;
      drawImg(uniqueImages[1], rightX + 4, colY + 50, bW, bH);
      drawImg(uniqueImages[2], rightX + 45, colY + 50, bW, bH);
    } else if (count === 4) {
      // 4 images: 2x2 grid
      const w = 38;
      const h = 42;
      drawImg(uniqueImages[0], rightX + 4, colY + 4, w, h);
      drawImg(uniqueImages[1], rightX + 45, colY + 4, w, h);
      drawImg(uniqueImages[2], rightX + 4, colY + 50, w, h);
      drawImg(uniqueImages[3], rightX + 45, colY + 50, w, h);
    } else {
      // 5 images: exact cross 5-room layout matching client specification
      const w = 36;
      const h = 27;
      drawImg(uniqueImages[0], rightX + 5, colY + 5, w, h);
      drawImg(uniqueImages[1], rightX + 46, colY + 5, w, h);
      drawImg(uniqueImages[2], rightX + 25.5, colY + 34.5, w, h);
      drawImg(uniqueImages[3], rightX + 5, colY + 64, w, h);
      drawImg(uniqueImages[4], rightX + 46, colY + 64, w, h);
    }
  } catch {
    // If any image fails, gracefully continue
  }
};

// ─── Main PDF Report Generator ────────────────────────────────────────────────

export const generateHygieneReport = async (
  tierBadge: string,
  gaugeColor: string,
  options?: GenerateReportOptions
) => {
  const rawSession = typeof window !== 'undefined' ? sessionStorage.getItem('hygiene-check') : null;
  if (!rawSession) {
    console.error('No hygiene check data found in session.');
    return;
  }

  const sessionData: HygieneSessionData = JSON.parse(rawSession);
  const formData = sessionData.formData || {};
  const companyName = formData.company || 'Report';

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm

  // Pre-fetch Hero background image and project brand logo
  const heroUrl = await resolveHeroBackgroundUrl();
  const resolveDynamicHeaderLogo = (): string | null => {
    if (options?.headerLogoUrl && !options.headerLogoUrl.toLowerCase().includes('social-links')) {
      return options.headerLogoUrl;
    }
    if (typeof window !== 'undefined') {
      const headerImg = (
        document.querySelector('header a img') ||
        document.querySelector('header img')
      ) as HTMLImageElement | null;
      if (headerImg && headerImg.src && !headerImg.src.toLowerCase().includes('social-links')) {
        return headerImg.src;
      }
      const stored = sessionStorage.getItem('hygiene-brand-logo');
      if (stored && !stored.toLowerCase().includes('social-links') && !stored.toLowerCase().includes('linkdin')) {
        return stored;
      }
    }
    return null;
  };

  const logoUrl = resolveDynamicHeaderLogo();

  const [rawHeroDataUrl, rawLogoDataUrl] = await Promise.all([
    heroUrl ? loadImageDataUrl(heroUrl) : Promise.resolve(null),
    logoUrl
      ? logoUrl.startsWith('data:')
        ? Promise.resolve(logoUrl)
        : loadImageDataUrl(logoUrl)
      : Promise.resolve(null),
  ]);

  const [heroDataUrl, logoDataUrl] = await Promise.all([
    rawHeroDataUrl ? cropHeroToBottomLeft(rawHeroDataUrl) : Promise.resolve(null),
    rawLogoDataUrl ? ensureRasterDataUrl(rawLogoDataUrl) : Promise.resolve(null),
  ]);

  // Extract detailed answers sorted by question index
  const answersMap: Record<string, DetailedAnswer> = sessionData.detailedAnswers || {};
  const sortedAnswerEntries = Object.entries(answersMap).sort((a, b) => {
    const idxA = a[1].questionIndex ?? 0;
    const idxB = b[1].questionIndex ?? 0;
    return idxA - idxB;
  });

  // Extract unique zone images (deduplicated by URL) for Page 1 right card ONLY
  const uniqueZoneImagesMap = new Map<string, string>();
  sortedAnswerEntries.forEach(([_, ans]) => {
    const src = ans.zoneImage;
    if (src && src.trim().length > 0 && !uniqueZoneImagesMap.has(src)) {
      uniqueZoneImagesMap.set(src, src);
    }
  });

  // Load unique zone images in parallel via proxy + ensure raster JPEG/PNG for jsPDF
  const uniqueZoneImageUrls = Array.from(uniqueZoneImagesMap.values());
  const uniqueZoneImageDataUrls = (
    await Promise.all(
      uniqueZoneImageUrls.map(async (u) => {
        const raw = await loadImageDataUrl(u);
        return raw ? await ensureRasterDataUrl(raw) : null;
      })
    )
  ).filter((d): d is string => Boolean(d));

  // Load product images for pages 2–8 in parallel (strictly solutionImage only; NO zoneImage!)
  const productImages = await Promise.all(
    sortedAnswerEntries.map(async ([_, data]) => {
      const src = data.solutionImage;
      if (!src || src.trim().length === 0) return null;
      const raw = await loadImageDataUrl(src);
      return raw ? await ensureRasterDataUrl(raw) : null;
    })
  );

  // ════════════════════════════════════════════════════════════════════════════
  // ── PAGE 1: COVER & RESULTS DASHBOARD ──────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════

  // 1. Top Hero Background Image (from signup page)
  if (heroDataUrl) {
    try {
      doc.addImage(heroDataUrl, 'JPEG', 0, 0, pageWidth, 52);
    } catch {
      // Leave space if image fails to render
    }
  }

  // 2. Top Right Logo (Dynamic from project header)
  drawBrandLogo(doc, pageWidth - 15, 10, logoDataUrl);

  // 3. Heading & Subtitle (Only rendered if authored in CMS; NO hardcoded fallback strings)
  const reportTitle = options?.reportTitle || '';
  if (reportTitle) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(17, 24, 39);
    doc.text(reportTitle, 15, 68);
  }

  const reportSubtitle = options?.reportSubtitle || '';
  if (reportSubtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    const splitSubtitle = doc.splitTextToSize(reportSubtitle, pageWidth - 30);
    doc.text(splitSubtitle, 15, 76);
  }

  // 4. Middle Section (2 Columns)
  const colY = 86;
  const colW = 87;
  const rightX = 108;

  // Left Column - Card 1: Tier Title Card (Light blue fill)
  doc.setFillColor(235, 243, 250);
  doc.roundedRect(15, colY, colW, 36, 4, 4, 'F');

  const resolvedBadge = tierBadge || sessionData.tierInfo?.title || '';
  if (resolvedBadge) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(17, 24, 39);
    doc.text(resolvedBadge, 22, colY + 14);
  }

  const headline = options?.summaryHeadline || sessionData.tierInfo?.summaryHeadline || '';
  if (headline) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(75, 85, 99);
    const splitHeadline = doc.splitTextToSize(headline, colW - 14);
    doc.text(splitHeadline, 22, colY + 24);
  }

  // Left Column - Card 2: Tier Summary Card (Solid Red brand fill #e2001a, matching client PDF)
  const redY = colY + 41;
  const redH = 55;
  doc.setFillColor(226, 0, 26);
  doc.roundedRect(15, redY, colW, redH, 4, 4, 'F');

  const summaryText = options?.summaryText || sessionData.tierInfo?.description || '';
  if (summaryText) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    const splitSummary = doc.splitTextToSize(summaryText, colW - 14);
    doc.text(splitSummary, 22, redY + 11, { lineHeightFactor: 1.4 });
  }

  // Right Column: Zone Images Card (Light blue fill)
  doc.setFillColor(235, 243, 250);
  doc.roundedRect(rightX, colY, colW, 96, 4, 4, 'F');
  // Render the zone images dynamically arranged inside the card
  drawZoneImagesLayout(doc, rightX, colY, colW, 96, uniqueZoneImageDataUrls);

  // 5. Bottom Card: Gauge & Zone Breakdown
  const botY = 190;
  const botH = 88;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, botY, 180, botH, 4, 4, 'FD');

  // Divider
  doc.setDrawColor(241, 245, 249);
  doc.line(95, botY + 8, 95, botY + botH - 8);

  // Left Half: Gauge
  const gaugeCenterX = 55;
  const gaugeCenterY = botY + 44;
  const gaugeRadius = 24;
  const displayScore = sessionData.displayScore ?? sessionData.rawScore ?? 0;
  const [gr, gg, gb] = hexToRgb(gaugeColor);

  drawGaugeArc(doc, gaugeCenterX, gaugeCenterY, gaugeRadius, displayScore, gr, gg, gb);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(32);
  doc.setTextColor(17, 24, 39);
  doc.text(`${displayScore}`, gaugeCenterX, gaugeCenterY + 2, { align: 'center' });

  const scoreLabel = options?.scoreLabel || '/ 100 Hygiene Score';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(scoreLabel, gaugeCenterX, gaugeCenterY + 18, { align: 'center' });

  // Right Half: Zone Breakdown
  const zoneBreakdownLabel = options?.zoneBreakdownLabel || 'ZONE BREAKDOWN';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(zoneBreakdownLabel, 105, botY + 18);

  const getZoneRgb = (pct: number): [number, number, number] => {
    if (pct >= 80) return [16, 185, 129]; // Green
    if (pct >= 50) return [245, 158, 11]; // Orange
    return [226, 0, 26]; // Red
  };

  const zonesList = options?.zoneResults || [];
  let zoneRowY = botY + 28;
  zonesList.slice(0, 5).forEach((z) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(31, 41, 55);
    doc.text(z.name, 105, zoneRowY + 3);

    const barX = 142;
    const barW = 46;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(barX, zoneRowY, barW, 3.5, 1.5, 1.5, 'F');

    const pct = Math.max(0, Math.min(100, z.percentage));
    const visualPct = pct === 0 ? 18 : pct;
    const fillW = Math.max(2, (visualPct / 100) * barW);
    const [zr, zg, zb] = getZoneRgb(pct);
    doc.setFillColor(zr, zg, zb);
    doc.roundedRect(barX, zoneRowY, fillW, 3.5, 1.5, 1.5, 'F');

    zoneRowY += 10.5;
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ── PAGES 2–8: 7 QUESTION BREAKDOWN PAGES (1 QUESTION PER PAGE) ─────────────
  // ════════════════════════════════════════════════════════════════════════════

  sortedAnswerEntries.forEach(([_, answerData], idx) => {
    doc.addPage();

    // 1. Top Right Logo
    drawBrandLogo(doc, pageWidth - 60, 12, logoDataUrl);

    // 2. Zone Title
    const zoneTitle = answerData.zoneLabel || answerData.zoneKey || '';
    if (zoneTitle) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(26);
      doc.setTextColor(17, 24, 39);
      doc.text(zoneTitle, 15, 38);
    }

    // 3. Zone Subtitle / Description (Rendered only if authored in CMS; otherwise space is reserved)
    const zoneDesc = answerData.zoneDescription && answerData.zoneDescription.trim();
    if (zoneDesc) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(75, 85, 99);
      const splitZoneDesc = doc.splitTextToSize(zoneDesc, pageWidth - 30);
      doc.text(splitZoneDesc, 15, 48, { lineHeightFactor: 1.35 });
    }

    // 4. Middle Section (2 Columns, Y: 66mm to 158mm)
    const midY = 66;
    const midW = 87;
    const midH = 92;

    // Left Box: Question & User's Answer (Light blue card)
    doc.setFillColor(235, 243, 250);
    doc.roundedRect(15, midY, midW, midH, 4, 4, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(17, 24, 39);
    doc.text(`Question ${idx + 1}:`, 22, midY + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(55, 65, 81);
    const qTitle = answerData.questionTitle || '';
    const splitQTitle = doc.splitTextToSize(qTitle, midW - 14);
    doc.text(splitQTitle, 22, midY + 20, { lineHeightFactor: 1.35 });

    const answerLabelY = midY + 22 + splitQTitle.length * 4.5 + 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(17, 24, 39);
    doc.text(`Answer: ${answerData.option})`, 22, answerLabelY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(55, 65, 81);
    const optText = answerData.optionText || '';
    const splitOptText = doc.splitTextToSize(optText, midW - 14);
    doc.text(splitOptText, 22, answerLabelY + 8, { lineHeightFactor: 1.35 });

    // Right Box: Recommendation / Answer Reason (White card with border; NO hardcoded fallback text)
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.roundedRect(108, midY, midW, midH, 4, 4, 'FD');

    const reasonText = answerData.answerReason && answerData.answerReason.trim();
    if (reasonText) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(55, 65, 81);
      const splitReason = doc.splitTextToSize(reasonText, midW - 14);
      doc.text(splitReason, 115, midY + 14, { lineHeightFactor: 1.4 });
    }

    // 5. Bottom Section (2 Columns, Y: 166mm to 254mm)
    const botSecY = 166;
    const botSecH = 88;

    // Bottom Left: Red Card (Rendered only with dynamic CMS solutions; NO hardcoded default solutions)
    doc.setFillColor(226, 0, 26);
    doc.roundedRect(15, botSecY, midW, botSecH, 4, 4, 'F');

    const solTitle = answerData.solutionsTitle && answerData.solutionsTitle.trim();
    if (solTitle) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text(solTitle, 22, botSecY + 12);
    }

    const solText = answerData.solutionsText && answerData.solutionsText.trim();
    if (solText) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      const splitSol = doc.splitTextToSize(solText, midW - 14);
      doc.text(splitSol, 22, botSecY + (solTitle ? 22 : 14), { lineHeightFactor: 1.35 });
    }

    // Bottom Right: Product / Solution Image Box (Rendered only if image is available; NO dummy text)
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.roundedRect(108, botSecY, midW, botSecH, 4, 4, 'FD');

    const pImgData = productImages[idx];
    if (pImgData) {
      try {
        doc.addImage(pImgData, 'JPEG', 110, botSecY + 2, midW - 4, botSecH - 4);
      } catch {
        // Leave frame clean
      }
    }
  });

  // 6. Save the generated PDF
  const cleanCompany = companyName.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Hygiene-Check-Report-${cleanCompany}.pdf`);
};
