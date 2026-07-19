# Product Marketing Context

*Last updated: 2026-05-08*
*Source: 자동 초안 — copy.md / README.md / CLAUDE.md / 메모리 기반. 운영 시나리오: 외부 SaaS (BridgeLogis 자체 브랜드).*

## Product Overview
**One-liner:** 190개국 UPS/DHL Express 견적을 1초 만에 산출하는 글로벌 항공 익스프레스 견적·관리 플랫폼.
**What it does:** GSSA(General Sales & Service Agent) KS Ways 가 운영하는 UPS·DHL Express 실시간 견적 도구. 출발지·도착지·화물 정보를 입력하면 zone 기반 운임 + FSC + add-on(EAS/RAS/Surge) + 자동 마진 계산을 1초 안에 산출하고, 견적 저장(`SQ-YYYY-NNNN`)·PDF·관리자 마진/FSC/요율 운영까지 통합.
**Product category:** B2B 익스프레스 화물 견적 SaaS / GSSA 운영 자동화 플랫폼.
**Product type:** SaaS — Frontend(React 19 + Vite 6) + Rails 8 API. JWT 인증, 역할 기반(Admin/Member) 접근.
**Business model:** B2B SaaS — BridgeLogis 자체 브랜드로 한국발 UPS/DHL Express 화주에게 셀프서비스 견적·마진 자동화 제공. KS Ways 의 GSSA 운영 노하우를 외부 화주가 직접 활용할 수 있게 개방. (가격 정책은 미정 — Member 무료 견적 + 정밀 견적/계약 인입 모델 또는 회사별 구독제 가능성.)

## Target Audience
**Target companies:** 한국에서 UPS/DHL Express 로 해외 발송하는 중소·중견 화주, 한국발 글로벌 e-commerce 셀러, 무역회사, GSSA 파트너 네트워크(EAN/MPL) 회원사, 포워더(자체 견적 비교용).
**Decision-makers:** 화주 측 무역·물류 담당자, e-commerce 운영자, 포워더 영업, 한국 본사 운영팀(BridgeLogis 운영자 = Admin).
**Primary use case:** 매번 손으로 계산하던 UPS/DHL 운임·FSC·add-on·마진을 단일 입력으로 즉시 산출하고, 캐리어 비교·PDF·이력 관리까지 한 흐름으로 처리.
**Jobs to be done:**
- UPS Z1~Z10 / DHL Z1~Z8 zone 별 정확한 요율을 자동 적용
- 매주 월요일 변동되는 FSC% 와 환율(1,400원 기본)을 단일 진실로 운영
- EAS/RAS(86개국 39,876 zip) 자동 감지로 누락 요금 0
- 마진 정책(P100/P90/P50/P0 priority) 을 코드가 아닌 운영 데이터로 관리
- 회원 영업의 견적 저장 알림(Slack)으로 영업 흐름 실시간 가시화
**Use cases:**
- Korea → US 5kg 박스 즉시 견적
- 진공포장(VACUUM)·SKID·WOODEN_BOX 옵션별 비용 비교
- Israel/중동 Surge Fee 자동 적용
- DAP-only 인코텀즈 정책 자동 강제
- 월요일 FSC 갱신 후 모든 견적 자동 반영

## Personas
| Persona | Cares about | Challenge | Value we promise |
|---|---|---|---|
| 화주 무역·물류 담당자 (Member, Primary) | UPS vs DHL 빠른 비교, 신뢰 가능한 단가 | 포워더 견적 회신 지연, 환율·FSC 불투명 | "셀프서비스 견적, 24/7, 4개 언어" |
| e-commerce 운영자 (Member) | 발송별 ROI, 다국가 발송 단가 비교 | 매번 다른 견적, FSC 변동성 | "1초 견적, 즉시 비교, PDF 다운로드" |
| BridgeLogis 운영팀 (Admin) | FSC·환율·마진·고객 통합 운영 | 캐리어 정책 변경, 마진 정책 일관성 | "FSC/환율/마진 단일 콘솔, audit log 전부" |
| GSSA 파트너사 영업 (Member) | 매번 손계산, 실수 없는 마진 적용 | 분산된 엑셀, 환율·FSC 누락 위험 | "1초 견적, 마진 자동, 저장 시 Slack 알림" |

