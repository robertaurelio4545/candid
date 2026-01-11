import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14.10.0";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  console.log("=== WEBHOOK RECEIVED ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET1");

    console.log("Stripe Key exists:", !!stripeKey);
    console.log("Webhook Secret exists:", !!webhookSecret);

    if (!stripeKey) {
      throw new Error("Stripe secret key not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    console.log("Has signature:", !!signature);
    console.log("Body length:", body.length);

    let event: Stripe.Event;

    if (webhookSecret && signature) {
      try {
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
        console.log("✅ Signature verified");
      } catch (err) {
        console.error(`❌ Webhook signature verification failed: ${err.message}`);
        return new Response(
          JSON.stringify({ error: "Webhook signature verification failed" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } else {
      console.log("⚠️ No signature verification - parsing body directly");
      event = JSON.parse(body);
    }

    console.log("Event type:", event.type);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id || session.client_reference_id;

        console.log("Checkout session completed for user:", userId);
        console.log("Session data:", JSON.stringify(session, null, 2));

        if (!userId) {
          console.error("No user ID found in session");
          break;
        }

        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        console.log("Subscription ID:", subscriptionId);
        console.log("Customer ID:", customerId);

        if (session.mode === "subscription" && session.payment_status === "paid") {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);

          const updateData: any = {
            is_pro: true,
            subscription_expires_at: expiresAt.toISOString(),
            subscription_started_at: new Date().toISOString(),
            stripe_customer_id: customerId,
          };

          if (subscriptionId) {
            updateData.stripe_subscription_id = subscriptionId;
          }

          console.log("Updating profile with data:", updateData);

          const { data, error } = await supabaseClient
            .from("profiles")
            .update(updateData)
            .eq("id", userId)
            .select();

          if (error) {
            console.error("Error updating profile:", error);
          } else {
            console.log("Profile updated successfully:", data);
          }
        } else {
          console.log("Payment not completed or not a subscription:", session.payment_status, session.mode);
        }
        break;
      }

      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const subscriptionId = subscription.id;

        console.log("Subscription created:", subscriptionId);
        console.log("Customer ID:", customerId);
        console.log("Subscription status:", subscription.status);

        if (subscription.status === "active" || subscription.status === "trialing") {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);

          const { data, error } = await supabaseClient
            .from("profiles")
            .update({
              is_pro: true,
              subscription_expires_at: expiresAt.toISOString(),
              subscription_started_at: new Date().toISOString(),
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: customerId,
            })
            .eq("stripe_customer_id", customerId)
            .select();

          if (error) {
            console.error("Error updating profile:", error);
          } else {
            console.log("Profile updated successfully:", data);
          }
        } else {
          console.log("Subscription not active yet, status:", subscription.status);
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

        console.log("Invoice payment succeeded:", invoice.id);
        console.log("Subscription ID:", subscriptionId);
        console.log("Billing reason:", invoice.billing_reason);

        if (subscriptionId) {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);

          const updateData: any = {
            subscription_expires_at: expiresAt.toISOString(),
          };

          if (invoice.billing_reason === "subscription_create") {
            updateData.is_pro = true;
            updateData.subscription_started_at = new Date().toISOString();
          }

          const { error } = await supabaseClient
            .from("profiles")
            .update(updateData)
            .eq("stripe_subscription_id", subscriptionId);

          if (error) {
            console.error("Error updating profile:", error);
          } else {
            console.log("Profile updated for invoice payment");
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