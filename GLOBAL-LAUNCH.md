# English-first BUYSOR launch

Each new visit starts in English and Light, including browsers with old saved dark/Korean preferences. Display choices made during a visit stay in that tab through navigation and refresh; a new tab starts with the defaults. Shopping region and profile data remain saved independently. Display language and shopping region are independent: US (default), UK, Canada, Australia, New Zealand and South Korea. Budgets use regional currency, and US/UK driving questions use miles. Saved won budgets and kilometer answers retain their original meaning. Region ranges are product budget choices, not exchange-rate conversions.

Canonical BUYSOR charges are USD, plus applicable checkout tax. Service prices on home, credits, membership, guide, support and checkout display an approximate conversion in the selected shopping region’s currency. Changing language does not change currency. Historical receipts retain their original charge currency.

Conversions use the latest published ECB reference rates through [Frankfurter](https://frankfurter.dev/), refreshed at most every 30 minutes on the server. These are daily business-day reference rates, not intraday trading quotes. The browser retries automatically, resumes when online/visible, and shares one rate snapshot across all prices. Server and browser retain validated last-good observations for at most seven days; a failed refresh is labeled cached. If no valid rates exist, prices remain explicitly labeled USD. Fetches and cache operations have deadlines, and currency selection never waits for a request. All amounts shown at checkout consent still use the canonical USD cents; FX estimates never enter order/refund validation.

Base prices:

| Product | Price | Credits |
| --- | ---: | ---: |
| Starter | $1.99 | 20C |
| Standard | $7.99 | 100C |
| Value | $19.99 | 300C |
| Optional monthly membership (still preparing) | $9.99/month | 140C |

Standard decisions still cost 10C. Deep, rejudge, standalone Lens and monthly billing retain their existing validation gates. No automatic sign-up, check-in or roulette rewards were added. Existing orders, balances, expiry dates and records are preserved. Legacy Toss payment confirmations and refunds remain available for existing orders; new order creation uses the USD Paddle flow.

## Activate international checkout

Deploying this code does not activate payments. Complete Paddle seller onboarding and approval, and publish approved merchant disclosures, terms and privacy notices before setting the existing release flags.

1. Create three **one-time** Paddle prices in USD, tax mode **external** (tax added at checkout), for the exact base prices above. No recurring price or discount should be attached. Use the applicable approved product tax category for BUYSOR.
2. Approve the domain and set the default payment link to `https://buysor.peon9339.workers.dev/billing/checkout`.
3. Set non-secret Worker configuration: `PUBLIC_ORIGIN=https://buysor.peon9339.workers.dev`, `BUYSOR_PAYMENT_PROVIDER=paddle`, `PADDLE_ENV=live`, `PADDLE_PRICE_PACK20`, `PADDLE_PRICE_PACK100`, `PADDLE_PRICE_PACK300`. Price IDs begin with `pri_`.
4. Set Worker secrets: `PADDLE_API_KEY` (live key beginning `pdl_live_apikey_`), `PADDLE_WEBHOOK_SECRET` (notification destination secret). Set `PADDLE_CLIENT_TOKEN` to the public live client token beginning `live_`. Never put an API key or webhook secret in client code.
5. Point Paddle notifications to `/api/billing/paddle-webhook`, with relevant transaction and adjustment events enabled. The handler verifies the raw-body signature, then fetches canonical provider state before granting or changing credits.
6. Verify configured AI under the existing capped budget. `AI_DAILY_BUDGET_USD` is supported; existing `AI_DAILY_BUDGET_KRW` remains a fallback. Existing cost ceilings and credit pricing have not changed.
7. Verify live checkout, card declines, tax, confirmation, webhook replay, full unused refunds, rejected refunds and account ownership with approved test procedures before setting `BUYSOR_COMMERCE_REVIEWED=1` and `BUYSOR_PAID_RELEASE=1`.

A browser callback cannot mint credits. Server validation checks the owner, product, policy, USD currency, base amount, tax and captured total. An uncertain refund locks credits and is never automatically submitted twice. Membership billing remains disabled.

## Data and reporting

`drizzle/0005_global_billing.sql` adds currency/provider metadata beside existing orders, currency metadata beside outcomes and local-time check-in records. It does not rewrite legacy amounts or credit lots. New decimal outcome amounts are stored in currency minor units; won remains integer won. Admin reporting uses UTC, USD cents for current service revenue/AI cost, and separately reports historical won revenue and each outcome currency without inventing exchange rates.

The original light artwork is retained. Dark artwork is a matching 1536×1024 studio variant, exported to AVIF and WebP.

## Validation

Run the locked build, `npx tsc --noEmit`, `node --test tests/*.test.mjs`, and `node tests/browser-v7.mjs` against a local migrated D1 emulator. The GitHub workflow retains build/type/test logs and desktop/mobile screenshots. Deployed release checks run against the existing Cloudflare hostname.
