declare module '@sentry/browser' {
  export function captureException(exception: unknown, captureContext?: unknown): string;
  export function captureMessage(message: string, captureContext?: unknown): string;
  export function withScope(callback: (scope: unknown) => void): void;
  export function setUser(user: unknown): void;
  export function setContext(name: string, context: unknown): void;
  export function addBreadcrumb(breadcrumb: unknown): void;
  export function init(options: Record<string, unknown>): void;
  export function browserTracingIntegration(options?: Record<string, unknown>): unknown;
  export function replayIntegration(options?: Record<string, unknown>): unknown;
}

declare module '@sentry/react' {
  export function init(options: Record<string, unknown>): void;
  export function browserTracingIntegration(options?: Record<string, unknown>): unknown;
  export function replayIntegration(options?: Record<string, unknown>): unknown;
}
