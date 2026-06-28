import { useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Language } from '@/i18n/translations';
import { updateContext } from '@/lib/intercom';

const APP_ID = import.meta.env.VITE_INTERCOM_APP_ID || 'k5z51xs2';
const WIDGET_URL = `https://widget.intercom.io/widget/${APP_ID}`;

/**
 * Force Intercom Messenger UI to a single locale regardless of in-app language.
 * Set to `null` to fall back to `INTERCOM_LANG_MAP` and translate per user preference.
 *
 * Current policy (2026-04-11): English-only. Goodman GLS operators reply in English
 * and multi-language saved replies/auto-messages are not yet prepared on the
 * Intercom dashboard, so we keep the messenger UI in a single, consistent locale.
 */
const FORCED_INTERCOM_LANGUAGE: string | null = 'en';

/**
 * Map our in-app language codes to Intercom Messenger `language_override` codes.
 * Kept for when we re-enable multi-language Messenger (set FORCED_INTERCOM_LANGUAGE
 * to `null` to activate). Intercom uses IETF tags; our `cn` maps to `zh-CN`.
 * @see https://www.intercom.com/help/en/articles/180-localize-intercom-to-work-with-multiple-languages
 */
const INTERCOM_LANG_MAP: Record<Language, string> = {
  en: 'en',
  ko: 'ko',
  ja: 'ja',
  cn: 'zh-CN',
};

function resolveIntercomLanguage(language: Language): string {
  return FORCED_INTERCOM_LANGUAGE ?? INTERCOM_LANG_MAP[language];
}

/** Best-effort browser timezone (IANA), e.g. 'Asia/Seoul'. */
function detectTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

/** Inject Intercom script once */
function loadScript() {
  if (document.getElementById('intercom-script')) return;
  const s = document.createElement('script');
  s.id = 'intercom-script';
  s.src = WIDGET_URL;
  s.async = true;
  document.head.appendChild(s);
}

/** Safe wrapper around window.Intercom */
function ic(method: string, arg?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && typeof window.Intercom === 'function') {
    if (arg) {
      window.Intercom(method, arg);
    } else {
      window.Intercom(method);
    }
  }
}

declare global {
  interface Window {
    Intercom?: (...args: unknown[]) => void;
    intercomSettings?: Record<string, unknown>;
  }
}

export function Intercom() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const location = useLocation();
  const hasBootedRef = useRef(false);
  const prevUserIdRef = useRef<string | null>(null);
  const prevLangRef = useRef<Language | null>(null);

  const intercomLang = resolveIntercomLanguage(language);
  const timezone = useMemo(() => detectTimezone(), []);

  // Load script on mount
  useEffect(() => {
    if (!APP_ID) return;
    loadScript();
  }, []);

  // Boot/reboot when user changes
  useEffect(() => {
    if (!APP_ID) return;

    const boot = () => {
      const baseSettings: Record<string, unknown> = {
        app_id: APP_ID,
        language_override: intercomLang,
        custom_attributes: {
          browser_language: language,
          ...(timezone ? { timezone } : {}),
        },
      };

      if (user) {
        ic('boot', {
          ...baseSettings,
          user_id: String(user.id),
          user_hash: user.intercom_hash,
          name: user.name || user.email?.split('@')[0] || '',
          email: user.email || '',
          ...(user.company ? { company: { company_id: user.company, name: user.company } } : {}),
          custom_attributes: {
            ...(baseSettings.custom_attributes as Record<string, unknown>),
            role: user.role,
            nationality: user.nationality || '',
          },
        });
      } else {
        // Anonymous visitors still get localized messenger UI.
        ic('boot', baseSettings);
      }
    };

    const currentUserId = user ? String(user.id) : null;
    let script: HTMLElement | null = null;

    const runBoot = () => {
      boot();
      hasBootedRef.current = true;
      prevUserIdRef.current = currentUserId;
      prevLangRef.current = language;
    };

    // First visit must boot anonymous users too. A null previous/current user id
    // used to skip this branch, so the Messenger script loaded without a boot call.
    if (!hasBootedRef.current || prevUserIdRef.current !== currentUserId) {
      if (hasBootedRef.current) {
        ic('shutdown');
      }
      // Wait for script to load if first boot
      if (typeof window.Intercom === 'function') {
        runBoot();
      } else {
        // Script still loading — wait for it
        script = document.getElementById('intercom-script');
        if (script) {
          script.addEventListener('load', runBoot, { once: true });
        }
      }
    } else if (user) {
      // Same user, profile may have updated (e.g. intercom_hash arrived via refresh)
      ic('update', {
        user_id: String(user.id),
        user_hash: user.intercom_hash,
        name: user.name || '',
        email: user.email || '',
      });
    }

    return () => {
      script?.removeEventListener('load', runBoot);
    };
  }, [user, intercomLang, language, timezone]);

  // React to language change without a full reboot.
  // Intercom's `update` accepts `language_override`; the messenger UI swaps
  // locale on the fly so overseas partners see their chosen language immediately.
  useEffect(() => {
    if (!APP_ID) return;
    if (prevLangRef.current === null) {
      prevLangRef.current = language;
      return;
    }
    if (prevLangRef.current !== language) {
      ic('update', {
        language_override: intercomLang,
        custom_attributes: {
          browser_language: language,
          ...(timezone ? { timezone } : {}),
        },
      });
      prevLangRef.current = language;
    }
  }, [language, intercomLang, timezone]);

  // Route-change tracking — operators see which page the partner is on.
  // Keeps the Intercom inbox contextual without a full reboot.
  useEffect(() => {
    if (!APP_ID) return;
    updateContext({ last_page: location.pathname });
  }, [location.pathname]);

  // Shutdown on unmount
  useEffect(() => {
    return () => {
      ic('shutdown');
    };
  }, []);

  return null;
}
