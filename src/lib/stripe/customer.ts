import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import type Stripe from "stripe";
import { adminDb } from "@/lib/firebase/admin";
import { getStripe } from "@/lib/stripe/server";

export async function ensureStripeCustomer(uid: string) {
  const customerRef = adminDb().doc(`billingCustomers/${uid}`);
  const existing = await customerRef.get();
  const existingCustomerId = existing.data()?.stripeCustomerId;
  if (typeof existingCustomerId === "string" && existingCustomerId.startsWith("cus_")) {
    await assertStripeCustomerOwnership(uid, existingCustomerId);
    return existingCustomerId;
  }

  const customer = await getStripe().customers.create({
    metadata: { firebaseUid: uid, application: "mushi-kore" },
  }, {
    idempotencyKey: `mushi-kore-customer-${uid}`,
  });

  await customerRef.set({
    uid,
    stripeCustomerId: customer.id,
    status: existing.data()?.status ?? "none",
    updatedAt: FieldValue.serverTimestamp(),
    ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
  }, { merge: true });
  return customer.id;
}

export async function assertStripeCustomerOwnership(uid: string, customerId: string) {
  const customer = await getStripe().customers.retrieve(customerId);
  if (customer.deleted) throw new Error("STRIPE_CUSTOMER_DELETED");
  if (customer.metadata.firebaseUid !== uid) throw new Error("STRIPE_CUSTOMER_OWNERSHIP_CONFLICT");
  return customer;
}

export function stripeCustomerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer) {
  return typeof customer === "string" ? customer : customer.id;
}
