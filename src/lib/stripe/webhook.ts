import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import type Stripe from "stripe";
import { adminDb } from "@/lib/firebase/admin";
import { getPlanIdForStripePrice } from "@/lib/stripe/config";
import { stripeCustomerId } from "@/lib/stripe/customer";
import { assertStripeObjectMode, getStripe } from "@/lib/stripe/server";

const SUBSCRIPTION_EVENT_TYPES = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "customer.subscription.trial_will_end",
]);

function subscriptionIdFromEvent(event: Stripe.Event) {
  if (SUBSCRIPTION_EVENT_TYPES.has(event.type)) {
    return (event.data.object as Stripe.Subscription).id;
  }
  if (event.type === "checkout.session.completed") {
    const subscription = (event.data.object as Stripe.Checkout.Session).subscription;
    return typeof subscription === "string" ? subscription : subscription?.id ?? null;
  }
  if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
    const subscription = (event.data.object as Stripe.Invoice).parent?.subscription_details?.subscription;
    return typeof subscription === "string" ? subscription : subscription?.id ?? null;
  }
  return null;
}

async function firebaseUidForSubscription(subscription: Stripe.Subscription) {
  const metadataUid = subscription.metadata.firebaseUid;
  if (metadataUid) return metadataUid;

  const customer = typeof subscription.customer === "string"
    ? await getStripe().customers.retrieve(subscription.customer)
    : subscription.customer;
  if (customer.deleted) throw new Error("STRIPE_CUSTOMER_DELETED");
  const uid = customer.metadata.firebaseUid;
  if (!uid) throw new Error("STRIPE_FIREBASE_UID_MISSING");
  return uid;
}

export function subscriptionProjection(subscription: Stripe.Subscription) {
  const item = subscription.items.data.length === 1 ? subscription.items.data[0] : undefined;
  const priceId = item?.price.id ?? null;
  const planId = priceId ? getPlanIdForStripePrice(priceId) : null;
  return {
    stripeCustomerId: stripeCustomerId(subscription.customer),
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    planId,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodEnd: item?.current_period_end
      ? new Date(item.current_period_end * 1000).toISOString()
      : null,
    stripeConfigurationError: subscription.items.data.length !== 1
      ? "UNEXPECTED_ITEM_COUNT"
      : priceId && !planId ? "UNKNOWN_PRICE" : null,
  };
}

async function recordIgnoredEvent(event: Stripe.Event) {
  const eventRef = adminDb().doc(`stripeWebhookEvents/${event.id}`);
  await adminDb().runTransaction(async (transaction) => {
    if ((await transaction.get(eventRef)).exists) return;
    transaction.create(eventRef, {
      type: event.type,
      stripeCreated: event.created,
      outcome: "ignored",
      processedAt: FieldValue.serverTimestamp(),
    });
  });
}

export async function processStripeWebhookEvent(event: Stripe.Event) {
  assertStripeObjectMode(event.livemode);
  const subscriptionId = subscriptionIdFromEvent(event);
  if (!subscriptionId) {
    await recordIgnoredEvent(event);
    return { duplicate: false, outcome: "ignored" as const };
  }

  // Always retrieve the current object so delayed or out-of-order events cannot
  // overwrite Firestore with stale subscription state.
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  assertStripeObjectMode(subscription.livemode);
  const uid = await firebaseUidForSubscription(subscription);
  const projection = subscriptionProjection(subscription);
  const eventRef = adminDb().doc(`stripeWebhookEvents/${event.id}`);
  const customerRef = adminDb().doc(`billingCustomers/${uid}`);

  return adminDb().runTransaction(async (transaction) => {
    if ((await transaction.get(eventRef)).exists) {
      return { duplicate: true, outcome: "processed" as const };
    }

    const existing = await transaction.get(customerRef);
    const mappedCustomerId = existing.data()?.stripeCustomerId;
    if (mappedCustomerId && mappedCustomerId !== projection.stripeCustomerId) {
      throw new Error("STRIPE_CUSTOMER_OWNERSHIP_CONFLICT");
    }

    transaction.set(customerRef, {
      uid,
      ...projection,
      lastStripeEventId: event.id,
      lastStripeEventType: event.type,
      updatedAt: FieldValue.serverTimestamp(),
      ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    }, { merge: true });
    transaction.create(eventRef, {
      type: event.type,
      stripeCreated: event.created,
      stripeSubscriptionId: subscription.id,
      uid,
      outcome: "processed",
      processedAt: FieldValue.serverTimestamp(),
    });
    return { duplicate: false, outcome: "processed" as const };
  });
}
