/**
 * A controllable IntersectionObserver for jsdom, which has none.
 *
 * `report(el, isIntersecting)` delivers an entry to every live observer that
 * watches `el`, the way a real observer would after a scroll.
 */
type Callback = (entries: IntersectionObserverEntry[]) => void;

export interface IntersectionObserverStub {
  instances: Array<{
    callback: Callback;
    options?: IntersectionObserverInit;
    targets: Set<Element>;
    disconnected: boolean;
  }>;
  report: (target: Element, isIntersecting: boolean) => void;
  restore: () => void;
}

export function installIntersectionObserverStub(): IntersectionObserverStub {
  const original = globalThis.IntersectionObserver;
  const instances: IntersectionObserverStub['instances'] = [];

  class StubObserver {
    private readonly record;

    constructor(callback: Callback, options?: IntersectionObserverInit) {
      this.record = { callback, options, targets: new Set<Element>(), disconnected: false };
      instances.push(this.record);
    }
    observe(target: Element) {
      this.record.targets.add(target);
    }
    unobserve(target: Element) {
      this.record.targets.delete(target);
    }
    disconnect() {
      this.record.disconnected = true;
      this.record.targets.clear();
    }
    takeRecords() {
      return [];
    }
  }

  globalThis.IntersectionObserver = StubObserver as unknown as typeof IntersectionObserver;

  return {
    instances,
    report(target, isIntersecting) {
      instances
        .filter((rec) => !rec.disconnected && rec.targets.has(target))
        .forEach((rec) =>
          rec.callback([{ target, isIntersecting } as unknown as IntersectionObserverEntry]),
        );
    },
    restore() {
      globalThis.IntersectionObserver = original;
    },
  };
}
