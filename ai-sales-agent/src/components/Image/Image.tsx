import { Image as SitecoreImage, ImageField, useSitecore } from '@sitecore-content-sdk/nextjs';
import type { ImageProps } from './Image.props';

export const Image = ({ fields }: ImageProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;

  const imageField = fields?.Image;
  const hasImage = Boolean(imageField?.value?.src);

  const checkbox = fields?.['AI Generated']?.value;
  const isAIGenerated = checkbox === true || checkbox === 'true' || checkbox === '1';

  const labelImage = fields?.['AI generated label']?.fields?.['Label Image'];
  const labelSrc = labelImage?.value?.src;

  // Outside editing, render nothing when there is no image.
  // In editing, keep rendering so the author can pick one inline.
  if (!hasImage && !isEditing) return null;

  return (
    <div className="relative w-full overflow-hidden h-[80vh]">
      {imageField && (
        <SitecoreImage field={imageField} className="block w-full object-cover" />
      )}

      {isAIGenerated && labelSrc && (
        <SitecoreImage
          field={
            { value: { src: labelSrc, alt: labelImage?.value?.alt || 'AI generated' } } as ImageField
          }
          className="pointer-events-none absolute bottom-4 left-4 z-10 w-50"
        />
      )}
    </div>
  );
};

export default Image;