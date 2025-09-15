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
    const url = new URL(req.url);
    let token: string | null = url.searchParams.get('token');

    if (!token && req.method !== 'GET') {
      // Try to read JSON body
      try {
        const body = await req.json();
        token = body?.token ?? null;
      } catch (_) {
        // ignore
      }
    }

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client with service role for RLS-bypassing read
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate token
    const { data: session, error } = await supabaseClient
      .from('upload_sessions')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error || !session) {
      console.error('validate-upload-session: invalid or expired token', { error, token });
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid or expired token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // If request intends to deactivate/close the session
    if (req.method !== 'GET') {
      let action: string | null = null;
      try {
        const body = await req.json();
        action = body?.action ?? null;
      } catch (_) {}

      if (action === 'deactivate' || action === 'close') {
        const { error: updateError } = await supabaseClient
          .from('upload_sessions')
          .update({ is_active: false })
          .eq('id', session.id);
        if (updateError) {
          console.error('validate-upload-session: failed to deactivate session', updateError);
          return new Response(
            JSON.stringify({ valid: true, closed: false, error: 'Failed to close session' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }
        return new Response(
          JSON.stringify({ valid: true, closed: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Only treat as valid if still active
    const isActive = !!session.is_active && new Date(session.expires_at) > new Date();

    return new Response(
      JSON.stringify({
        valid: isActive,
        session: {
          id: session.id,
          user_id: session.user_id,
          session_id: session.session_id,
          test_type: session.test_type,
          expires_at: session.expires_at,
          is_active: session.is_active,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('validate-upload-session: unexpected error', err);
    return new Response(
      JSON.stringify({ error: err.message ?? 'Unexpected error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});