/**
 * BridgeLogis Insights — Standardized Disclaimer component
 *
 * Auto-injects 1~3 disclaimer blocks based on `lang` + `topic`.
 * Spec: editorial-policy.md §3.1~3.3
 *
 * Usage in MDX:
 *   <Disclaimer lang="ko" topic="fsc-trends" />
 *
 * Validator expects exact keyword sets (scripts/pillar-validate.mjs DISCLAIMERS).
 * This component renders all required keywords in standard form.
 */
import type { ReactElement } from 'react';

type Lang = 'ko' | 'en';
type Topic =
  | 'air-cargo' | 'ocean-freight' | 'fsc-trends' | 'dg' | 'cold-chain'
  | 'e-commerce' | 'gssa' | 'korea-market' | 'carrier-news' | 'customs-trade';

interface DisclaimerProps {
  lang: Lang;
  topic?: Topic;
}

// Topics that involve forecasting → require disclaimer #3
const PREDICTIVE_TOPICS = new Set<Topic>(['korea-market', 'carrier-news', 'fsc-trends']);

/** Disclaimer #1 — Rate accuracy (universal) */
function RatesDisclaimer({ lang }: { lang: Lang }): ReactElement {
  if (lang === 'ko') {
    return (
      <p className="disclaimer disclaimer-rates">
        본 정보는 정보 제공 목적이며, 실제 운임은 화물 특성·인코텀즈·계약 조건·발송일자에 따라 달라질 수 있습니다.
        정확한 견적은 BridgeLogis 운임 계산기(<a href="/quote">/quote</a>)를 이용하시고, 대량/특수 화물의
        경우 영업팀(<a href="mailto:sales@goodmangls.com">sales@goodmangls.com</a>)에 직접 문의해 주십시오.
        UPS·DHL 익스프레스 화물은 DAP 인코텀즈만 지원합니다.
      </p>
    );
  }
  return (
    <p className="disclaimer disclaimer-rates">
      This is informational only. The actual rate depends on cargo characteristics, incoterm, contract
      conditions, and pickup date. For real precise quotes use the BridgeLogis calculator
      (<a href="/quote">/quote</a>); for large or specialty cargo, contact our sales team
      (<a href="mailto:sales@goodmangls.com">sales@goodmangls.com</a>) directly. UPS and DHL Express
      shipments are supported under DAP incoterm only.
    </p>
  );
}

/** Disclaimer #2 — Legal/tax/customs (universal) */
function LegalDisclaimer({ lang }: { lang: Lang }): ReactElement {
  if (lang === 'ko') {
    return (
      <p className="disclaimer disclaimer-legal">
        본 콘텐츠는 일반 정보 제공이며 법률·세무·관세 자문이 아닙니다. 구체적 사례는 관세사·세무사 또는
        자격을 갖춘 법률 전문가에게 자문하시기 바랍니다. BridgeLogis와 Goodman GLS는 본 콘텐츠 의존으로
        인한 손실에 대해 책임지지 않습니다.
      </p>
    );
  }
  return (
    <p className="disclaimer disclaimer-legal">
      This content is for general information only and is not legal, tax, or customs advice. Consult
      qualified customs brokers, tax advisors, or legal counsel for specific cases. BridgeLogis and
      Goodman GLS bear no responsibility for losses arising from reliance on this content.
    </p>
  );
}

/** Disclaimer #3 — Future/forecast (predictive topics only) */
function ForecastDisclaimer({ lang }: { lang: Lang }): ReactElement {
  if (lang === 'ko') {
    return (
      <p className="disclaimer disclaimer-forecast">
        본 콘텐츠는 발행일 기준 공개 자료를 토대로 작성되었으며, 미래 시장 동향·운임 변동·캐리어 정책에
        대한 예측은 보증되지 않습니다. 시장 상황은 빠르게 변할 수 있으므로 의사결정 시 최신 정보를
        확인하시기 바랍니다.
      </p>
    );
  }
  return (
    <p className="disclaimer disclaimer-forecast">
      This content was prepared as of the publication date from publicly available sources. Future
      market trends, freight rate movements, and carrier policy predictions are not guaranteed.
      Markets can change rapidly — verify the latest information when making decisions.
    </p>
  );
}

/** AI usage notice + editor contact (universal footer) */
function AiNotice({ lang }: { lang: Lang }): ReactElement {
  if (lang === 'ko') {
    return (
      <p className="disclaimer disclaimer-ai">
        본 브리핑은 BridgeLogis Editorial이 작성하고, AI(Claude Haiku) 보조를 받아 사람이 검수·편집했습니다.
        사실 오류 발견 시{' '}
        <a href="mailto:editorial@goodmangls.com">editorial@goodmangls.com</a> 으로 알려주십시오.
      </p>
    );
  }
  return (
    <p className="disclaimer disclaimer-ai">
      This briefing was authored by BridgeLogis Editorial with AI assistance (Claude Haiku) and human
      review. Please report factual errors to{' '}
      <a href="mailto:editorial@goodmangls.com">editorial@goodmangls.com</a>.
    </p>
  );
}

export function Disclaimer({ lang, topic }: DisclaimerProps): ReactElement {
  const showForecast = topic !== undefined && PREDICTIVE_TOPICS.has(topic);
  return (
    <section className="disclaimers" aria-label={lang === 'ko' ? '면책 고지' : 'Disclaimers'}>
      <RatesDisclaimer lang={lang} />
      <LegalDisclaimer lang={lang} />
      {showForecast && <ForecastDisclaimer lang={lang} />}
      <AiNotice lang={lang} />
    </section>
  );
}

export default Disclaimer;
