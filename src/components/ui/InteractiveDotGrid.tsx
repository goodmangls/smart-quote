import { useEffect, useRef, useState } from 'react';

const SPACING = 24;
const RADIUS = 120;
const DISPLACEMENT = 28;
const IDLE_OPACITY = 0.12;

interface Dot {
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  glow: number;
}

interface InteractiveDotGridProps {
  /** Navy panels keep white/cyan dots even when the application is in light mode. */
  tone?: 'adaptive' | 'navy';
  /** Lower contrast behind forms, navigation and document margins. */
  subtle?: boolean;
  /** Bound the drawing area on long document pages. */
  maxHeight?: number;
}

/** Decorative background shared by page surfaces. No React updates on pointer movement. */
export function InteractiveDotGrid({
  tone = 'adaptive',
  subtle = false,
  maxHeight,
}: InteractiveDotGridProps = {}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const idleOpacity = subtle ? 0.07 : IDLE_OPACITY;
  const highlightOpacity = subtle ? 0.3 : 0.45;

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const hero = root?.parentElement;
    if (!root || !canvas || !hero || !window.matchMedia) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    let stop: (() => void) | undefined;

    const syncPreferences = () => {
      stop?.();
      stop = undefined;
      setReady(false);
      if (reducedMotion.matches || !finePointer.matches || typeof ResizeObserver === 'undefined') {
        return;
      }
      const context = canvas.getContext('2d');
      if (!context) return;

      // Resolve existing Tailwind tokens rather than introducing a second color palette.
      let idleColor = getComputedStyle(root).color;
      let activeColor = getComputedStyle(canvas).color;
      let dots: Dot[] = [];
      let width = 0;
      let height = 0;
      let frame: number | null = null;
      let lastTime = 0;
      let visible = true;
      let pointer: { x: number; y: number } | null = null;

      const paint = () => {
        context.clearRect(0, 0, width, height);
        for (const dot of dots) {
          context.fillStyle = dot.glow > 0.01 ? activeColor : idleColor;
          context.globalAlpha = idleOpacity + dot.glow * highlightOpacity;
          context.beginPath();
          context.arc(dot.x, dot.y, 1 + dot.glow * 0.7, 0, Math.PI * 2);
          context.fill();
        }
      };

      const animate = (time: number) => {
        frame = null;
        const elapsed = lastTime ? Math.min(time - lastTime, 50) : 16.67;
        lastTime = time;
        const easing = 1 - Math.pow(0.82, elapsed / 16.67);
        let moving = false;
        for (const dot of dots) {
          const dx = pointer ? dot.homeX - pointer.x : 0;
          const dy = pointer ? dot.homeY - pointer.y : 0;
          const distance = Math.hypot(dx, dy);
          const influence = pointer ? Math.max(0, 1 - distance / RADIUS) ** 2 : 0;
          const targetX = dot.homeX + (distance ? dx / distance : 1) * influence * DISPLACEMENT;
          const targetY = dot.homeY + (distance ? dy / distance : 0) * influence * DISPLACEMENT;
          dot.x += (targetX - dot.x) * easing;
          dot.y += (targetY - dot.y) * easing;
          dot.glow += (influence - dot.glow) * easing;
          if (
            Math.abs(targetX - dot.x) + Math.abs(targetY - dot.y) > 0.05 ||
            Math.abs(influence - dot.glow) > 0.002
          ) {
            moving = true;
          } else {
            dot.x = targetX;
            dot.y = targetY;
            dot.glow = influence;
          }
        }
        paint();
        if (moving) schedule();
      };

      const schedule = () => {
        if (frame === null && visible && !document.hidden) {
          frame = requestAnimationFrame(animate);
        }
      };

      const pause = () => {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
        lastTime = 0;
        pointer = null;
      };

      const resize = () => {
        const bounds = root.getBoundingClientRect();
        width = bounds.width;
        height = bounds.height;
        pause();
        if (!width || !height) {
          dots = [];
          setReady(false);
          return;
        }
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        // Bound the number of dots on ultrawide displays.
        const spacing = Math.max(SPACING, Math.sqrt((width * height) / 2400));
        dots = [];
        for (let y = spacing / 2; y < height; y += spacing) {
          for (let x = spacing / 2; x < width; x += spacing) {
            dots.push({ homeX: x, homeY: y, x, y, glow: 0 });
          }
        }
        paint();
        setReady(true);
      };

      const onPointerMove = (event: PointerEvent) => {
        if (event.pointerType === 'touch') return;
        const bounds = root.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        ) {
          if (pointer) {
            pointer = null;
            schedule();
          }
          return;
        }
        pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
        schedule();
      };
      const onPointerLeave = () => {
        pointer = null;
        schedule();
      };
      const onVisibilityChange = () => {
        if (document.hidden) pause();
        else schedule();
      };

      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(root);
      const themeObserver = new MutationObserver(() => {
        idleColor = getComputedStyle(root).color;
        activeColor = getComputedStyle(canvas).color;
        paint();
      });
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      });
      const intersectionObserver =
        typeof IntersectionObserver === 'undefined'
          ? null
          : new IntersectionObserver(([entry]) => {
              visible = entry.isIntersecting;
              if (visible) schedule();
              else pause();
            });
      intersectionObserver?.observe(root);
      hero.addEventListener('pointermove', onPointerMove, { passive: true });
      hero.addEventListener('pointerleave', onPointerLeave);
      document.addEventListener('visibilitychange', onVisibilityChange);
      resize();

      stop = () => {
        pause();
        resizeObserver.disconnect();
        themeObserver.disconnect();
        intersectionObserver?.disconnect();
        hero.removeEventListener('pointermove', onPointerMove);
        hero.removeEventListener('pointerleave', onPointerLeave);
        document.removeEventListener('visibilitychange', onVisibilityChange);
      };
    };

    syncPreferences();
    reducedMotion.addEventListener('change', syncPreferences);
    finePointer.addEventListener('change', syncPreferences);
    return () => {
      stop?.();
      reducedMotion.removeEventListener('change', syncPreferences);
      finePointer.removeEventListener('change', syncPreferences);
    };
  }, [tone, idleOpacity, highlightOpacity]);

  return (
    <div
      ref={rootRef}
      aria-hidden='true'
      className={`pointer-events-none absolute inset-0 overflow-hidden print:hidden ${
        tone === 'navy' ? 'text-white' : 'text-brand-blue-600 dark:text-white'
      }`}
      style={{ maxHeight }}
    >
      <div
        className='absolute inset-0'
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: `${SPACING}px ${SPACING}px`,
          opacity: ready ? 0 : idleOpacity,
        }}
      />
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 h-full w-full ${
          tone === 'navy' ? 'text-cyan-300' : 'text-brand-blue-600 dark:text-cyan-300'
        }`}
        style={{ opacity: ready ? 1 : 0 }}
      />
    </div>
  );
}
