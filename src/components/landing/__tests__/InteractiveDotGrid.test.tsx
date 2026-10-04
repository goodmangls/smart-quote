import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { InteractiveDotGrid } from '../InteractiveDotGrid';

describe('InteractiveDotGrid', () => {
  let reducedMotion: boolean;
  let finePointer: boolean;
  let preferenceListeners: Set<() => void>;
  let frames: Map<number, FrameRequestCallback>;
  let nextFrame: number;
  let time: number;
  let onIntersection: IntersectionObserverCallback;
  let context: CanvasRenderingContext2D;
  let getContext: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    reducedMotion = false;
    finePointer = true;
    preferenceListeners = new Set();
    frames = new Map();
    nextFrame = 0;
    time = 0;
    document.documentElement.classList.remove('dark');
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    vi.stubGlobal('matchMedia', (query: string) => ({
      get matches() {
        return query.includes('reduced-motion') ? reducedMotion : finePointer;
      },
      addEventListener: (_: string, listener: () => void) => preferenceListeners.add(listener),
      removeEventListener: (_: string, listener: () => void) =>
        preferenceListeners.delete(listener),
    }));
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = vi.fn();
        disconnect = vi.fn();
      },
    );
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback) {
          onIntersection = callback;
        }
        observe = vi.fn();
        disconnect = vi.fn();
      },
    );
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 240,
      bottom: 120,
      width: 240,
      height: 120,
      toJSON: () => ({}),
    });
    context = {
      clearRect: vi.fn(),
      setTransform: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      fillStyle: '',
      globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D;
    getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.documentElement.classList.remove('dark');
  });

  function mount() {
    const view = render(
      <section>
        <InteractiveDotGrid />
      </section>,
    );
    return {
      ...view,
      hero: view.container.querySelector('section')!,
      canvas: view.container.querySelector('canvas')!,
    };
  }

  function tick() {
    act(() => {
      const pending = [...frames.values()];
      frames.clear();
      time += 16.67;
      pending.forEach((callback) => callback(time));
    });
  }

  function move(hero: HTMLElement) {
    hero.dispatchEvent(new MouseEvent('pointermove', { clientX: 12, clientY: 12, bubbles: true }));
  }

  it.each(['reduced motion', 'touch input'])(
    'uses the static grid for %s without allocating a canvas context',
    (mode) => {
      reducedMotion = mode === 'reduced motion';
      finePointer = mode !== 'touch input';
      const { canvas } = mount();
      expect(getContext).not.toHaveBeenCalled();
      expect(canvas.style.opacity).toBe('0');
      expect(frames.size).toBe(0);
    },
  );

  it('displaces nearby dots, leaves distant dots in place, then returns to an idle grid', () => {
    const { hero, canvas } = mount();
    expect(canvas.style.opacity).toBe('1');
    expect(frames.size).toBe(0);
    vi.mocked(context.arc).mockClear();
    move(hero);
    tick();
    expect(vi.mocked(context.arc).mock.calls[0][0]).toBeGreaterThan(12);
    expect(vi.mocked(context.arc).mock.calls[9].slice(0, 2)).toEqual([228, 12]);
    fireEvent.pointerLeave(hero);
    for (let i = 0; i < 60 && frames.size; i++) tick();
    expect(frames.size).toBe(0);
    expect(vi.mocked(context.arc).mock.calls.at(-50)?.slice(0, 2)).toEqual([12, 12]);
  });

  it('stops animation when the hero leaves the viewport and on unmount', () => {
    const { hero, unmount } = mount();
    move(hero);
    expect(frames.size).toBe(1);
    act(() =>
      onIntersection(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    );
    expect(frames.size).toBe(0);
    unmount();
    expect(preferenceListeners.size).toBe(0);
  });

  it('responds to a motion preference change while the page is open', () => {
    const { hero, canvas } = mount();
    move(hero);
    act(() => {
      reducedMotion = true;
      preferenceListeners.forEach((listener) => listener());
    });
    expect(canvas.style.opacity).toBe('0');
    expect(frames.size).toBe(0);
    act(() => {
      reducedMotion = false;
      preferenceListeners.forEach((listener) => listener());
    });
    expect(canvas.style.opacity).toBe('1');
  });

  it('refreshes canvas colors immediately after a theme change', async () => {
    const computedStyle = vi.spyOn(window, 'getComputedStyle').mockImplementation(
      () =>
        ({
          color: document.documentElement.classList.contains('dark')
            ? 'rgb(255, 255, 255)'
            : 'rgb(23, 89, 167)',
        }) as CSSStyleDeclaration,
    );
    mount();
    expect(context.fillStyle).toBe('rgb(23, 89, 167)');
    await act(async () => {
      document.documentElement.classList.add('dark');
    });
    expect(context.fillStyle).toBe('rgb(255, 255, 255)');
    expect(computedStyle).toHaveBeenCalledTimes(4);
  });

  it('retains the static grid if the canvas context is unavailable', () => {
    getContext.mockReturnValue(null);
    const { canvas } = mount();
    expect(canvas.style.opacity).toBe('0');
    expect(frames.size).toBe(0);
  });
});
