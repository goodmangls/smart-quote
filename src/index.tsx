import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Sentry는 idle 시점까지 지연 로드 — 메인 번들에서 ~300KB 분리. 첫 1-2초 사이
// 발생한 에러는 누락되지만, 마케팅 랜딩에서 acceptable.
function initSentryDeferred() {
  import('@sentry/react').then(({ init, browserTracingIntegration, replayIntegration }) => {
    init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [browserTracingIntegration(), replayIntegration()],
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      enabled: import.meta.env.PROD || import.meta.env.VITE_ENABLE_SENTRY === 'true',
    });
  });
}

if (typeof window !== 'undefined') {
  if ('requestIdleCallback' in window) {
    (window as Window & typeof globalThis).requestIdleCallback(initSentryDeferred, { timeout: 2000 });
  } else {
    setTimeout(initSentryDeferred, 1500);
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for offline caching
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}