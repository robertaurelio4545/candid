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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Authentication failed");
    }

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("stripe_customer_id, is_pro")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.stripe_customer_id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "No Stripe customer found"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    if (profile.is_pro) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Already Pro",
          is_pro: true
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      limit: 10,
    });

    const activeSubscription = subscriptions.data.find(
      (sub) => sub.status === "active" || sub.status === "trialing"
    );

    if (activeSubscription) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await supabaseClient
        .from("profiles")
        .update({
          is_pro: true,
          subscription_expires_at: expiresAt.toISOString(),
          subscription_started_at: new Date().toISOString(),
          stripe_subscription_id: activeSubscription.id,
        })
        .eq("id", user.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Pro activated successfully!",
          is_pro: true
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const sessions = await stripe.checkout.sessions.list({
      customer: profile.stripe_customer_id,
      limit: 5,
    });

    const paidSession = sessions.data.find(
      (session) => session.payment_status === "paid" && session.mode === "subscription"
    );

    if (paidSession && paidSession.subscription) {
      const subscription = await stripe.subscriptions.retrieve(
        paidSession.subscription as string
      );

      if (subscription.status === "active" || subscription.status === "trialing") {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await supabaseClient
          .from("profiles")
          .update({
            is_pro: true,
            subscription_expires_at: expiresAt.toISOString(),
            subscription_started_at: new Date().toISOString(),
            stripe_subscription_id: subscription.id,
          })
          .eq("id", user.id);

        return new Response(
          JSON.stringify({
            success: true,
            message: "Pro activated successfully!",
            is_pro: true
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        message: "No active subscription found"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Verification error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});