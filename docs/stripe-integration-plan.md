# Stripe test-mode integration plan

This plan was selected with Stripe's `stripe_implementation_planner` for むしコレ.

Official implementation references: [Checkout Sessions](https://docs.stripe.com/payments/checkout-sessions), [Customer Portal API integration](https://docs.stripe.com/customer-management/integrate-customer-portal), [webhook security and delivery behavior](https://docs.stripe.com/webhooks), and [subscription webhook events](https://docs.stripe.com/billing/subscriptions/webhooks).

## Chosen integration

- Web SaaS with fixed-price monthly subscriptions, not usage-based Stripe billing.
- Existing free tier remains an application entitlement; it is not a Stripe trial.
- Paid signup uses server-created, Stripe-hosted Checkout Sessions.
- Subscription, payment-method, and cancellation management uses the Stripe-hosted Customer Portal.
- Stripe is the billing source of truth. `billingCustomers/{firebaseUid}` is a webhook-maintained Firestore projection used by the quota service.
- Stripe handles standard failed-payment recovery. `past_due` retains access during recovery; `unpaid`, `canceled`, and `incomplete_expired` do not.

## Approved revenue model

| Plan | Monthly quota | Monthly price | Price per image |
| --- | ---: | ---: | ---: |
| Light | 50 | ¥300 | ¥6.00 |
| Standard | 100 | ¥500 | ¥5.00 |
| Pro | 1,000 | ¥4,500 | ¥4.50 |

Free provides 10 identifications per calendar month with ads. Paid plans remove the ad slot. Unused quota never rolls over. Guest access remains one server-enforced identification per UTC day. Annual billing, usage billing, overages, and add-on purchases are out of scope.

## Data and security model

- Browser sends a Firebase ID token to same-origin billing Route Handlers.
- The server accepts an internal plan ID only and maps it to a Vercel-only Stripe Price ID. Browser-supplied Stripe Price IDs are never accepted.
- One Stripe Customer is created per Firebase UID with a stable idempotency key and `firebaseUid` metadata.
- Checkout Session and Subscription metadata include the Firebase UID and internal plan ID for reconciliation.
- The webhook verifies the exact raw request body with the endpoint-specific signing secret.
- Each Stripe event ID is recorded in `stripeWebhookEvents` in the same Firestore transaction as the entitlement projection.
- For relevant events, the current Subscription is retrieved from Stripe before writing Firestore, so delayed or out-of-order deliveries cannot apply a stale event snapshot.
- The app rejects live keys and live events unless the separate `STRIPE_ALLOW_LIVE_MODE=true` latch is deliberately enabled.
- While test billing is deployed publicly, Checkout and Portal also require `STRIPE_TEST_BILLING_ENABLED=true` and a Firebase `admin=true` custom claim. All payment UI is labeled as test-only and produces no real charge.

## Webhook events

Register only the events used by this implementation:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.paused`
- `customer.subscription.resumed`
- `invoice.paid`
- `invoice.payment_failed`

## Deployment gates

1. Complete local unit, type, lint, and production-build checks.
2. Confirm Japanese tax/consumer disclosure treatment and complete the operator identity fields before live launch.
3. Create the approved test-mode Products and recurring monthly JPY Prices.
4. Add test-only Vercel environment variables: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and the three `STRIPE_PRICE_*` values. Keep all server-only.
5. Deploy, then with explicit approval register the test-mode webhook endpoint at `/api/stripe/webhook` and configure the test Customer Portal.
6. Run Stripe test cards through checkout, renewal/payment failure, retry recovery, plan change, cancellation-at-period-end, immediate cancellation, duplicate webhook delivery, and out-of-order webhook delivery.
7. Reconcile Stripe subscription state, Firestore projection, UI plan, and quota consumption after every scenario.
8. Live-mode resources, live Vercel secrets, public pricing buttons, and launch require a separate review and explicit approval.
