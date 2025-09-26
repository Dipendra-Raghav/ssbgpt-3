import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateInterviewOrderRequest {
  interviewerId: string;
  slotId: string;
  amount: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 405 }
    );
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader?.replace("Bearer ", "");

    const { data: authData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({ error: "User not authenticated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    const user = authData.user;

    const { interviewerId, slotId, amount }: CreateInterviewOrderRequest = await req.json();

    if (!interviewerId || !slotId || typeof amount !== "number" || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid fields: interviewerId, slotId, amount" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check slot availability
    const { data: slot, error: slotError } = await supabaseClient
      .from("interview_slots")
      .select("id, is_available")
      .eq("id", slotId)
      .eq("is_available", true)
      .single();

    if (slotError || !slot) {
      return new Response(
        JSON.stringify({ error: "Slot is no longer available" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 }
      );
    }

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
        Authorization: `Basic ${razorpayAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amount * 100,
        currency: "INR",
        receipt: `int_${user.id.slice(0, 8)}_${Date.now()}`,
        notes: { user_id: user.id, interviewer_id: interviewerId, slot_id: slotId },
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

    return new Response(
      JSON.stringify({
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: keyId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error in interview-create-order:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal Server Error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