## Problems & Pain Points
**Core problem:** UPS/DHL 익스프레스 견적은 zone × 무게 × FSC × add-on × 환율 × 마진의 6중 변수 곱셈으로 산출되는데, 대부분의 영업·운영팀이 여전히 엑셀과 손계산으로 처리해 누락·오차·정책 일관성 결여가 발생.
**Why alternatives fall short:**
- 캐리어 공식 사이트: 단일 캐리어, 마진/할증/환율 미반영
- 일반 ERP의 운임 모듈: 한국발 GSSA 정책 미반영, FSC 자동 갱신 부재
- 엑셀: 매주 FSC 변경 시 30+ 시트 수동 갱신, 휴먼 에러
- 외부 견적 SaaS: 한국 GSSA 마진 룰(P100/P90/P50/P0) 미지원, 4개국어 부재
**What it costs them:** 매주 30분~수시간의 FSC/환율 갱신, 견적 누락으로 인한 마진 손실, 매니저의 정산 검수 시간, 영업 응답 지연.
**Emotional tension:** "이번 주 FSC 또 빠뜨리지 않았나", "고객에게 보낸 견적이 사실 적자였다", "신입 영업이 마진을 잘못 적용했다".

## Competitive Landscape
**Direct:** 캐리어 공식 견적기 (UPS Worldship, DHL MyDHL+) — 단일 캐리어, 한국 GSSA 마진/환율/세부 add-on 미반영.
**Secondary:** Freightos, Cargobase 같은 일반 화물 마켓플레이스 — 익스프레스보다 sea/air freight 중심, 한국 GSSA 워크플로 미반영.
**Indirect:** 자체 엑셀 + 카톡 + 이메일 운영 — 무료지만 휴먼 에러 + 매주 갱신 부담.

## Differentiation
**Key differentiators:**
- 한국 GSSA 운영 현실에 100% 맞춤 (KS Ways 실 운영 기반)
- Frontend·Backend 동일 계산 로직 미러링 → 즉시 UI 반응 + 영구 저장 일치
- 공식 UPS 2026 Service Guide 기반 Z1~Z10 zone, EAS/RAS 86개국 39,876 zip 자동 감지
- 마진 룰 우선순위 엔진(P100/P90/P50/P0), audit log, 5분 캐시
- 4개국어(en/ko/cn/ja) UI, 다크모드, AI 챗봇(Claude) 내장
- BridgeLogis 디자인 시스템(DESIGN.md v1.1.0) — Tailwind 토큰 SSOT, 차트 컬러 통합
**How we do it differently:** 캐리어 가격표를 코드가 아닌 운영 데이터로 다룸 → 비개발자 운영팀이 직접 정책 변경 가능.
**Why that's better:** FSC 매주 변동, surcharge 분기 변동, EAS/RAS 추가 발표 → 코드 배포 없이 즉시 반영.
**Why customers choose us:** GSSA 가격 구조에 정통한 한국 파트너(KS Ways 운영 기반)가 만든 셀프서비스 견적 → 24/7 즉시 응답, 4개국어 대응, 화주가 직접 단가·시나리오를 비교하고 의사결정.

## Objections
| Objection | Response |
|---|---|
| "UPS/DHL 사이트에서 직접 견적 받으면 되지 않나" | 마진·FSC·환율·EAS/RAS·Surge Fee 통합 적용은 GSSA 운영팀만 가능. |
| "자체 엑셀이 더 빠르다" | FSC 변경 주기·EAS/RAS 86개국·마진 룰 4단계를 엑셀로는 일관 운영 불가. |
| "또 다른 시스템을 배워야 하나" | 단일 입력 → 1초 견적 + PDF 다운로드. 학습 5분. |
| "한국 회사가 만든 시스템인데 우리가 써도 되나" | 4개국어(en/ko/cn/ja) UI, 24/7 셀프서비스, 화주 단위 회원가입. |

**Anti-persona:** Sea/air cargo·일반 항공 화물 (smart-quote-main 은 익스프레스 전용, air cargo/SU tariff 는 별도 사이클로 보류). UPS/DHL 외 캐리어 사용자(FedEx/EMS는 미지원). 자산 100억+ 의 super-large enterprise(자체 TMS 보유).

## Switching Dynamics
**Push:** 매주 FSC 수기 갱신 피로, 신입 영업의 마진 실수, 누락된 EAS/RAS 청구, 정산 매니저의 검수 시간.
**Pull:** 1초 견적, FSC 자동 갱신(rates.ts + rates.rb 동시), 마진 룰 P100~P0 자동 매칭, Slack 알림으로 영업 가시성.
**Habit:** 30개 엑셀 시트, 카톡 단톡 견적 회신, 매주 월요일 FSC 수기 업데이트.
**Anxiety:** "데이터 마이그레이션 잘 될까", "캐리어 정책 또 바뀌면 누가 갱신하나", "장애 시 영업이 멈춘다".

## Customer Language
**How they describe the problem:**
- "포워더에게 견적 받는 데 반나절이 걸린다"
- "UPS 와 DHL 중 어느 게 더 싼지 비교가 안 된다"
- "FSC 가 매주 바뀌어서 직접 갱신해야 한다"
- "환율 적용이 견적마다 다르다"

**How they describe us:**
- "190개국 1초 견적" (Hero copy)
- "Bridging Your Cargo to the World" (Tagline)

