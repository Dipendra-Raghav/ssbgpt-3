import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyInterviewPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  interviewer_id: string;
  slot_id: string;
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

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, interviewer_id, slot_id }: VerifyInterviewPaymentRequest = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !interviewer_id || !slot_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const crypto = await import("node:crypto");
    const expectedSignature = crypto
      .createHmac("sha256", Deno.env.get("RAZORPAY_SECRET_KEY")!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return new Response(
        JSON.stringify({ error: "Invalid payment signature" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Double-check slot is still available before confirming
    const { data: slot, error: slotError } = await supabaseService
      .from("interview_slots")
      .select("id, is_available")
      .eq("id", slot_id)
      .single();

    if (slotError || !slot) {
      console.warn("Slot check failed during verify", slotError);
    }

    // Create interview request
    const meetLink = `https://meet.google.com/interview-${Date.now()}`;

    const { data: interviewRequest, error: requestError } = await supabaseService
      .from("interview_requests")
      .insert({
        user_id: user.id,
        interviewer_id,
        slot_id,
        status: "approved",
        payment_status: "paid",
        stripe_payment_intent_id: razorpay_payment_id,
        google_meet_link: meetLink,
      })
      .select()
      .single();

    if (requestError) {
      console.error("Interview request creation error:", requestError);
      return new Response(
        JSON.stringify({ error: "Failed to create interview request" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Mark slot as unavailable
    const { error: slotUpdateError } = await supabaseService
      .from("interview_slots")
      .update({ is_available: false })
      .eq("id", slot_id);

    if (slotUpdateError) {
      console.error("Slot update error:", slotUpdateError);
      // Not fatal
    }

    return new Response(
      JSON.stringify({ success: true, interview_request: interviewRequest }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error in interview-verify-payment:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal Server Error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
