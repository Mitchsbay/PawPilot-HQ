import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET")!, {
  httpClient: Stripe.createFetchHttpClient()
});

const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;
  
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (e) {
    console.error("Webhook signature verification failed:", e.message);
    return new Response(`Invalid signature: ${e.message}`, { status: 400 });
  }

  console.log("Processing Stripe webhook:", event.type);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session: any = event.data.object;
        
        // Link Stripe customer to user
        await supabase.from("stripe_customers").upsert({
          user_id: session.client_reference_id,
          customer_id: session.customer as string
        });

        // Log successful checkout
        await supabase.from("event_log").insert({
          user_id: session.client_reference_id,
          name: "stripe_checkout_completed",
          props: {
            session_id: session.id,
            amount_total: session.amount_total,
            currency: session.currency
          }
        });

        console.log("Checkout completed for user:", session.client_reference_id);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription: any = event.data.object;
        
        // Find user by customer ID
        const { data: customerLink } = await supabase
          .from("stripe_customers")
          .select("user_id")
          .eq("customer_id", subscription.customer)
          .single();

        if (customerLink) {
          await supabase.from("subscriptions").upsert({
            id: subscription.id,
            user_id: customerLink.user_id,
            status: subscription.status,
            price_id: subscription.items?.data?.[0]?.price?.id ?? "unknown",
            current_period_end: subscription.current_period_end 
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null,
          });

          // Log subscription event
          await supabase.from("event_log").insert({
            user_id: customerLink.user_id,
            name: `stripe_subscription_${event.type.split('.').pop()}`,
            props: {
              subscription_id: subscription.id,
              status: subscription.status,
              price_id: subscription.items?.data?.[0]?.price?.id
            }
          });

          console.log("Subscription updated for user:", customerLink.user_id);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice: any = event.data.object;
        
        // Find user by customer ID
        const { data: customerLink } = await supabase
          .from("stripe_customers")
          .select("user_id")
          .eq("customer_id", invoice.customer)
          .single();

        if (customerLink) {
          // Log payment success
          await supabase.from("event_log").insert({
            user_id: customerLink.user_id,
            name: "stripe_payment_succeeded",
            props: {
              invoice_id: invoice.id,
              amount_paid: invoice.amount_paid,
              currency: invoice.currency
            }
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice: any = event.data.object;
        
        // Find user by customer ID
        const { data: customerLink } = await supabase
          .from("stripe_customers")
          .select("user_id")
          .eq("customer_id", invoice.customer)
          .single();

        if (customerLink) {
          // Log payment failure
          await supabase.from("event_log").insert({
            user_id: customerLink.user_id,
            name: "stripe_payment_failed",
            props: {
              invoice_id: invoice.id,
              amount_due: invoice.amount_due,
              currency: invoice.currency
            }
          });
        }
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }

    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response("Internal server error", { status: 500 });
  }
});