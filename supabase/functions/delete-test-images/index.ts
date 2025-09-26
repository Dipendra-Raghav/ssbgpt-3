import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { sessionId, testType } = await req.json();

    if (!sessionId || !testType) {
      return new Response(
        JSON.stringify({ error: 'Session ID and test type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Deleting images for session: ${sessionId}, test type: ${testType}`);

    // Get all test responses with image URLs for this session
    const { data: responses, error: fetchError } = await supabaseClient
      .from('test_responses')
      .select('response_image_url')
      .eq('session_id', sessionId)
      .eq('test_type', testType)
      .not('response_image_url', 'is', null);

    if (fetchError) {
      console.error('Error fetching responses:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch test responses' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get session uploads for this session
    const { data: uploads, error: uploadsError } = await supabaseClient
      .from('session_uploads')
      .select('file_path')
      .eq('session_id', sessionId)
      .eq('test_type', testType);

    if (uploadsError) {
      console.error('Error fetching uploads:', uploadsError);
    }

    let deletedFiles = 0;

    // Delete images from responses
    if (responses && responses.length > 0) {
      for (const response of responses) {
        if (response.response_image_url) {
          try {
            // Extract file path from URL
            const url = new URL(response.response_image_url);
            const pathParts = url.pathname.split('/');
            const fileName = pathParts[pathParts.length - 1];
            
            const { error: deleteError } = await supabaseClient.storage
              .from('test-responses')
              .remove([fileName]);

            if (deleteError) {
              console.error(`Error deleting file ${fileName}:`, deleteError);
            } else {
              deletedFiles++;
              console.log(`Deleted file: ${fileName}`);
            }
          } catch (error) {
            console.error(`Error processing URL ${response.response_image_url}:`, error);
          }
        }
      }
    }

    // Delete session upload files
    if (uploads && uploads.length > 0) {
      for (const upload of uploads) {
        try {
          const { error: deleteError } = await supabaseClient.storage
            .from('test-responses')
            .remove([upload.file_path]);

          if (deleteError) {
            console.error(`Error deleting upload file ${upload.file_path}:`, deleteError);
          } else {
            deletedFiles++;
            console.log(`Deleted upload file: ${upload.file_path}`);
          }
        } catch (error) {
          console.error(`Error deleting upload file ${upload.file_path}:`, error);
        }
      }
    }

    console.log(`Successfully deleted ${deletedFiles} files for session ${sessionId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        deletedFiles,
        message: `Deleted ${deletedFiles} files for session ${sessionId}` 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in delete-test-images function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});