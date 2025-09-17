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

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "create-order") {
      const { interviewerId, slotId, amount }: CreateInterviewOrderRequest = await req.json();

      // Check if slot is still available
      const { data: slot, error: slotError } = await supabaseClient
        .from("interview_slots")
        .select("*")
        .eq("id", slotId)
        .eq("is_available", true)
        .single();

      if (slotError || !slot) {
        throw new Error("Slot is no longer available");
      }

      // Create Razorpay order
      const orderData = {
        amount: amount * 100, // Convert to paise
        currency: "INR",
        receipt: `interview_${user.id}_${Date.now()}`,
        notes: {
          user_id: user.id,
          interviewer_id: interviewerId,
          slot_id: slotId,
        },
      };

      const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${Deno.env.get("RAZORPAY_KEY_ID")}:${Deno.env.get("RAZORPAY_SECRET_KEY")}`)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error("Failed to create Razorpay order");
      }

      const order = await response.json();

      return new Response(
        JSON.stringify({
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          key: Deno.env.get("RAZORPAY_KEY_ID"),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    if (action === "verify-payment") {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, interviewer_id, slot_id }: VerifyInterviewPaymentRequest = await req.json();

      // Verify signature
      const crypto = await import("node:crypto");
      const expectedSignature = crypto
        .createHmac("sha256", Deno.env.get("RAZORPAY_SECRET_KEY")!)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        throw new Error("Invalid payment signature");
      }

      const supabaseService = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      // Generate Google Meet link (for demo purposes, using a template)
      const meetLink = `https://meet.google.com/interview-${Date.now()}`;

      // Create interview request with confirmed status
      const { data: interviewRequest, error: requestError } = await supabaseService
        .from("interview_requests")
        .insert({
          user_id: user.id,
          interviewer_id: interviewer_id,
          slot_id: slot_id,
          status: "confirmed",
          payment_status: "paid",
          stripe_payment_intent_id: razorpay_payment_id,
          google_meet_link: meetLink,
        })
        .select()
        .single();

      if (requestError) {
        console.error("Interview request creation error:", requestError);
        throw new Error("Failed to create interview request");
      }

      // Mark slot as unavailable
      const { error: slotUpdateError } = await supabaseService
        .from("interview_slots")
        .update({ is_available: false })
        .eq("id", slot_id);

      if (slotUpdateError) {
        console.error("Slot update error:", slotUpdateError);
        // Don't fail the entire process for this
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Interview booked successfully",
          interview_request: interviewRequest
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    throw new Error("Invalid action");

  } catch (error) {
    console.error("Error in process-interview-payment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});