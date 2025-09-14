import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the user from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header provided');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid or expired token');
    }

    const { sessionId, testType } = await req.json();

    if (!sessionId || !testType) {
      return new Response(
        JSON.stringify({ error: 'sessionId and testType are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate a secure token for the upload session
    const token = crypto.randomUUID() + '-' + crypto.randomUUID();
    
    // Create upload session with 15-minute expiry
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    const { data, error } = await supabaseClient
      .from('upload_sessions')
      .insert({
        user_id: user.id,
        session_id: sessionId,
        test_type: testType,
        token: token,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw new Error('Failed to create upload session');
    }

    console.log('Upload session created:', data);

    return new Response(
      JSON.stringify({ 
        uploadUrl: `${req.headers.get('origin') || 'https://main--ssbgpt.lovable.app'}/mobile-upload?token=${token}`,
        token: token,
        expiresAt: expiresAt.toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error creating upload session:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});