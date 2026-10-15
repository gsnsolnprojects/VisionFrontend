import type { CheckoutSession, RazorpayPaymentResult } from "@/lib/api/subscription";

const CHECKOUT_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

let scriptPromise: Promise<void> | null = null;

/** Load Razorpay's Checkout script once, on first use */
function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = CHECKOUT_SCRIPT;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error("Could not load Razorpay. Check your internet connection and try again."));
      };
      document.body.appendChild(script);
    });
  }
  return scriptPromise;
}

export type CheckoutOutcome =
  | { status: "paid"; result: RazorpayPaymentResult }
  | { status: "dismissed" };

/**
 * Open Razorpay Checkout for a subscription and wait until the user pays or closes it.
 * A failed attempt doesn't end checkout (Razorpay lets the user retry in the same window);
 * it is reported through onPaymentFailed.
 */
export async function openRazorpayCheckout(
  session: CheckoutSession,
  prefill: { name?: string | null; email?: string | null; contact?: string | null },
  onPaymentFailed?: (message: string) => void
): Promise<CheckoutOutcome> {
  await loadCheckoutScript();
  if (!window.Razorpay) throw new Error("Razorpay did not load. Please try again.");

  return new Promise<CheckoutOutcome>((resolve) => {
    let settled = false;
    const finish = (outcome: CheckoutOutcome) => {
      if (settled) return;
      settled = true;
      resolve(outcome);
    };

    const checkout = new window.Razorpay!({
      key: session.keyId,
      subscription_id: session.subscriptionId,
      name: "VisionM",
      description: `${session.plan.name} · monthly`,
      prefill: {
        name: prefill.name || undefined,
        email: prefill.email || undefined,
        contact: prefill.contact || undefined,
      },
      notes: { company: session.company || "" },
      handler: (result: RazorpayPaymentResult) => finish({ status: "paid", result }),
      modal: { ondismiss: () => finish({ status: "dismissed" }) },
    });

    checkout.on("payment.failed", (response) =>
      onPaymentFailed?.(response?.error?.description || "Payment failed. Please try again.")
    );
    checkout.open();
  });
}
