import { useEffect, useState } from 'react';
import { useEnterOnScroll } from '@/hooks/useEnterOnScroll';

interface CountUpProps {
  /** Final value. This is what prerendered HTML and screen readers get. */
  value: number;
  /** Text after the number, e.g. "+" in "220+". */
  suffix?: string;
  durationMs?: number;
  className?: string;
}

const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

/**
 * Counts from 0 to `value` once, when it scrolls into view.
 *
 * Ported from the 21st.dev "Count Up" component (unlumen) without its
 * motion / react-use-measure dependencies or per-digit blur effects — the
 * design system bans blur layers, and a requestAnimationFrame tween is enough
 * for a single number.
 */
export function CountUp({ value, suffix = '', durationMs = 1200, className }: CountUpProps) {
  const { ref, phase } = useEnterOnScroll<HTMLSpanElement>();
  const [tweened, setTweened] = useState(0);

  useEffect(() => {
    if (phase !== 'entered') return;

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      setTweened(Math.round(easeOutCubic(progress) * value));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, value, durationMs]);

  // Off screen it may sit at 0; everywhere else it shows the real number.
  const shown = phase === 'static' ? value : phase === 'pending' ? 0 : tweened;

  return (
    <span ref={ref} className={className}>
      {/* Screen readers get the final value once instead of every frame. */}
      <span className='sr-only'>
        {value}
        {suffix}
      </span>
      <span aria-hidden='true'>
        {shown}
        {suffix}
      </span>
    </span>
  );
}
