import { act, fireEvent, render, screen } from '@testing-library/react';
import { PhotoCarousel } from '../PhotoCarousel';
import type { DeliveryPhoto } from '../deliveryPhotos';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', setLanguage: vi.fn(), t: (key: string) => key }),
}));

const photo = (id: string): DeliveryPhoto => ({
  id,
  webpSrcSet: `${id}-880.webp 880w, ${id}-1440.webp 1440w`,
  jpg: `${id}-880.jpg`,
  width: 880,
  height: 587,
  position: 'object-center',
});
const PHOTOS = [photo('a'), photo('b'), photo('c')];
const INTERVAL = 5000;

const mockReducedMotion = (reduce: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

// Pictures are aria-hidden decoration, so query the DOM rather than roles.
const imgs = (container: HTMLElement) => [...container.querySelectorAll('img')];
const visibleSrc = (container: HTMLElement) =>
  container.querySelector('picture.opacity-100 img')?.getAttribute('src');
const loadAll = (container: HTMLElement) => imgs(container).forEach((img) => fireEvent.load(img));

const renderCarousel = (props: Partial<React.ComponentProps<typeof PhotoCarousel>> = {}) =>
  render(<PhotoCarousel sizes='440px' photos={PHOTOS} intervalMs={INTERVAL} {...props} />);

describe('PhotoCarousel', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    vi.useFakeTimers();
    mockReducedMotion(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    window.matchMedia = originalMatchMedia;
  });

  it('mounts only the first photo until it has loaded', () => {
    const { container } = renderCarousel();
    expect(imgs(container).map((i) => i.getAttribute('src'))).toEqual(['a-880.jpg']);

    loadAll(container);
    expect(imgs(container).map((i) => i.getAttribute('src'))).toEqual(['a-880.jpg', 'b-880.jpg']);
  });

  it('crossfades to the next photo after the interval, once it has loaded', () => {
    const { container } = renderCarousel();
    loadAll(container); // a loads → b mounts
    expect(visibleSrc(container)).toBe('a-880.jpg');

    // b is mounted but not loaded yet: the swap must wait for it.
    act(() => vi.advanceTimersByTime(INTERVAL * 2));
    expect(visibleSrc(container)).toBe('a-880.jpg');

    loadAll(container); // b loads
    act(() => vi.advanceTimersByTime(INTERVAL));
    expect(visibleSrc(container)).toBe('b-880.jpg');
  });

  it('wraps around after the last photo', () => {
    const { container } = renderCarousel({ startIndex: 2 });
    expect(visibleSrc(container)).toBe('c-880.jpg');
    loadAll(container);
    loadAll(container);
    act(() => vi.advanceTimersByTime(INTERVAL));
    expect(visibleSrc(container)).toBe('a-880.jpg');
  });

  it('stops rotating while paused and resumes on play', () => {
    const { container } = renderCarousel();
    loadAll(container);
    loadAll(container);

    fireEvent.click(screen.getByRole('button', { name: 'photos.pause' }));
    act(() => vi.advanceTimersByTime(INTERVAL * 3));
    expect(visibleSrc(container)).toBe('a-880.jpg');

    fireEvent.click(screen.getByRole('button', { name: 'photos.play' }));
    act(() => vi.advanceTimersByTime(INTERVAL));
    expect(visibleSrc(container)).toBe('b-880.jpg');
  });

  it('shows one still photo, no control and no prefetch under reduced motion', () => {
    mockReducedMotion(true);
    const { container } = renderCarousel();
    loadAll(container);
    act(() => vi.advanceTimersByTime(INTERVAL * 3));

    expect(imgs(container)).toHaveLength(1);
    expect(visibleSrc(container)).toBe('a-880.jpg');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('loads only the opening photo eagerly, and only with priority', () => {
    const { container, unmount } = renderCarousel({ priority: true });
    loadAll(container);
    const [first, second] = imgs(container);
    expect(first).toHaveAttribute('loading', 'eager');
    expect(first).toHaveAttribute('fetchpriority', 'high');
    expect(second).toHaveAttribute('loading', 'lazy');
    unmount();

    const lazy = renderCarousel();
    expect(imgs(lazy.container)[0]).toHaveAttribute('loading', 'lazy');
  });
});
