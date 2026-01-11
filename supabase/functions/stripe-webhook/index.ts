import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14.10.0";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeKey) {
      throw new Error("Stripe secret key not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    let event: Stripe.Event;

    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return new Response(
          JSON.stringify({ error: "Webhook signature verification failed" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } else {
      event = JSON.parse(body);
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id || session.client_reference_id;

        if (!userId) {
          console.error("No user ID found in session");
          break;
        }

        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);

        const { error } = await supabaseClient
          .from("profiles")
          .update({
            is_pro: true,
            subscription_expires_at: expiresAt.toISOString(),
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customerId,
          })
          .eq("id", userId);

        if (error) {
          console.error("Error updating profile:", error);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;

        const { error } = await supabaseClient
          .from("profiles")
          .update({
            is_pro: false,
            subscription_expires_at: null,
            stripe_subscription_id: null,
          })
          .eq("stripe_subscription_id", subscriptionId);

        if (error) {
          console.error("Error updating profile:", error);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;

        if (subscription.status === "active") {
          const expiresAt = new Date(subscription.current_period_end * 1000);

          const { error } = await supabaseClient
            .from("profiles")
            .update({
              is_pro: true,
              subscription_expires_at: expiresAt.toISOString(),
            })
            .eq("stripe_subscription_id", subscriptionId);

          if (error) {
            console.error("Error updating profile:", error);
          }
        } else if (["canceled", "unpaid", "past_due"].includes(subscription.status)) {
          const { error } = await supabaseClient
            .from("profiles")
            .update({
              is_pro: false,
              subscription_expires_at: null,
            })
            .eq("stripe_subscription_id", subscriptionId);

          if (error) {
            console.error("Error updating profile:", error);
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId && invoice.billing_reason === "subscription_cycle") {
          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + 1);

          const { error } = await supabaseClient
            .from("profiles")
            .update({
              subscription_expires_at: expiresAt.toISOString(),
            })
            .eq("stripe_subscription_id", subscriptionId);

          if (error) {
            console.error("Error updating profile:", error);
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          const { error } = await supabaseClient
            .from("profiles")
            .update({
              is_pro: false,
            })
            .eq("stripe_subscription_id", subscriptionId);

          if (error) {
            console.error("Error updating profile:", error);
          }
        }
        break;
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
