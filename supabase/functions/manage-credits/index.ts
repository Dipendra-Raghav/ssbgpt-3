import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ManageCreditsRequest {
  action: "consume" | "check";
  test_type: "wat" | "srt" | "ppdt";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const { action, test_type }: ManageCreditsRequest = await req.json();

    // Get current credits and subscription status
    const { data: creditsData, error: creditsError } = await supabaseClient
      .from("user_credits")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (creditsError && creditsError.code !== 'PGRST116') {
      console.error("Credits fetch error:", creditsError);
      throw new Error("Failed to fetch user credits");
    }

    // Check for active subscription
    const { data: subscriptionData } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .maybeSingle();

    const hasUnlimited = subscriptionData && new Date(subscriptionData.expires_at) > new Date();

    const credits = creditsData || { wat_credits: 0, srt_credits: 0, ppdt_credits: 0 };
    const creditField = `${test_type}_credits`;
    const currentCredits = credits[creditField] || 0;

    if (action === "check") {
      return new Response(
        JSON.stringify({
          has_unlimited: hasUnlimited || false,
          credits: currentCredits,
          can_take_test: hasUnlimited || currentCredits > 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    if (action === "consume") {
      if (hasUnlimited) {
        return new Response(
          JSON.stringify({
            success: true,
            message: "Unlimited subscription - no credits consumed",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      if (currentCredits <= 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Insufficient credits",
            remaining_credits: 0,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }

      // Consume one credit
      const { error: updateError } = await supabaseClient
        .from("user_credits")
        .update({
          [creditField]: currentCredits - 1,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Credits update error:", updateError);
        throw new Error("Failed to update credits");
      }

      return new Response(
        JSON.stringify({
          success: true,
          remaining_credits: currentCredits - 1,
          message: "Credit consumed successfully",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    throw new Error("Invalid action");
  } catch (error) {
    console.error("Error in manage-credits:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});