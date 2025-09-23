import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
2. For any word where no response is found, mark as "No response provided" with score 0
3. Generate THREE improved responses for ANY score below 5/5 (including scores of 4/5)

JSON structure:
{
  "overall_rating": [number 1-5],
  "rationale": "Concise rationale linking decisions to OLQs and WAT constraints",
  "individual_analysis": [
    {
      "word": "the actual word given",
      "user_response": "exact response user gave ('' if blank)",
      "score": [number 1-5],
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
2. For any situation where no response is found, mark as "No response provided" with score 0  
3. Generate THREE improved responses for ANY score below 5/5 (including scores of 4/5)

JSON structure:
{
  "overall_rating": [number 1-5],
  "rationale": "Brief justification tied to decision-making, safety, ethics, OLQs",
  "individual_analysis": [
    {
      "situation": "the situation text",
      "user_response": "exact response user gave ('' if blank)",
      "score": [number 1-5],
      "analysis": "Critique on feasibility, safety, legality, resourcefulness, OLQs",
      "improved_response_1": "10–20 words, practical, lawful, safe, resource-aware",
      "improved_response_2": "10–20 words, practical, lawful, safe, resource-aware",
      "improved_response_3": "10–20 words, practical, lawful, safe, resource-aware"
    }
  ]
}`,

  ppdt: `You are an expert SSB PPDT/TAT evaluator. Given a candidate's story/notes, produce officer-like evaluation and improved story. Output ONLY JSON.

Constraints:
- Structure: Situation → Task → Actions → Outcome.  
- Hero: normal human, age-appropriate, realistic.  
- OLQs: Effective Intelligence, Reasoning, Expression, Confidence, Determination, Organizing, Initiative, Teamwork, Responsibility, Courage, Adaptability, Liveliness.  
- Brevity: 8–12 sentences, realistic details, avoid melodrama/clichés.  
- Tone: constructive, ethical, service-oriented.  

CRITICAL EVALUATION REQUIREMENTS:
1. Generate THREE improved responses for ANY score below 5/5 (including scores of 4/5)
2. If no story content is provided, mark as "No response provided" with score 0

JSON structure:
{
  "overall_rating": [number 1-5],
  "rationale": "Explanation of OLQs demonstrated, realism, structure, and clarity",
  "improved_story_1": "Concise realistic story showing OLQs via actions and teamwork",
  "improved_story_2": "Concise realistic story showing OLQs via actions and teamwork", 
  "improved_story_3": "Concise realistic story showing OLQs via actions and teamwork"
}`
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { userId, testType, responseIds } = await req.json();

    console.log('Processing OpenAI evaluation for user:', userId, 'test:', testType);

    // Validate required parameters
    if (!userId || !testType || !Array.isArray(responseIds) || responseIds.length === 0) {
      console.error('Missing required parameters:', { userId, testType, responseIds });
      throw new Error('Missing required parameters: userId, testType, and responseIds are required');
    }

    console.log('Validated parameters:', { userId, testType, responseIds: responseIds.length });

    // Fetch test responses with their associated words/situations
    let responses: any[] = [];
    let testContent: { [key: string]: any } = {};
    
    const { data: respData, error: responsesError } = await supabase
      .from('test_responses')
      .select('*')
      .in('id', responseIds)
      .eq('user_id', userId)
      .eq('test_type', testType);

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
      const imageIds = responses.map(r => r.image_id).filter((id: any) => id);
      if (imageIds.length > 0) {
        const { data: words, error: wordsError } = await supabase
          .from('wat_words')
          .select('id, word')
          .in('id', imageIds);
        
        if (!wordsError && words) {
          words.forEach((word: any) => {
            testContent[word.id] = { word: word.word };
          });
        }
      }
    } else if (testType === 'srt') {
      const imageIds = responses.map(r => r.image_id).filter((id: any) => id);
      if (imageIds.length > 0) {
        const { data: situations, error: situationsError } = await supabase
          .from('srt_situations')
          .select('id, situation_text')
          .in('id', imageIds);
        
        if (!situationsError && situations) {
          situations.forEach((situation: any) => {
            testContent[situation.id] = { situation_text: situation.situation_text };
          });
        }
      }
    } else if (testType === 'ppdt') {
      const imageIds = responses.map(r => r.image_id).filter((id: any) => id);
      if (imageIds.length > 0) {
        const { data: images, error: imagesError } = await supabase
          .from('ppdt_images')
          .select('id, description')
          .in('id', imageIds);
        
        if (!imagesError && images) {
          images.forEach((image: any) => {
            testContent[image.id] = { description: image.description };
          });
        }
      }
    }

    // Prepare evaluation content based on test type
    let userContent = '';
    const messages: any[] = [
      {
        role: 'system',
        content: SYSTEM_PROMPTS[testType]
      }
    ];

    if (testType === 'ppdt') {
      userContent = `Please evaluate this PPDT story response:

Story: ${responses.map(r => r.response_text || 'No response provided').join(' ')}

${responses.some(r => !r.response_text || !r.response_text.trim()) ? 'IMPORTANT: No story content was provided. Mark this as "No response provided" with score 0.' : ''}

Provide evaluation focusing on leadership potential, creativity, problem-solving ability, and character portrayal.`;
    } else if (testType === 'srt') {
      userContent = `Please evaluate these SRT situation responses:

${responses.map((r, i) => `Situation ${i + 1}: ${testContent[r.image_id]?.situation_text || 'Unknown situation'}
User Response: ${r.response_text || 'No response provided'}`).join('\n\n')}

IMPORTANT: You must provide individual analysis for ALL ${responses.length} situations listed above. For any situation where the user response shows "No response provided", mark it with score 0 and note "No response provided" in the analysis.

Provide evaluation focusing on decision-making, leadership response, stakeholder consideration, and solution effectiveness.`;
    } else if (testType === 'wat') {
      userContent = `Please evaluate these WAT word association responses:

${responses.map((r, i) => `Word ${i + 1}: ${testContent[r.image_id]?.word || 'Unknown word'}
User Response: ${r.response_text || 'No response provided'}`).join('\n\n')}

IMPORTANT: You must provide individual analysis for ALL ${responses.length} words listed above. For any word where the user response shows "No response provided", mark it with score 0 and note "No response provided" in the analysis.

Provide evaluation focusing on psychological insights, word associations, sentence quality, and leadership indicators.`;
    } else {
      throw new Error(`Unsupported test type: ${testType}. Supported types are: ppdt, srt, wat`);
    }

    messages.push({
      role: 'user',
      content: userContent
    });

    console.log('Sending evaluation request to OpenAI with messages:', JSON.stringify(messages, null, 2));

    // Call OpenAI Chat Completions API with retry logic
    let openAIResponse;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
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
            response_format: { type: 'json_object' }
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
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        
      } catch (error) {
        if (retryCount === maxRetries - 1) {
          throw error;
        }
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
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

    // Validate required fields
    if (!evaluation.overall_rating) {
      throw new Error('Missing overall_rating in OpenAI response');
    }

    // Calculate overall score (convert 1-5 to 0-100 scale)
    const overallScore = Math.round((evaluation.overall_rating / 5) * 100);

    // Save evaluation to database - only keep essential fields
    const { data: savedEvaluation, error: saveError } = await supabase
      .from('evaluations')
      .insert({
        user_id: userId,
        test_type: testType,
        score: evaluation.overall_rating,
        overall_score: overallScore,
        analysis: evaluation.rationale,
        detailed_analysis: {
          rating: evaluation.overall_rating,
          rationale: evaluation.rationale,
          individual_analysis: evaluation.individual_analysis || [],
          raw_evaluation: evaluation
        }
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving evaluation:', saveError);
      throw new Error(`Error saving evaluation: ${saveError.message}`);
    }

    console.log('Evaluation saved successfully:', savedEvaluation.id);

    return new Response(
      JSON.stringify({
        success: true,
        evaluation: savedEvaluation,
        message: 'Evaluation completed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Error in openai-evaluation function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        message: 'Evaluation failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
