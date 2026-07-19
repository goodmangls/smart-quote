# Smart Quote 로드맵 확장 — CargoAI 벤치마킹

> **작성일**: 2026-04-04
> **참고**: [CargoAI (cargoai.co)](https://www.cargoai.co/)
> **기존 로드맵**: Phase 1~5 (캐리어 API → 예약 → 추적 → 분석 → SaaS API)

---

## CargoAI 핵심 분석

CargoAI는 항공화물(Air Cargo) 디지털 플랫폼으로, **CargoMART**(포워더용 올인원 대시보드)와 **CargoCONNECT**(API 통합)를 주력 제품으로 운영한다. 104개 항공사 + 23,000+ 포워더가 사용하며, 2025 Q4 기준 전년 대비 60% 성장을 달성했다.

### CargoAI 제품 구조

| 제품 | 대상 | 핵심 기능 |
|------|------|-----------|
| **CargoMART** | 포워더 | 스케줄 검색, eBooking, eQuote, Track & Trace, CO2 대시보드, 디지털 Wallet |
| **CargoCONNECT** | TMS/ERP | Schedule API, Rates & Book API, Tracking API (200+ 항공사) |
| **CargoGATE** | 항공사/GSA | 자체 eBooking 플랫폼 구축 (White-label) |
| **Cargo2ZERO** | 전체 | IATA RP1678 기준 CO2 배출량 추적/리포트 |
| **AgenticAI** | 전체 | AI 에이전트 기반 워크플로우 자동화 (2025 출시) |

---

## Smart Quote 로드맵 반영 사항

### 기존 Phase와의 매핑 및 강화 포인트

```
CargoAI 기능              →  Smart Quote 기존 Phase  →  강화/신규 사항
─────────────────────────────────────────────────────────────────────
eQuote (실시간 비교)      →  Phase 1 (캐리어 API)    →  ✅ 기존 계획과 일치
eBooking (즉시 예약)      →  Phase 2 (예약/운송장)   →  ✅ 기존 계획과 일치
Track & Trace             →  Phase 3 (실시간 추적)   →  ✅ 기존 계획과 일치
CO2 대시보드              →  (없음)                  →  🆕 신규 추가 필요
디지털 Wallet/결제        →  (없음)                  →  🆕 신규 추가 필요
AgenticAI 워크플로우      →  (없음)                  →  🆕 신규 추가 필요
CargoCONNECT (API Suite)  →  Phase 5 (SaaS API)     →  ⬆️ 범위 확장 필요
Interline 자동화          →  (없음)                  →  📌 중장기 검토
```

---

## 신규/강화 Phase 제안

### Phase 1.5 — 멀티캐리어 비교 UX 강화 (CargoMART eQuote 벤치마킹)

**현재**: UPS/DHL 2개사 비교, 고정 tariff 기반
**목표**: CargoMART처럼 다중 정렬/필터링 제공

- [ ] 캐리어별 정렬 기준 추가: **가격 / 소요시간 / CO2 배출량 / 서비스 품질**
- [ ] 캐리어 비교 카드에 **추천 배지** (최저가, 최단, 친환경)
- [ ] FedEx, SF Express 등 **추가 캐리어 확장 구조** 설계
- [ ] 항공편 스케줄 연동 (현재 /schedule 페이지 확장)

### Phase 3.5 — CO2 배출량 추적 대시보드 (Cargo2ZERO 벤치마킹) 🆕

**참고**: CargoAI는 IATA RP1678 표준으로 모든 구간 CO2 계산

- [ ] 견적 시점에 **예상 CO2 배출량** 표시 (캐리어별 비교)
- [ ] CO2 계산 공식: 거리 × 화물중량 × 배출계수 (IATA RP1678 기준)
- [ ] 월/분기별 **CO2 리포트** (Phase 4 분석 대시보드 통합)
- [ ] 친환경 옵션 우선 표시 (ESG 대응)
- [ ] PDF 견적서에 CO2 정보 포함

**우선순위**: 중 (ESG 트렌드 + 고객사 CSR 요구 증가)

### Phase 4.5 — AI 어시스턴트 강화 (AgenticAI 벤치마킹) 🆕

**현재**: Claude 기반 채팅봇 (chat_controller.rb) — Q&A 수준
**목표**: 워크플로우 자동화 에이전트로 진화

- [ ] **자동 견적 추천**: "이 고객에게 최적 캐리어는?" → 과거 데이터 기반 추천
- [ ] **반복 견적 자동화**: 정기 고객 견적 자동 생성 + Slack 알림
- [ ] **이상 탐지**: 운임 급등/급락 시 자동 경고
- [ ] **자연어 검색**: "지난달 일본 발송 중 DHL이 저렴했던 건적 보여줘"
- [ ] 견적 프리셋 (단골 고객 + 단골 목적지 조합 저장)

**우선순위**: 중~높 (차별화 요소, 기존 채팅봇 인프라 활용 가능)

### Phase 5+ — 디지털 결제/정산 (CargoMART Wallet 벤치마킹) 🆕

- [ ] 견적 → 예약 → **결제** 원스톱 플로우
- [ ] 고객사별 크레딧/선불 잔액 관리
- [ ] 정산서 자동 생성 (월말 정산)
- [ ] 결제 이력 감사 로그 (Audit Log 확장)

**우선순위**: 낮 (Phase 2 예약 기능 안정화 이후)

### Phase 6 — 외부 API Suite 확장 (CargoCONNECT 벤치마킹) 🆕

**기존 Phase 5**: RESTful API + OAuth 2.0
**확장**: CargoAI의 3-tier API 구조 참고

```
API Tier 1: Schedule API    — 항공편/특송사 스케줄 조회
API Tier 2: Rate & Book API — 견적 조회 + 예약 (핵심)
API Tier 3: Tracking API    — 실시간 추적 웹훅
```

- [ ] API 과금 모델: 구독(월정액) + 종량제(건당) 하이브리드
- [ ] Webhook 지원 (상태 변경 푸시)
- [ ] API 문서 포털 (Swagger/OpenAPI)
- [ ] 샌드박스 환경 제공

---

## 우선순위 매트릭스

| Phase | 기능 | 영향도 | 난이도 | 우선순위 | 목표 시기 |
|-------|------|--------|--------|----------|-----------|
| 1 | 캐리어 API 실시간 연동 | 높음 | 높음 | **P0** | Q2 2026 |
| 1.5 | 멀티캐리어 비교 UX | 중간 | 낮음 | **P1** | Q2 2026 |
| 2 | 예약/운송장 발급 | 높음 | 높음 | **P0** | Q3 2026 |
| 3 | 실시간 추적 | 높음 | 중간 | **P1** | Q3 2026 |
| 3.5 | CO2 대시보드 | 중간 | 낮음 | **P2** | Q4 2026 |
| 4 | 분석/통계 대시보드 | 중간 | 중간 | **P1** | Q4 2026 |
| 4.5 | AI 어시스턴트 강화 | 높음 | 중간 | **P1** | Q4 2026 |
| 5 | 외부 API (기본) | 높음 | 높음 | **P1** | Q1 2027 |
| 5+ | 디지털 결제/정산 | 중간 | 높음 | **P2** | Q2 2027 |
| 6 | API Suite 확장 | 중간 | 높음 | **P2** | Q2 2027 |

---

## 아키텍처 시사점

### CargoAI에서 배울 점

1. **모듈형 제품 구조**: CargoMART(UI) + CargoCONNECT(API) + CargoGATE(White-label) — Smart Quote도 UI/API/임베디드 3가지 형태로 제공 가능
2. **점진적 디지털화**: 스케줄 → 견적 → 예약 → 추적 순서로 확장 (현재 로드맵과 일치)
3. **AI 네이티브**: AgenticAI처럼 AI를 보조 도구가 아닌 **핵심 워크플로우 엔진**으로 포지셔닝
4. **생태계 전략**: 포워더 + 항공사 + TMS 3자 연결 플랫폼 → Smart Quote도 화주 + 특송사 + 관세사 연결 고려

### 차별화 전략 (vs CargoAI)

| 영역 | CargoAI | Smart Quote |
|------|---------|-------------|
| 대상 | 항공화물 (Air Cargo) | **특송(Express)** — UPS/DHL/FedEx |
| 고객 | 대형 포워더 | **중소 물류사** (KS Ways, KS Ways) |
| 강점 | 104개 항공사 네트워크 | 한국 발송 특화, KRW 정산, 한국어 우선 |
| AI | AgenticAI (워크플로우) | Claude 기반 견적 어시스턴트 (심화 예정) |
| 가격 | SaaS 구독 | 내부 도구 → SaaS 전환 예정 |

---

## Sources

- [CargoAI 공식 사이트](https://www.cargoai.co/)
- [CargoMART 제품 페이지](https://www.cargoai.co/products/cargomart/)
- [CargoCONNECT API 제품](https://www.cargoai.co/products/cargoconnect/)
- [CargoAI 가격 플랜](https://www.cargoai.co/pricing/)
- [CargoAI Q4 2025 실적 — 60% 성장](https://aircargoweek.com/cargoai-posts-record-quarter-with-60-percent-growth/)
- [CargoTech 2026 확장 계획](https://aircargoweek.com/cargotech-announces-major-2026-expansion-and-ai-driven-innovations/)
- [Cargo2ZERO CO2 추적](https://www.cargoai.co/press/cargo2zero-helps-airlines-freight-forwarders-reports-co2-emissions/)
- [Rate and Book API 소개](https://www.cargoai.co/blog/revolutionizing-airfreight-rate-and-book-apis/)
- [United Cargo + CargoAI 파트너십](https://www.unitedcargo.com/en/us/learn/news/press-releases/2025-09-24-CargoAI.html)
