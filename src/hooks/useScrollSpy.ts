import { useCallback, useEffect, useRef, useState } from 'react';

interface ScrollSpyOptions {
  /** Height of whatever is stuck to the top of the viewport, in px. */
  topOffset: number;
}

/** How long a click-driven smooth scroll may own the active item at most. */
const PROGRAMMATIC_SCROLL_TIMEOUT_MS = 1000;

/**
 * Tracks which section the reader is in, for an "on this page" list.
 *
 * Ported from the IntersectionObserver hook in the 21st.dev "Table of
 * Contents" component (inference-sh), with fixes it needed here:
 * - observes a stable id list (the original re-subscribed on every render);
 * - a click owns the highlight until its smooth scroll ends, so the sections
 *   scrolled past on the way don't flicker through the list;
 * - at the bottom of the page the last section wins, because a short final
 *   section can never reach the top band;
 * - the band starts below the sticky header instead of a fixed 80px.
 *
 * Without IntersectionObserver (tests, prerender) it degrades to click-only.
 */
export function useScrollSpy(
  ids: readonly string[],
  { topOffset }: ScrollSpyOptions,
): { activeId: string; selectId: (id: string) => void } {
  const [activeId, setActiveId] = useState(ids[0] ?? '');
  const lockedRef = useRef(false);
  const unlockTimerRef = useRef<number | undefined>(undefined);
  const idsKey = ids.join('|');

  useEffect(() => {
    if (ids.length === 0 || typeof IntersectionObserver === 'undefined') return;

    const intersecting = new Set<string>();
    const isAtBottom = () =>
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;

    const sync = () => {
      if (lockedRef.current) return;
      if (isAtBottom()) {
        setActiveId(ids[ids.length - 1]);
        return;
      }
      const first = ids.find((id) => intersecting.has(id));
      if (first) setActiveId(first);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) intersecting.add(entry.target.id);
          else intersecting.delete(entry.target.id);
        });
        sync();
      },
      { rootMargin: `-${topOffset}px 0px -65% 0px`, threshold: 0 },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    // Only needed for the bottom-of-page case; one check per frame at most.
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        sync();
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
    // idsKey stands in for ids: callers pass a fresh array with the same contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, topOffset]);

  useEffect(() => () => window.clearTimeout(unlockTimerRef.current), []);

  const selectId = useCallback((id: string) => {
    setActiveId(id);
    lockedRef.current = true;
    window.clearTimeout(unlockTimerRef.current);

    const unlock = () => {
      lockedRef.current = false;
      window.clearTimeout(unlockTimerRef.current);
      window.removeEventListener('scrollend', unlock);
    };
    window.addEventListener('scrollend', unlock, { once: true });
    unlockTimerRef.current = window.setTimeout(unlock, PROGRAMMATIC_SCROLL_TIMEOUT_MS);
  }, []);

  return { activeId, selectId };
}
