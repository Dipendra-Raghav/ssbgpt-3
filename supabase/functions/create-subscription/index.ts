import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateSubscriptionRequest {
  planId: string;
  planName: string;
  amount: number;
  currency: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const { planId, planName, amount, currency }: CreateSubscriptionRequest = await req.json();

    // Validate input
    if (!planId || !planName || !currency || typeof amount !== "number" || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid subscription payload" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Create Razorpay order
    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const secretKey = Deno.env.get("RAZORPAY_SECRET_KEY");

    if (!keyId || !secretKey) {
      console.error("Razorpay keys not configured", { hasKeyId: !!keyId, hasSecret: !!secretKey });
      return new Response(
        JSON.stringify({ error: "Razorpay keys not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const razorpayAuth = btoa(`${keyId}:${secretKey}`);
    
    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${razorpayAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amount * 100, // Razorpay expects amount in paisa
        currency: currency,
        receipt: `${user.id.slice(0, 8)}_${Date.now()}`,
        notes: {
          plan_id: planId,
          plan_name: planName,
          user_id: user.id,
        },
      }),
    });

    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text();
      console.error("Razorpay order creation failed", razorpayResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to create Razorpay order", details: errorText }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const razorpayOrder = await razorpayResponse.json();

    // Store subscription record
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year subscription

    const { error: subscriptionError } = await supabaseService
      .from("subscriptions")
      .insert({
        user_id: user.id,
        plan_id: planId,
        plan_name: planName,
        amount: amount,
        currency: currency,
        expires_at: expiresAt.toISOString(),
        status: "pending",
        razorpay_payment_id: razorpayOrder.id,
      });

    if (subscriptionError) {
      console.error("Subscription insert error:", subscriptionError);
      throw new Error("Failed to create subscription record");
    }

    return new Response(
      JSON.stringify({
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: Deno.env.get("RAZORPAY_KEY_ID"),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in create-subscription:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});