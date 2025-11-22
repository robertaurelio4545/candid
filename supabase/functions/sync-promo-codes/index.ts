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

    if (userError) {
      throw new Error(`Auth error: ${userError.message}`);
    }

    if (!user) {
      throw new Error("No authenticated user found");
    }

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.is_admin) {
      throw new Error("Unauthorized: Admin access required");
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe is not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    const { data: promoCodes, error: promoError } = await supabaseClient
      .from("promo_codes")
      .select("*")
      .eq("is_active", true);

    if (promoError) {
      throw new Error(`Failed to fetch promo codes: ${promoError.message}`);
    }

    const results = [];

    for (const promo of promoCodes || []) {
      try {
        const coupon = await stripe.coupons.create({
          percent_off: promo.discount_percent,
          duration: "forever",
          name: `${promo.discount_percent}% off`,
        });

        const promotionCode = await stripe.promotionCodes.create({
          coupon: coupon.id,
          code: promo.code.toUpperCase(),
          max_redemptions: promo.max_uses || undefined,
        });

        results.push({
          code: promo.code,
          status: "created",
          couponId: coupon.id,
          promotionCodeId: promotionCode.id,
        });
      } catch (error: any) {
        if (error.code === "resource_already_exists") {
          results.push({
            code: promo.code,
            status: "already_exists",
          });
        } else {
          results.push({
            code: promo.code,
            status: "error",
            error: error.message,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});