import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DELIVERY_PHOTOS, type DeliveryPhoto } from './deliveryPhotos';

const DEFAULT_INTERVAL_MS = 6000;

interface PhotoCarouselProps {
  /** Frame classes (position, aspect, radius, ring). Photos fill the frame. */
  className?: string;
  /** `sizes` for the WebP srcset — the frame's rendered width. */
  sizes: string;
  /** Which photo opens the rotation, so two screens don't start alike. */
  startIndex?: number;
  /** Above the fold: the first photo loads eagerly at high priority. */
  priority?: boolean;
  intervalMs?: number;
  photos?: readonly DeliveryPhoto[];
}

// Rotates decorative photos with a crossfade. Cost stays at one photo up
// front: each next photo is mounted (and fetched) only once the current one
// has loaded, and the swap waits until that next photo is ready, so a slow
// network never fades into an empty frame. Rotation stops for reduced
// motion, while the frame is off screen or the tab is hidden, and when the
// viewer presses pause (WCAG 2.2.2).
export const PhotoCarousel: React.FC<PhotoCarouselProps> = ({
  className = '',
  sizes,
  startIndex = 0,
  priority = false,
  intervalMs = DEFAULT_INTERVAL_MS,
  photos = DELIVERY_PHOTOS,
}) => {
  const { t } = useLanguage();
  const count = photos.length;
  const first = ((startIndex % count) + count) % count;
  const rootRef = useRef<HTMLDivElement>(null);

  const [current, setCurrent] = useState(first);
  const [loaded, setLoaded] = useState<ReadonlySet<number>>(() => new Set());
  const [motionOk, setMotionOk] = useState(false);
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const [paused, setPaused] = useState(false);

  const next = (current + 1) % count;
  const canRotate = count > 1 && motionOk;
  const running = canRotate && !paused && inView && pageVisible;
  // Rendered: the visible photo, any photo already loaded (so the outgoing
  // one can fade out), and the next one — fetched one ahead, and only after
  // the visible one has arrived.
  const isMounted = (index: number) =>
    index === current || loaded.has(index) || (canRotate && loaded.has(current) && index === next);

  const markLoaded = useCallback((index: number) => {
    setLoaded((prev) => (prev.has(index) ? prev : new Set(prev).add(index)));
  }, []);

  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setMotionOk(!query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sync = () => setPageVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  useEffect(() => {
    if (!running || !loaded.has(next)) return;
    const timer = window.setTimeout(() => setCurrent(next), intervalMs);
    return () => window.clearTimeout(timer);
  }, [running, loaded, next, intervalMs]);

  return (
    <div ref={rootRef} className={`overflow-hidden ${className}`}>
      {photos.map((photo, index) =>
        isMounted(index) ? (
          <picture
            key={photo.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out motion-reduce:transition-none ${
              index === current ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <source type='image/webp' srcSet={photo.webpSrcSet} sizes={sizes} />
            <img
              // A prerendered or cached image can finish before React attaches
              // onLoad; checking `complete` keeps the rotation from stalling.
              ref={(img) => {
                if (img?.complete && img.naturalWidth > 0) markLoaded(index);
              }}
              src={photo.jpg}
              alt=''
              width={photo.width}
              height={photo.height}
              loading={priority && index === first ? 'eager' : 'lazy'}
              fetchPriority={priority && index === first ? 'high' : 'low'}
              decoding='async'
              onLoad={() => markLoaded(index)}
              className={`h-full w-full object-cover ${photo.position}`}
            />
          </picture>
        ) : null,
      )}

      {canRotate && (
        <button
          type='button'
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? t('photos.play') : t('photos.pause')}
          className='absolute top-3 right-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-navy/60 text-white ring-1 ring-white/20 opacity-70 hover:opacity-100 focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-cyan-300 transition-opacity'
        >
          {paused ? (
            <Play aria-hidden='true' className='h-3.5 w-3.5' />
          ) : (
            <Pause aria-hidden='true' className='h-3.5 w-3.5' />
          )}
        </button>
      )}
    </div>
  );
};
