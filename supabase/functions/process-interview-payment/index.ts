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
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const url = new URL(req.url);
    let body: any = {};
    const contentType = req.headers.get("content-type") || "";

    try {
      // Read raw body once and try multiple parse strategies
      const raw = await req.text();
      if (raw && raw.trim().length > 0) {
        if (contentType.includes("application/json")) {
          body = JSON.parse(raw);
        } else if (contentType.includes("application/x-www-form-urlencoded")) {
          const params = new URLSearchParams(raw);
          body = Object.fromEntries(params.entries());
        } else {
          // Try JSON parse as a last resort
          try { body = JSON.parse(raw); } catch (_) { /* ignore */ }
        }
      }
    } catch (_) {
      // Ignore parse errors and continue with empty body
    }

    const action = (body as any).action || url.searchParams.get("action");

    if (action === "create-order") {
      const { interviewerId, slotId, amount } = body as any;

      if (!interviewerId || !slotId || typeof amount !== "number" || amount <= 0) {
        return new Response(
          JSON.stringify({ error: "Missing or invalid fields: interviewerId, slotId, amount" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

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

      // Get Razorpay credentials
      const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
      const razorpaySecretKey = Deno.env.get("RAZORPAY_SECRET_KEY");
      
      console.log("Razorpay Key ID exists:", !!razorpayKeyId);
      console.log("Razorpay Secret Key exists:", !!razorpaySecretKey);
      
      if (!razorpayKeyId || !razorpaySecretKey) {
        throw new Error("Razorpay credentials not found in environment");
      }

      // Create Razorpay order (receipt max 40 chars)
      const timestamp = Date.now().toString();
      const shortUserId = user.id.substring(0, 8); // First 8 chars of UUID
      const orderData = {
        amount: amount * 100, // Convert to paise
        currency: "INR",
        receipt: `int_${shortUserId}_${timestamp}`, // Keeps under 40 chars
        notes: {
          user_id: user.id,
          interviewer_id: interviewerId,
          slot_id: slotId,
        },
      };

      console.log("Creating Razorpay order with data:", { ...orderData, notes: "hidden" });

      const authString = btoa(`${razorpayKeyId}:${razorpaySecretKey}`);
      console.log("Auth string length:", authString.length);

      const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${authString}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      console.log("Razorpay API response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Razorpay API Error:", response.status, errorText);
        throw new Error(`Failed to create Razorpay order: ${response.status} - ${errorText}`);
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
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, interviewer_id, slot_id } = body as any;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !interviewer_id || !slot_id) {
        return new Response(
          JSON.stringify({ error: "Missing required fields for verification" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

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

        // Create interview request with approved status
        const { data: interviewRequest, error: requestError } = await supabaseService
          .from("interview_requests")
          .insert({
            user_id: user.id,
            interviewer_id: interviewer_id,
            slot_id: slot_id,
            status: "approved",
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

    return new Response(
      JSON.stringify({ error: "Invalid or missing action" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );

  } catch (error) {
    console.error("Error in process-interview-payment:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});