import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};
const SYSTEM_PROMPTS = {
  wat: `You are an expert SSB WAT evaluator for Indian SSB psychology. Evaluate word→sentence responses with strict 15-second realism, producing concise, constructive feedback that reflects Officer-Like Qualities (OLQs). Output ONLY the JSON object described below, with no extra text, markdown, or keys.

Assess for these OLQs:
- Leadership & Initiative; Decision-Making & Judgement; Planning & Foresight; Responsibility & Duty; Mental Robustness / Emotional Stability; Social Adaptability & Teamwork; Power of Expression; Integrity & Ethics.

SSB style and constraints:
- Brevity: improved_response items must be 6–12 words, present-active, specific, and practical.  
- First-idea realism: evaluate as if written in 15 seconds.  
- Language discipline: avoid excessive "I," clichés, vagueness; responses must be practical.  
- Negative words: convert with denial/remedial framing.  
- Penalize: antisocial/negative tones, fact-free slogans, pure definitions, modal-heavy hypotheticals.  

CRITICAL EVALUATION REQUIREMENTS:
1. You MUST evaluate ALL words provided in the word list - every single word must have an individual analysis entry
2. Generate THREE improved responses for ANY score below 5/5

JSON structure:
{
  "overall_score": [number 0-5] (this will be the average of all the individual score),
  "rationale": "Concise rationale linking decisions to OLQs and WAT constraints",
  "individual_analysis": [
    {
      "word": "the actual word given",
      "user_response": "exact response user gave ('No response Provided' if blank)",
      "score": [number 0-5],
      "analysis": "Specific critique tied to OLQs, brevity, practical framing",
      "improved_response_1": "6–12 words, officer-like, practical, remedial if negative",
      "improved_response_2": "6–12 words, officer-like, practical, remedial if negative",
      "improved_response_3": "6–12 words, officer-like, practical, remedial if negative"
    }
  ]
}`,
  srt: `You are an expert SSB SRT evaluator. Evaluate situation→reaction for practical, lawful, ethical, resource-aware action under time pressure (~30s per item). Output ONLY JSON.

Constraints:
- Solutions must be realistic, feasible, safe.  
- Prefer complete action chains (sense→decide→act→escalate→follow-up).  
- Brevity: improved_response 10–20 words, telegraphic action sequence.  
- Priorities: safeguard life, call help, use nearest resources, inform authorities, avoid heroics.  
- Ethics: no illegal/vigilante actions.  

CRITICAL EVALUATION REQUIREMENTS:
1. You MUST evaluate ALL situations provided in the situation list - every single situation must have an individual analysis entry 
2. Generate THREE improved responses for ANY score below 5/5 

JSON structure:
{
  "overall_score": [number 0-5] (this will be the average of all the individual score),
  "rationale": "Brief justification tied to decision-making, safety, ethics, OLQs",
  "individual_analysis": [
    {
      "situation": "the situation text",
      "user_response": "exact response user gave ('No Response Provided' if blank)",
      "score": [number 0-5],
      "analysis": "Critique on feasibility, safety, legality, resourcefulness, OLQs",
      "improved_response_1": "10–20 words, practical, lawful, safe, resource-aware",
      "improved_response_2": "10–20 words, practical, lawful, safe, resource-aware",
      "improved_response_3": "10–20 words, practical, lawful, safe, resource-aware"
    }
  ]
}`,
  ppdt: `You are an expert SSB PPDT evaluator. Analyze the provided PPDT image and the user's story response to assess Officer-Like Qualities (OLQs). Focus on:
- Leadership potential, decision-making skills, character portrayal, creativity, and emotional maturity
- Practical problem-solving, teamwork, positive outlook, and realistic scenarios  
- Coherence, depth, and presence of OLQs in the narrative
- How well the story interprets and utilizes the visual elements in the image

Provide individual ratings for these specific criteria:
- Clarity & Communication (1-5): How clearly the story is written and ideas are expressed
- Logic & Reasoning (1-5): Logical flow, cause-effect relationships, realistic solutions
- Tone & Positivity (1-5): Positive outlook, constructive approach, officer-like tone
- Leadership Qualities (1-5): Leadership, initiative, teamwork, responsibility demonstrated

CRITICAL EVALUATION REQUIREMENTS:
1. Generate Two improved stories for ANY score below 5/5
2.. You MUST evaluate ALL situations provided in the situation list - every single situation must have an individual analysis entry 

JSON structure:
{
  "overall_score": [number 0-5] (this will be the average of all the individual score),
  "rationale": "Concise evaluation rationale explaining the overall assessment",
  "individual_analysis": [
    {
      "user_story": "exact story response user gave ('No Response Provided' if blank)",
      "score": [number 0-5],
      "analysis": "Detailed analysis covering strengths and areas for improvement",
      "pros": "Key strengths demonstrated in the response",
      "cons": "Areas that need improvement or were lacking",
      "improved_story_1": "Enhanced version showing clearer OLQs and better narrative structure",
      "improved_story_2": "Alternative enhanced story with different OLQ emphasis", 
    }
  ]
}`
};
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { userId, testType, responseIds } = await req.json();
    console.log('Processing OpenAI evaluation for user:', userId, 'test:', testType);
    // Validate required parameters
    if (!userId || !testType || !Array.isArray(responseIds) || responseIds.length === 0) {
      console.error('Missing required parameters:', {
        userId,
        testType,
        responseIds
      });
      throw new Error('Missing required parameters: userId, testType, and responseIds are required');
    }
    console.log('Validated parameters:', {
      userId,
      testType,
      responseIds: responseIds.length
    });
    // Fetch test responses with their associated words/situations
    let responses = [];
    let testContent = {};
    const { data: respData, error: responsesError } = await supabase.from('test_responses').select('*').in('id', responseIds).eq('user_id', userId).eq('test_type', testType);
    if (responsesError) {
      console.error('Error fetching test responses:', responsesError);
      throw new Error(`Database error: ${responsesError.message}`);
    }
    if (!respData || respData.length === 0) {
      console.warn('No test responses found for the specified criteria');
      throw new Error('No test responses found for the specified criteria');
    }
    responses = respData;
    // Fetch associated test content separately to avoid relationship issues
    if (testType === 'wat') {
      const imageIds = responses.map((r)=>r.image_id).filter((id)=>id);
      if (imageIds.length > 0) {
        const { data: words, error: wordsError } = await supabase.from('wat_words').select('id, word').in('id', imageIds);
        if (!wordsError && words) {
          words.forEach((word)=>{
            testContent[word.id] = {
              word: word.word
            };
          });
        }
      }
    } else if (testType === 'srt') {
      const imageIds = responses.map((r)=>r.image_id).filter((id)=>id);
      if (imageIds.length > 0) {
        const { data: situations, error: situationsError } = await supabase.from('srt_situations').select('id, situation_text').in('id', imageIds);
        if (!situationsError && situations) {
          situations.forEach((situation)=>{
            testContent[situation.id] = {
              situation_text: situation.situation_text
            };
          });
        }
      }
    } else if (testType === 'ppdt') {
      const imageIds = responses.map((r)=>r.image_id).filter((id)=>id);
      if (imageIds.length > 0) {
        const { data: images, error: imagesError } = await supabase.from('ppdt_images').select('id, url').in('id', imageIds);
        if (!imagesError && images) {
          images.forEach((image)=>{
            testContent[image.id] = {
              url: image.url
            };
          });
        }
      }
    }
    // Prepare evaluation content based on test type
    let userContent = '';
    const messages = [
      {
        role: 'system',
        content: SYSTEM_PROMPTS[testType]
      }
    ];
    if (testType === 'ppdt') {
      // For PPDT, send each image with its corresponding story individually
      const contentItems = [];
      // Add text explaining the evaluation task
      contentItems.push({
        type: 'text',
        text: `Please evaluate these PPDT image(s) and story responses individually:

${responses.map((r, i)=>`Image ${i + 1} Story: ${r.response_text || 'No response provided'}`).join('\n\n')}

IMPORTANT: You must provide individual analysis for ALL ${responses.length} PPDT images and stories listed above. For any image where the user story shows "No response provided", mark it with score 0 and note "No response provided" in the analysis.

Provide evaluation focusing on leadership potential, creativity, problem-solving ability, and character portrayal based on both the image content and the user's story.`
      });
      // Add each PPDT image
      responses.forEach((r, i)=>{
        const imageUrl = testContent[r.image_id]?.url;
        if (imageUrl) {
          contentItems.push({
            type: 'image_url',
            image_url: {
              url: imageUrl,
              detail: 'high'
            }
          });
        }
      });
      if (contentItems.length === 1) {
        throw new Error('No PPDT images found for evaluation');
      }
      messages.push({
        role: 'user',
        content: contentItems
      });
    } else if (testType === 'srt') {
      userContent = `Please evaluate these SRT situation responses:

${responses.map((r, i)=>`Situation ${i + 1}: ${testContent[r.image_id]?.situation_text || 'Unknown situation'}
User Response: ${r.response_text || 'No response provided'}`).join('\n\n')}

IMPORTANT: You must provide individual analysis for ALL ${responses.length} situations listed above. For any situation where the user response shows "No response provided", mark it with score 0 and note "No response provided" in the analysis.

Provide evaluation focusing on decision-making, leadership response, stakeholder consideration, and solution effectiveness.`;
    } else if (testType === 'wat') {
      userContent = `Please evaluate these WAT word association responses:

${responses.map((r, i)=>`Word ${i + 1}: ${testContent[r.image_id]?.word || 'Unknown word'}
User Response: ${r.response_text || 'No response provided'}`).join('\n\n')}

IMPORTANT: You must provide individual analysis for ALL ${responses.length} words listed above. For any word where the user response shows "No response provided", mark it with score 0 and note "No response provided" in the analysis.

Provide evaluation focusing on psychological insights, word associations, sentence quality, and leadership indicators.`;
    } else {
      throw new Error(`Unsupported test type: ${testType}. Supported types are: ppdt, srt, wat`);
    }
    // Add user content message for non-PPDT tests (PPDT already added above with images)
    if (testType !== 'ppdt') {
      messages.push({
        role: 'user',
        content: userContent
      });
    }
    console.log('Sending evaluation request to OpenAI with messages:', JSON.stringify(messages, null, 2));
    // Call OpenAI Chat Completions API with retry logic
    let openAIResponse;
    let retryCount = 0;
    const maxRetries = 3;
    while(retryCount < maxRetries){
      try {
        openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: messages,
            max_tokens: 2000,
            temperature: 0.7,
            response_format: {
              type: 'json_object'
            }
          })
        });
        if (openAIResponse.ok) {
          break; // Success, exit retry loop
        }
        const errorText = await openAIResponse.text();
        console.error(`OpenAI API error (attempt ${retryCount + 1}):`, errorText);
        if (retryCount === maxRetries - 1) {
          throw new Error(`OpenAI API failed after ${maxRetries} attempts: ${errorText}`);
        }
        retryCount++;
        // Wait before retrying (exponential backoff)
        await new Promise((resolve)=>setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      } catch (error) {
        if (retryCount === maxRetries - 1) {
          throw error;
        }
        retryCount++;
        await new Promise((resolve)=>setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      }
    }
    if (!openAIResponse || !openAIResponse.ok) {
      throw new Error('Failed to get evaluation from OpenAI after multiple attempts');
    }
    const openAIData = await openAIResponse.json();
    const evaluationText = openAIData.choices[0]?.message?.content;
    if (!evaluationText) {
      throw new Error('No evaluation content received from OpenAI');
    }
    console.log('OpenAI response:', evaluationText);
    // Parse the JSON response with robust error handling
    let evaluation;
    try {
      // Try parsing as-is first
      evaluation = JSON.parse(evaluationText);
    } catch (parseError) {
      console.error('Initial JSON parse failed, attempting cleanup:', parseError);
      try {
        // Strip markdown code fences if present
        let cleanText = evaluationText.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
        evaluation = JSON.parse(cleanText);
      } catch (secondParseError) {
        console.error('Cleaned JSON parse failed, trying regex extraction:', secondParseError);
        try {
          // Last resort: extract JSON from text using regex
          const jsonMatch = evaluationText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            evaluation = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No JSON found in response');
          }
        } catch (finalParseError) {
          console.error('All JSON parsing attempts failed:', finalParseError);
          console.log('Raw OpenAI response that failed to parse:', evaluationText);
          throw new Error('Unable to parse evaluation response from OpenAI');
        }
      }
    }
    // For PPDT, you need to add the image URL back into the evaluation object
    if (testType === 'ppdt' && evaluation.individual_analysis) {
      evaluation.individual_analysis.forEach((analysisItem, index)=>{
        const correspondingResponse = responses[index];
        if (correspondingResponse) {
          const imageUrl = testContent[correspondingResponse.image_id]?.url;
          if (imageUrl) {
            // Add the imageUrl to the object that will be saved
            analysisItem.image_url = imageUrl;
          }
        }
      });
    }
    // Save evaluation to database - only keep essential fields
    const { data: savedEvaluation, error: saveError } = await supabase.from('evaluations').insert({
      user_id: userId,
      test_type: testType,
      overall_score: Math.round(evaluation.overall_score),
      analysis: evaluation.rationale,
      detailed_analysis: evaluation
    }).select().single();
    if (saveError) {
      console.error('Error saving evaluation:', saveError);
      throw new Error(`Error saving evaluation: ${saveError.message}`);
    }
    console.log('Evaluation saved successfully:', savedEvaluation.id);
    return new Response(JSON.stringify({
      success: true,
      evaluation: savedEvaluation,
      message: 'Evaluation completed successfully'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Error in openai-evaluation function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Evaluation failed'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});