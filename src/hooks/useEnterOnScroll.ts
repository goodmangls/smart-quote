import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Where an element is in its one-shot "enter the viewport" animation.
 *
 * - `static`  — render the final state and never animate. This is the first
 *   render (so prerendered HTML and no-JS readers get real content), and it
 *   stays that way when motion is reduced, IntersectionObserver is missing,
 *   or the element was already on screen when the page loaded.
 * - `pending` — the element started off screen; it may hide its content
 *   because nobody can see it yet.
 * - `entered` — it scrolled into view; play the animation once.
 */
export type EnterPhase = 'static' | 'pending' | 'entered';

export const ENTER_ROOT_MARGIN = '100000% 0px 0px 0px';

const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function useEnterOnScroll<T extends Element>(): {
  ref: RefObject<T | null>;
  phase: EnterPhase;
} {
  const ref = useRef<T | null>(null);
  const [phase, setPhase] = useState<EnterPhase>('static');

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) {
      return;
    }

    let firstReport = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (firstReport) {
          firstReport = false;
          // Already visible at load: animating would flash the final value
          // away and back. Leave it as rendered.
          if (entry.isIntersecting) {
            observer.disconnect();
          } else {
            setPhase('pending');
          }
          return;
        }
        if (entry.isIntersecting) {
          setPhase('entered');
          observer.disconnect();
        }
      },
      // The root extends far above the viewport, so "intersecting" means
      // "reached or already scrolled past". Without it, jumping over the
      // element (anchor link, End key, fast fling) never fires the observer
      // and it stays hidden — or stuck at 0 — forever.
      { rootMargin: ENTER_ROOT_MARGIN, threshold: 0.25 },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      setPhase('static');
    };
  }, []);

  return { ref, phase };
}
