import signature880Webp from '@/assets/photos/signature-880.webp';
import signature1440Webp from '@/assets/photos/signature-1440.webp';
import signature880Jpg from '@/assets/photos/signature-880.jpg';
import handover880Webp from '@/assets/photos/handover-880.webp';
import handover1440Webp from '@/assets/photos/handover-1440.webp';
import handover880Jpg from '@/assets/photos/handover-880.jpg';
import courier880Webp from '@/assets/photos/courier-880.webp';
import courier1440Webp from '@/assets/photos/courier-1440.webp';
import courier880Jpg from '@/assets/photos/courier-880.jpg';
import sorting880Webp from '@/assets/photos/sorting-880.webp';
import sorting1440Webp from '@/assets/photos/sorting-1440.webp';
import sorting880Jpg from '@/assets/photos/sorting-880.jpg';
import van880Webp from '@/assets/photos/van-880.webp';
import van1440Webp from '@/assets/photos/van-1440.webp';
import van880Jpg from '@/assets/photos/van-880.jpg';

export interface DeliveryPhoto {
  id: string;
  /** WebP at 880w and 1440w; the browser picks by `sizes`. */
  webpSrcSet: string;
  /** 880w JPEG for browsers without WebP. */
  jpg: string;
  /** Intrinsic size of the 880w file — reserves the box before load. */
  width: number;
  height: number;
  /** Crop anchor when the frame's aspect differs from the photo's. */
  position: string;
}

const photo = (
  id: string,
  webp880: string,
  webp1440: string,
  jpg: string,
  height: number,
  position = 'object-center',
): DeliveryPhoto => ({
  id,
  webpSrcSet: `${webp880} 880w, ${webp1440} 1440w`,
  jpg,
  width: 880,
  height,
  position,
});

// Getty Images via Unsplash+ (subscription licence). Originals live in Dropbox
// `KS WAYS/WCA LOGO/Unsp/` as getty-images-<id>-unsplash.jpg. Shots with red
// uniforms are left out on purpose — red reads as DHL, a carrier we quote.
export const DELIVERY_PHOTOS: readonly DeliveryPhoto[] = [
  photo('BcJ2daQRfxU', signature880Webp, signature1440Webp, signature880Jpg, 587),
  photo('178EcoZnJT4', handover880Webp, handover1440Webp, handover880Jpg, 495),
  photo('gOkE757c1oI', courier880Webp, courier1440Webp, courier880Jpg, 438, 'object-left'),
  photo('H6Wtepgak_o', sorting880Webp, sorting1440Webp, sorting880Jpg, 587),
  photo('X9E1pQse_V0', van880Webp, van1440Webp, van880Jpg, 587, 'object-left'),
];
