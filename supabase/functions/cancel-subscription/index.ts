import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14.10.0";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function calculateDuration(start: Date, end: Date): string {
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks !== 1 ? 's' : ''}`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months !== 1 ? 's' : ''}`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years} year${years !== 1 ? 's' : ''}`;
  }
}

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

    if (userError) {
      throw new Error(`Auth error: ${userError.message}`);
    }

    if (!user) {
      throw new Error("No authenticated user found");
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("stripe_subscription_id, is_pro, username, subscription_started_at")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(`Profile error: ${profileError.message}`);
    }

    if (!profile) {
      throw new Error("Profile not found");
    }

    if (!profile.is_pro) {
      throw new Error("No active subscription found");
    }

    if (!profile.stripe_subscription_id) {
      throw new Error("No Stripe subscription ID found");
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe is not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    try {
      await stripe.subscriptions.cancel(profile.stripe_subscription_id);
    } catch (stripeError: any) {
      console.error("Stripe cancellation error:", stripeError.message);
      if (!stripeError.message.includes("No such subscription")) {
        throw stripeError;
      }
    }

    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({
        is_pro: false,
        subscription_expires_at: null,
        stripe_subscription_id: null,
      })
      .eq("id", user.id);

    if (updateError) {
      throw new Error(`Update error: ${updateError.message}`);
    }

    const username = profile.username || "Unknown User";

    const subscriptionDuration = profile.subscription_started_at
      ? calculateDuration(new Date(profile.subscription_started_at), new Date())
      : "Unknown";

    await supabaseClient
      .from("cancellations")
      .insert({
        user_id: user.id,
        username: username,
        cancelled_at: new Date().toISOString(),
        subscription_duration: subscriptionDuration,
      });

    await supabaseClient
      .from("admin_messages")
      .insert({
        message: `User ${username} has cancelled their Pro subscription`,
        created_at: new Date().toISOString(),
      });

    return new Response(
      JSON.stringify({ success: true, message: "Subscription cancelled successfully" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});