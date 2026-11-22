# Technical Stack

## Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.4 | UI framework |
| TypeScript | ~5.8.2 | Type safety |
| Vite | ^6.2.0 | Build tool + dev server |
| Tailwind CSS | ^3.4.17 | Styling (custom jways-* palette, class-based dark mode) |
| React Router | ^7.13.1 | Client-side routing |
| jsPDF | 2.5.1 | PDF generation |
| Lucide React | ^0.563.0 | Icons |
| Vitest | ^4.0.18 | Unit testing |
| Testing Library | ^16.3.2 | Component testing |

## Backend (smart-quote-api/)
| Technology | Version | Purpose |
|------------|---------|---------|
| Ruby on Rails | ~> 8.0.4 | API framework (API-only mode) |
| Ruby | 3.4.13 | Language runtime |
| PostgreSQL | 15+ | Database (quotes persistence) |
| Puma | >= 5.0 | Web server |
| Kamal | latest | Docker deployment |
| Thruster | latest | HTTP caching/compression |
| rack-cors | latest | CORS handling |
| RSpec | 3.12+ | Test framework |
| FactoryBot | 6.2+ | Test fixtures |
| Kaminari | latest | Pagination |
| csv | stdlib | CSV export |

## External APIs (Active)
| API | Endpoint | Purpose |
|-----|----------|---------|
| open.er-api.com | `/v6/latest/KRW` | Exchange rates (KRW base, 6 currencies) |
| Open-Meteo | `api.open-meteo.com/v1/forecast` | Port/airport weather (47 locations) |

## Infrastructure
| Service | Purpose |
|---------|---------|
| Vercel | Frontend hosting (smart-quote-main.vercel.app) |
| Render | Rails API hosting + PostgreSQL (Singapore region) |

## Configuration
| File | Purpose |
|------|---------|
| vite.config.ts | Path alias: @/ -> src/ |
| tsconfig.json | strict: true, skipLibCheck: true |
| tailwind.config.cjs | Custom jways-* blue color palette |
| .eslintrc.cjs | max-warnings: 0 enforcement |
| render.yaml | Backend infrastructure as code (Docker, Singapore) |

## Project Structure
```
smart-quote-main/
├── src/                          # Frontend (React 19 + TypeScript)
│   ├── api/                      # API clients (quoteApi, exchangeRateApi, weatherApi, noticeApi)
│   ├── types.ts                  # Core types & enums (QuoteInput, QuoteResult, Incoterm)
│   ├── types/dashboard.ts        # Dashboard types (ExchangeRate, PortWeather, etc.)
│   ├── i18n/translations.ts      # 4-language dictionary (en/ko/cn/ja, 390+ keys)
│   ├── config/                   # Rate tables (UPS/DHL/EMAX), business rules, ports, options
│   ├── contexts/                 # AuthContext, LanguageContext, ThemeContext
│   ├── features/
│   │   ├── quote/
│   │   │   ├── components/       # InputSection, ResultSection, SaveQuoteButton
│   │   │   ├── components/widgets/  # ExchangeRate, Weather, Notice, AccountManager, Calculator
│   │   │   └── services/         # calculationService.ts (mirrored calculation logic)
│   │   ├── history/              # QuoteHistoryPage, Table, SearchBar, Pagination, DetailModal
│   │   ├── dashboard/
│   │   │   ├── components/       # WelcomeBanner, QuoteHistoryCompact, WidgetError, WidgetSkeleton
│   │   │   └── hooks/            # useExchangeRates, usePortWeather, useLogisticsNews
│   │   └── admin/                # UserManagementWidget (scaffolded)
│   ├── components/layout/        # Header, MobileLayout, NavigationTabs
│   ├── pages/                    # LandingPage, LoginPage, SignUpPage, CustomerDashboard, QuoteCalculator
│   └── lib/                      # format.ts, pdfService.ts, fetchWithRetry.ts
├── smart-quote-api/              # Rails 8 API backend
│   ├── app/controllers/api/v1/   # QuotesController (6 REST endpoints)
│   ├── app/services/             # QuoteCalculator + Calculators::*
│   ├── app/models/               # Quote model with scopes
│   ├── lib/constants/            # Tariff tables (synced with frontend config/)
│   └── spec/                     # RSpec integration tests
├── docs/                         # PRD, database schema, user manual
└── public/                       # Fonts, logos, favicon
```
