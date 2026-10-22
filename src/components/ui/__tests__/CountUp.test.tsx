import { act, render } from '@testing-library/react';
import { CountUp } from '../CountUp';
import {
  installIntersectionObserverStub,
  type IntersectionObserverStub,
} from '@/test/intersectionObserverStub';

const visibleText = (container: HTMLElement) =>
  container.querySelector('[aria-hidden="true"]')?.textContent;
const srText = (container: HTMLElement) => container.querySelector('.sr-only')?.textContent;
const root = (container: HTMLElement) => container.firstElementChild as Element;

// jsdom has no matchMedia, so stub the global rather than spy on it.
const mockReducedMotion = (reduce: boolean) => {
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches: reduce && query.includes('reduce'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList,
  );
};

describe('CountUp', () => {
  let io: IntersectionObserverStub | undefined;

  afterEach(() => {
    io?.restore();
    io = undefined;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders the final value when IntersectionObserver is unavailable (prerender, tests)', () => {
    const original = globalThis.IntersectionObserver;
    // @ts-expect-error — simulating an environment without the API
    delete globalThis.IntersectionObserver;
    try {
      const { container } = render(<CountUp value={220} suffix='+' />);
      expect(visibleText(container)).toBe('220+');
      expect(srText(container)).toBe('220+');
    } finally {
      globalThis.IntersectionObserver = original;
    }
  });

  it('stays on the final value when it is already on screen at load', () => {
    mockReducedMotion(false);
    io = installIntersectionObserverStub();
    const { container } = render(<CountUp value={220} suffix='+' />);

    act(() => io!.report(root(container), true));

    expect(visibleText(container)).toBe('220+');
    expect(io.instances.every((rec) => rec.disconnected)).toBe(true);
  });

  it('starts at zero below the fold and counts to the value once scrolled into view', () => {
    mockReducedMotion(false);
    io = installIntersectionObserverStub();
    // Every frame lands past the duration, so one tick reaches the end.
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(performance.now() + 10_000);
      return 1;
    });
    const { container } = render(<CountUp value={220} suffix='+' />);

    act(() => io!.report(root(container), false));
    expect(visibleText(container)).toBe('0+');
    // Screen readers never see the intermediate value.
    expect(srText(container)).toBe('220+');

    act(() => io!.report(root(container), true));
    expect(visibleText(container)).toBe('220+');
  });

  it('treats an element scrolled past as entered, so jumping over it cannot leave it at 0', () => {
    // A real observer only fires on crossings; jumping from below the viewport
    // to above it crosses nothing. The root must extend upward so "passed"
    // still counts as intersecting. jsdom can't lay this out, so pin the margin.
    mockReducedMotion(false);
    io = installIntersectionObserverStub();
    render(<CountUp value={220} suffix='+' />);

    const [top] = String(io.instances[0].options?.rootMargin).split(' ');
    expect(parseFloat(top)).toBeGreaterThanOrEqual(10_000);
    expect(top.endsWith('%')).toBe(true);
  });

  it('never observes or animates when the user prefers reduced motion', () => {
    mockReducedMotion(true);
    io = installIntersectionObserverStub();
    const { container } = render(<CountUp value={3} />);

    expect(io.instances).toHaveLength(0);
    expect(visibleText(container)).toBe('3');
  });
});