**Words to use:** GSSA, UPS Express Saver, DHL Express Worldwide, FSC, zone, EAS, RAS, Surge Fee, Margin Rule, DAP, Incoterm, BridgeLogis, Smart Quote.
**Words to avoid:** "Forwarder/포워더" — KS Ways 는 GSSA 이지 forwarder 가 아님. "FedEx" — 미지원. "Sea freight"·"air cargo (general)" — 본 제품은 익스프레스 전용. "EMS" — 별개.
**Glossary:**
| Term | Meaning |
|---|---|
| GSSA | General Sales & Service Agent — 캐리어를 대신해 영업·서비스를 수행하는 한국 대리점 |
| FSC | Fuel Surcharge — 연료할증료, 매주 월요일 갱신 |
| EAS / RAS / DAS | Extended / Remote / Delivery Area Surcharge |
| DAP | Delivered at Place — UPS/DHL 익스프레스 본 제품의 유일한 인코텀즈 |
| Markup margin | `revenue = cost × (1 + margin%)`, KRW 100 단위 올림 |
| EAN / MPL | KS Ways 가 회원인 글로벌 GSSA 네트워크 |

## Brand Voice
**Tone:** 전문적, 정확, 신속. 익스프레스 화물 산업 답게 시간·정확성 강조.
**Style:** 한국어는 정중한 비즈니스 톤("~ 입력해주세요", "초기화"), 영문은 절제된 명령형("Get Started", "Reset"). 마케팅 카피는 수치 우선 ("190개국", "1초", "3 Carriers").
**Personality:** Reliable, fast, global, multi-lingual, B2B-grade.
**Visual ID:** BridgeLogis brand-blue·cyan·navy·deep-blue·gold (DESIGN.md v1.1.0). 레거시 jways-*·accent-*·blue-*·sky-* 사용 금지.

## Proof Points
**Metrics:**
- 190개국, UPS Z1~Z10 + DHL Z1~Z8 zone 커버
- EAS/RAS 86개국, 39,876 zip ranges, binary search O(log n)
- DHL 19종 + UPS 6종 add-on 자동 감지
- 32 test files, 1,188 tests (Vitest), RSpec backend
- 4개 언어 i18n, 390+ translation keys
- Vercel + Render(Singapore) 자동 배포
**Customers / Operators:** KS Ways (operator). GSSA 파트너 그룹: KS Ways · Globe Air Cargo (ECS) · Extrans Air · Daejoo Air · Apex Logistics.
**Testimonials:** *(미수집 — 외부 SaaS 시나리오 전환 시 1순위)*
**Value themes:**
| Theme | Proof |
|---|---|
| 속도 | 1초 견적, useMemo 즉시 계산, FSC 자동 동기화 |
| 정확성 | UPS 2026 Service Guide 100% 반영, audit log, 1,188 tests |
| 글로벌 | 190개국, 4개 언어, 24/7 |
| 통합 운영 | 마진 룰 + FSC + 환율 + add-on + Slack + PDF 단일 워크플로 |

## Goals
**Business goal:** BridgeLogis 자체 브랜드로 한국발 UPS/DHL Express 셀프서비스 견적 시장 선점. 화주 회원가입 → 첫 견적 저장 → 정밀 견적/계약 인입 전환율 확보. 디지털 채널 매출 비중 확대.
**Conversion action:** 랜딩(`bridgelogis.com`) → "Get Started / 견적 시작하기" → 회원가입(회사명·국적·물류 네트워크) → 첫 셀프서비스 견적 → PDF 다운로드 → 정밀 견적/계약 문의(채팅 또는 직접 컨택).
**Current metrics:**
- Live: `bridgelogis.com` (production), `smart-quote-main.vercel.app`
- Backend: Render Singapore, `/up` healthcheck
- 환율 기본값: 1,400 KRW (2026-05-07 변경)
- FSC: UPS 45.50% / DHL 48.00% (2026-04-27 기준)
- 가입 자격: 현재 화주·GSSA 네트워크에 개방(공개 회원가입)

---

## Open Questions (사용자 확인 필요)
1. 화주 회원가입을 100% 공개로 운영할 것인가, 회사 인증/심사 단계를 둘 것인가?
2. 가격 정책: 견적 자체는 무료 + 정밀 견적/계약 시 수익 모델인가, 회사별 구독제 도입 가능성인가?
3. air cargo / SU tariff 보류는 영구 제외인가, 추후 phase 인가? (메모리: 별도 사이클)
4. FedEx 추가 계획? (smart-quote-emax 는 FedEx 지원, 본 제품은 UPS/DHL 만)
5. 4개국어 중 cn/ja 의 실제 타겟 비중은? 마케팅 우선순위 어디부터?
6. BridgeLogis 의 SEO/마케팅 채널은 어디에 집중? (한국 무역·e-commerce 커뮤니티, 네이버, LinkedIn, 직접 영업?)
