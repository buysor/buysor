# BUYSOR v7: controlled public validation release

## What changed
- Cal AI-style information sequence (not a brand clone): how it works, an explicitly illustrative WAIT result, personal context, simple packs, trust/limits, FAQs, final CTA.
- Preserve the existing product-render hero, login, mobile navigation, categories and profile.
- One versioned price source. Packs: KRW 1,900 / 20C, 8,900 / 100C, 24,900 / 300C. Planned membership: 9,900 / 140C.
- Standard decision: 10C including the image. Planned deep/rejudge/standalone Lens: 30/5/1C, not sold as live features before validation.
- New signup/attendance/roulette awards: 0C. Existing unexpired ledger balances import once, preserving their expiry and original rows. No paid or bonus rows are erased.
- Atomic credit reservations, one in-flight analysis per account, idempotent request keys, exactly-once completion, failure recovery and a global daily AI budget.
- Payment orders with locked server prices; provider verification; exactly-once credit grants; unused whole-pack refunds; authenticated webhook reconciliation. Canceled/partially refunded consumed orders enter review and stop further AI usage.
- Free support is honest FAQ assistance, not an unmetered AI route. Manual profiles and aggregate history remain free.
- `/api/internal/economics` reports actual token costs, uncertain reserved cost and remaining credits. It is NOT accounting net profit.

## Release gates (do not bypass)
Public deployment is not the same as a paid launch. This release defaults to no new payment charges and no external AI spend. Secrets must never go in this repository or chat.

| Setting | Meaning |
| --- | --- |
| `AI_PROVIDER=openai` | Only the cost-reviewed adapter is enabled in v7. |
| `AI_MODEL` | A reviewed identifier from `lib/commerce-policy.ts`; test quality before use. |
| `OPENAI_API_KEY` | Server secret. Provider budget/account controls must also be configured. |
| `AI_SPEND_ENABLED=1` | Explicit operator permission to spend. Default is OFF. |
| `AI_DAILY_BUDGET_KRW` | Positive daily global reservation limit. Start small, e.g. 3,000 KRW during controlled validation. This is not a usage target. |
| `AI_FX_KRW_PER_USD` | Conservative planning conversion; default 1600, not a live exchange quote. |
| `TOSS_SECRET_KEY`, `TOSS_MERCHANT_ID` | Live merchant credentials after merchant approval and sandbox verification. |
| `TOSS_WEBHOOK_SECRET` | Random 32+ character server secret. Configure payment-status webhooks at `/api/billing/webhook?token=<secret>` (do not disclose the resulting URL). All events are rechecked through the provider API. |
| `PUBLIC_ORIGIN` | Exact production HTTPS origin. |
| `BUYSOR_COMMERCE_REVIEWED=1` | Only after real merchant test evidence, withdrawal/refund/privacy terms, seller disclosures and data handling have been reviewed. |
| `BUYSOR_PAID_RELEASE=1` | Final operator permission for new live pack orders. |
| `BUYSOR_OPS_TOKEN` | Random 32+ character secret for the private economics endpoint via Authorization bearer. |

Do not enable recurring membership simply by inserting a database tier. `subscriptionReady` deliberately remains false. Recurring merchant onboarding, mandate consent, billing keys, scheduled renewals, cancellation, dunning and renewal webhooks still require end-to-end implementation and tests.

Deep and rejudge are separate quality-gated adapters (`AI_DEEP_VALIDATED`, `AI_REJUDGE_VALIDATED`) and are not offered in the default UI. Standalone Lens is not a separate paid endpoint in this release; the standard photo flow must never charge an extra 1C.

The AI currently analyzes user-provided evidence. It does not verify live prices or retrieve arbitrary supplied URLs. Do not advertise automatic real-time lowest-price research until an evidence retrieval pipeline is added and measured. Model confidence is not a calibrated accuracy probability.

## Safety and accounting
New migration `drizzle/0003_commerce_v7.sql` is additive and mirrored in the server bootstrap. The bootstrap uses one D1 batch so tables and triggers become available together; legacy source rows remain intact.

Customer-credit recovery does not release uncertain provider spend. A provider timeout can still cost money. The daily meter conservatively keeps the reserved amount. Actual over-reserve usage trips a circuit for the day; investigate before raising limits.

At 100% redemption and 24 KRW/C analysis cost, the proposed prices still leave a positive contribution after a planning VAT exclusion, 3.74% payment cash fee and 3% refund reserve. This is NOT net profit: support, customer acquisition, fixed overhead, income tax and owner insurance remain separate. No revenue or retention forecast is guaranteed.

Full unused refunds are automated only after verified provider cancellation. Partial-use refunds, disputes and chargebacks require manual review. This process does not limit statutory customer rights. Keep unspent service consideration and tax reserves separate from owner withdrawals.

## Acceptance before paid release
- Test at least 50 realistic purchase cases across electronics, appliances and power tools; record usefulness, missing evidence and actual provider bill.
- Verify live merchant settings without making unauthorized customer charges. Exercise success, failed authentication, confirmation timeout, duplicate callbacks, cancellation and provider webhook retries.
- Verify account data isolation on two real Google accounts; test blocked local-auth spoof headers in production.
- Check the production site at mobile, tablet and desktop sizes and retain screenshots/results.
- Complete seller information, privacy/retention/deletion policy and lawful refund terms. The usage guide is not a substitute for legal terms.
- Retention and paid willingness-to-pay remain unverified until measured with real customers. Do not scale advertising from spreadsheet projections.

## Recovery
For UI regressions revert this release commit. For an operational incident first set `BUYSOR_PAID_RELEASE=0` and `AI_SPEND_ENABLED=0`. Do NOT roll the old unmetered API handler back into live service. Keep the additive tables and credit ledger for reconciliation.

## Official references checked 2026-09-18
- https://www.calai.app/
- https://developers.openai.com/api/docs/pricing
- https://docs.tosspayments.com/en/api-guide
- https://docs.tosspayments.com/reference
- https://developers.cloudflare.com/d1/worker-api/d1-database/
