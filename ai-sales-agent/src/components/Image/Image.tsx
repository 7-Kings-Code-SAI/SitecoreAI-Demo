import { Image as SitecoreImage, ImageField, useSitecore } from '@sitecore-content-sdk/nextjs';
import type { CSSProperties } from 'react';
import type { ImageFields, ImageProps } from './Image.props';

// Full class strings so Tailwind can detect them at build time.
const POSITION_CLASSES: Record<string, string> = {
  'top-left': 'top-2 left-2 sm:top-4 sm:left-4 lg:top-6 lg:left-6',
  'top-right': 'top-2 right-2 sm:top-4 sm:right-4 lg:top-6 lg:right-6',
  'bottom-left': 'bottom-2 left-2 sm:bottom-4 sm:left-4 lg:bottom-6 lg:left-6',
  'bottom-right': 'bottom-2 right-2 sm:bottom-4 sm:right-4 lg:bottom-6 lg:right-6',
};
const DEFAULT_POSITION = 'bottom-left';

// Works for both a Droplink (item with name/displayName) and a Droplist ({ value }).
const getPositionText = (field: ImageFields['Label Position']): string => {
  if (!field) return '';
  const f = field as { value?: string; displayName?: string; name?: string };
  return f.value ?? f.displayName ?? f.name ?? '';
};

const normalizePosition = (value?: string): string => {
  const key = (value ?? '').trim().toLowerCase().replace(/[\s_]+/g, '-');
  return key in POSITION_CLASSES ? key : DEFAULT_POSITION;
};

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

export const Image = ({ fields }: ImageProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;

  const imageField = fields?.Image;
  const hasImage = Boolean(imageField?.value?.src);

  const checkbox = fields?.['AI Generated']?.value;
  const isAIGenerated = checkbox === true || checkbox === 'true' || checkbox === '1';

  const labelImage = fields?.['AI generated label']?.fields?.['Label Image'];
  const labelSrc = labelImage?.value?.src;
  const positionClasses =
    POSITION_CLASSES[normalizePosition(getPositionText(fields?.['Label Position']))];

  // Outside editing, render nothing when there is no image.
  if (!hasImage && !isEditing) return null;

  // Use the image's own proportions, clamped so very tall or very wide
  // images don't make the component too tall or too thin.
  const width = Number(imageField?.value?.width);
  const height = Number(imageField?.value?.height);
  const naturalRatio = width > 0 && height > 0 ? width / height : 16 / 9;
  const wrapperStyle: CSSProperties = { aspectRatio: String(clamp(naturalRatio, 1, 2.4)) };

  return (
    <div
      className="relative w-full max-h-[70vh] min-h-40 overflow-hidden"
      style={wrapperStyle}
    >
      {imageField && (
        <SitecoreImage field={imageField} className="block h-full w-full object-cover" />
      )}

      {isAIGenerated && labelSrc && (
        <SitecoreImage
          field={
            { value: { src: labelSrc, alt: labelImage?.value?.alt || 'AI generated' } } as ImageField
          }
          className={`pointer-events-none absolute z-10 h-auto w-[clamp(5rem,20%,14rem)] ${positionClasses}`}
        />
      )}
    </div>
  );
};

export default Image;