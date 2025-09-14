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
    // Initialize Supabase client with service role for unrestricted access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const formData = await req.formData();
    const token = formData.get('token') as string;
    const file = formData.get('file') as File;

    if (!token || !file) {
      return new Response(
        JSON.stringify({ error: 'Token and file are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Mobile upload request:', { token, fileName: file.name, fileSize: file.size });

    // Validate token and get upload session
    const { data: uploadSession, error: sessionError } = await supabaseClient
      .from('upload_sessions')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !uploadSession) {
      console.error('Invalid or expired token:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired upload token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Valid upload session found:', uploadSession);

    // Upload file to storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${uploadSession.user_id}/${uploadSession.session_id}_mobile_${Date.now()}.${fileExt}`;
    
    const fileBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);

    const { error: uploadError } = await supabaseClient.storage
      .from('test-responses')
      .upload(fileName, fileBytes, {
        contentType: file.type || 'image/jpeg'
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error('Failed to upload file to storage');
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseClient.storage
      .from('test-responses')
      .getPublicUrl(fileName);

    console.log('File uploaded successfully:', { fileName, publicUrl });

    // Record the upload in session_uploads table for realtime sync
    const { data: sessionUpload, error: recordError } = await supabaseClient
      .from('session_uploads')
      .insert({
        upload_session_id: uploadSession.id,
        user_id: uploadSession.user_id,
        session_id: uploadSession.session_id,
        test_type: uploadSession.test_type,
        file_path: fileName,
        public_url: publicUrl
      })
      .select()
      .single();

    if (recordError) {
      console.error('Error recording upload:', recordError);
      throw new Error('Failed to record upload');
    }

    console.log('Upload recorded successfully:', sessionUpload);

    return new Response(
      JSON.stringify({ 
        success: true,
        url: publicUrl,
        fileName: file.name,
        uploadId: sessionUpload.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error processing mobile upload:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});