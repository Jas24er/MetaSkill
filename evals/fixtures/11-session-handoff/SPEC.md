# Checkout Service — Spec

## Contract
- REQ-1: Subtotal calculation excludes negative quantities. Check: `npm test`
- REQ-2: Coupon validation rejects expired codes. Check: `node --test tests/coupon.test.mjs`
- REQ-3: Payment webhook signature verified against Stripe secret. Check: `manual: Requires test Stripe webhook key in CI`
