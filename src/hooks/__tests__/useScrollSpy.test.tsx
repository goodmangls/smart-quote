import { act, renderHook } from '@testing-library/react';
import { useScrollSpy } from '../useScrollSpy';
import {
  installIntersectionObserverStub,
  type IntersectionObserverStub,
} from '@/test/intersectionObserverStub';

const IDS = ['s-a', 's-b', 's-c'] as const;
const OPTIONS = { topOffset: 96 };

const mountSections = () =>
  IDS.map((id) => {
    const el = document.createElement('section');
    el.id = id;
    document.body.appendChild(el);
    return el;
  });

const setScrollGeometry = ({ atBottom }: { atBottom: boolean }) => {
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    value: 5000,
  });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    value: atBottom ? 4200 : 1000,
  });
};

describe('useScrollSpy', () => {
  let io: IntersectionObserverStub | undefined;
  let sections: HTMLElement[] = [];

  beforeEach(() => {
    sections = mountSections();
    setScrollGeometry({ atBottom: false });
  });

  afterEach(() => {
    sections.forEach((el) => el.remove());
    io?.restore();
    io = undefined;
    vi.useRealTimers();
  });

  it('starts on the first section and still follows clicks without IntersectionObserver', () => {
    const original = globalThis.IntersectionObserver;
    // @ts-expect-error — simulating an environment without the API
    delete globalThis.IntersectionObserver;
    try {
      const { result } = renderHook(() => useScrollSpy(IDS, OPTIONS));
      expect(result.current.activeId).toBe('s-a');

      act(() => result.current.selectId('s-c'));
      expect(result.current.activeId).toBe('s-c');
    } finally {
      globalThis.IntersectionObserver = original;
    }
  });

  it('highlights the first section inside the reading band', () => {
    io = installIntersectionObserverStub();
    const { result } = renderHook(() => useScrollSpy(IDS, OPTIONS));

    act(() => {
      io!.report(sections[1], true);
      io!.report(sections[2], true);
    });
    expect(result.current.activeId).toBe('s-b');

    act(() => io!.report(sections[1], false));
    expect(result.current.activeId).toBe('s-c');
  });

  it('keeps a clicked section highlighted while the smooth scroll passes others', () => {
    vi.useFakeTimers();
    io = installIntersectionObserverStub();
    const { result } = renderHook(() => useScrollSpy(IDS, OPTIONS));

    act(() => result.current.selectId('s-c'));
    // Sections scrolled past on the way must not steal the highlight.
    act(() => io!.report(sections[1], true));
    expect(result.current.activeId).toBe('s-c');

    // Once the scroll settles, the spy follows the reader again.
    act(() => {
      window.dispatchEvent(new Event('scrollend'));
    });
    act(() => {
      io!.report(sections[1], false);
      io!.report(sections[0], true);
    });
    expect(result.current.activeId).toBe('s-a');
  });

  it('releases the click lock after a timeout when scrollend never fires', () => {
    vi.useFakeTimers();
    io = installIntersectionObserverStub();
    const { result } = renderHook(() => useScrollSpy(IDS, OPTIONS));

    act(() => result.current.selectId('s-c'));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    act(() => io!.report(sections[0], true));
    expect(result.current.activeId).toBe('s-a');
  });

  it('activates the last section at the bottom of the page even if it never reaches the band', () => {
    io = installIntersectionObserverStub();
    const { result } = renderHook(() => useScrollSpy(IDS, OPTIONS));

    setScrollGeometry({ atBottom: true });
    act(() => io!.report(sections[1], true));
    expect(result.current.activeId).toBe('s-c');
  });

  it('does not re-subscribe when the caller passes a new array with the same ids', () => {
    io = installIntersectionObserverStub();
    const { rerender } = renderHook(({ ids }) => useScrollSpy(ids, OPTIONS), {
      initialProps: { ids: [...IDS] },
    });

    rerender({ ids: [...IDS] });
    expect(io.instances).toHaveLength(1);
  });
});
