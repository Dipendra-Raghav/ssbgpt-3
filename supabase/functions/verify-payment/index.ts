import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
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

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature }: VerifyPaymentRequest = await req.json();

    // Verify signature
    const crypto = await import("node:crypto");
    const expectedSignature = crypto
      .createHmac("sha256", Deno.env.get("RAZORPAY_SECRET_KEY")!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      throw new Error("Invalid payment signature");
    }

    // Update subscription status
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // First, get the subscription details
    const { data: subscriptionData } = await supabaseService
      .from("subscriptions")
      .select("*")
      .eq("razorpay_payment_id", razorpay_order_id)
      .eq("user_id", user.id)
      .single();

    const { error: updateError } = await supabaseService
      .from("subscriptions")
      .update({
        status: "active",
        razorpay_payment_id: razorpay_payment_id,
        updated_at: new Date().toISOString(),
      })
      .eq("razorpay_payment_id", razorpay_order_id)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Subscription update error:", updateError);
      throw new Error("Failed to update subscription");
    }

    // Update user credits to unlimited
    const { error: creditsError } = await supabaseService
      .from("user_credits")
      .update({
        has_unlimited: true,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (creditsError) {
      console.error("Credits update error:", creditsError);
      throw new Error("Failed to update user credits");
    }

    // Send confirmation email
    try {
      await supabaseService.functions.invoke("send-subscription-email", {
        body: {
          user_email: user.email,
          subscription_type: "activation",
          payment_id: razorpay_payment_id,
          plan_name: subscriptionData?.plan_name || "Premium Plan",
        },
      });
      console.log("Subscription confirmation email sent successfully");
    } catch (emailError) {
      console.error("Failed to send subscription email:", emailError);
      // Don't fail the entire process for email issues
    }

    return new Response(
      JSON.stringify({ success: true, message: "Payment verified and subscription activated" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in verify-payment:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});