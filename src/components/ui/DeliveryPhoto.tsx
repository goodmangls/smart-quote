import React from 'react';
import signatureJpg from '@/assets/photos/delivery-signature.jpg';
import signatureWebp from '@/assets/photos/delivery-signature.webp';
import courierJpg from '@/assets/photos/courier-trunk.jpg';
import courierWebp from '@/assets/photos/courier-trunk.webp';

// Getty Images via Unsplash+ (KS WAYS Dropbox: "WCA LOGO/Images"). Each entry
// keeps the size of the file we ship so width/height reserve the right box
// and nobody frames a photo larger than its source can carry.
const PHOTOS = {
  // BcJ2daQRfxU — the only copy is 640×427. Keep it framed at ≤ ~480 CSS px;
  // full-bleed would upscale it ~3.5× on retina.
  signature: { jpg: signatureJpg, webp: signatureWebp, width: 640, height: 427 },
  // gOkE757c1oI — downscaled from 7200×3580 to 1440 wide (2× of a 720px panel).
  courier: { jpg: courierJpg, webp: courierWebp, width: 1440, height: 716 },
} as const;

export type DeliveryPhotoName = keyof typeof PHOTOS;

interface DeliveryPhotoProps {
  photo: DeliveryPhotoName;
  /** Frame classes (radius, ring, shadow, aspect). The image fills the frame. */
  className?: string;
  /** Crop anchor, e.g. `object-left`. Defaults to centred. */
  imgClassName?: string;
  /** Above-the-fold use (landing hero) loads eagerly; elsewhere stay lazy. */
  priority?: boolean;
}

// Decorative stock — the surrounding copy already says what the page is about,
// so the image is hidden from assistive tech (alt="").
export const DeliveryPhoto: React.FC<DeliveryPhotoProps> = ({
  photo,
  className = '',
  imgClassName = '',
  priority = false,
}) => {
  const { jpg, webp, width, height } = PHOTOS[photo];
  return (
    <picture className={`block overflow-hidden ${className}`}>
      <source srcSet={webp} type='image/webp' />
      <img
        src={jpg}
        alt=''
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding='async'
        className={`h-full w-full object-cover ${imgClassName}`}
      />
    </picture>
  );
};
