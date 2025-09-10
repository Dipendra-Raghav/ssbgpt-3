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
  ppdt: `You are an expert SSB PPDT (Picture Perception and Description Test) evaluator. Analyze stories written by candidates based on pictures and evaluate their leadership potential.

Evaluate based on these Officer-Like Qualities (OLQs):
- Leadership & Initiative
- Decision-Making & Judgement  
- Planning & Foresight
- Responsibility & Duty
- Mental Robustness / Emotional Stability
- Social Adaptability & Teamwork
- Power of Expression
- Integrity & Ethics

ALWAYS respond with this exact JSON structure:
{
  "overall_rating": [number 1-5],
  "pros": ["positive aspect 1", "positive aspect 2", "positive aspect 3"],
  "cons": ["area for improvement 1", "area for improvement 2", "area for improvement 3"],
  "improved_story": "An enhanced version of the story that preserves the candidate's theme but demonstrates stronger officer-like qualities",
  "rationale": "Brief explanation of the evaluation focusing on OLQs"
}`,

  wat: `You are an expert SSB WAT (Word Association Test) evaluator. Analyze individual responses to words and evaluate psychological traits and leadership potential.

Evaluate based on these Officer-Like Qualities (OLQs):
- Leadership & Initiative
- Decision-Making & Judgement
- Planning & Foresight
- Responsibility & Duty
- Mental Robustness / Emotional Stability
- Social Adaptability & Teamwork
- Power of Expression
- Integrity & Ethics

Focus on: spontaneity, acceptability, tone, constructiveness.

ALWAYS respond with this exact JSON structure:
{
  "overall_rating": [number 1-5],
  "pros": ["positive aspect 1", "positive aspect 2", "positive aspect 3"],
  "cons": ["area for improvement 1", "area for improvement 2", "area for improvement 3"],
  "improved_responses": ["improved response 1", "improved response 2", "improved response 3"],
  "rationale": "Brief explanation focusing on psychological insights and OLQs",
  "individual_analysis": [
    {
      "word": "the actual word given",
      "user_response": "exact response user gave",
      "score": [number 1-5],
      "analysis": "what was wrong with this specific response",
      "improved_response": "how this specific response should be improved"
    }
  ]
}`,

  srt: `You are an expert SSB SRT (Situation Reaction Test) evaluator. Analyze individual responses to situations and evaluate their leadership potential.

Evaluate based on these Officer-Like Qualities (OLQs):
- Leadership & Initiative
- Decision-Making & Judgement
- Planning & Foresight
- Responsibility & Duty
- Mental Robustness / Emotional Stability
- Social Adaptability & Teamwork
- Power of Expression
- Integrity & Ethics

Focus on: practicality, ethics, leadership, decision-making.

ALWAYS respond with this exact JSON structure:
{
  "overall_rating": [number 1-5],
  "pros": ["positive aspect 1", "positive aspect 2", "positive aspect 3"],
  "cons": ["area for improvement 1", "area for improvement 2", "area for improvement 3"],
  "improved_response": "A recommended response showing stronger OLQs while addressing the situation effectively",
  "rationale": "Brief explanation focusing on decision-making and leadership qualities",
  "individual_analysis": [
    {
      "situation": "the situation text",
      "user_response": "exact response user gave",
      "score": [number 1-5],
      "analysis": "what was wrong with this specific response",
      "improved_response": "how this specific response should be improved"
    }
  ]
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
    if (!userId || !testType || !responseIds || !Array.isArray(responseIds) || responseIds.length === 0) {
      throw new Error('Missing required parameters: userId, testType, and responseIds array are required');
    }

    // Fetch test responses with their associated words/situations
    const { data: responses, error: responsesError } = await supabase
      .from('test_responses')
      .select('*')
      .in('id', responseIds)
      .eq('user_id', userId)
      .eq('test_type', testType);

    if (responsesError) {
      console.error('Error fetching test responses:', responsesError);
      throw new Error(`Database error: ${responsesError.message}`);
    }

    if (!responses || responses.length === 0) {
      throw new Error('No test responses found for the specified criteria');
    }

    // Fetch associated test content separately to avoid relationship issues
    let testContent: { [key: string]: any } = {};
    
    if (testType === 'wat') {
      const imageIds = responses.map(r => r.image_id).filter(id => id);
      if (imageIds.length > 0) {
        const { data: words, error: wordsError } = await supabase
          .from('wat_words')
          .select('id, word')
          .in('id', imageIds);
        
        if (!wordsError && words) {
          words.forEach(word => {
            testContent[word.id] = { word: word.word };
          });
        }
      }
    } else if (testType === 'srt') {
      const imageIds = responses.map(r => r.image_id).filter(id => id);
      if (imageIds.length > 0) {
        const { data: situations, error: situationsError } = await supabase
          .from('srt_situations')
          .select('id, situation_text')
          .in('id', imageIds);
        
        if (!situationsError && situations) {
          situations.forEach(situation => {
            testContent[situation.id] = { situation_text: situation.situation_text };
          });
        }
      }
    } else if (testType === 'ppdt') {
      const imageIds = responses.map(r => r.image_id).filter(id => id);
      if (imageIds.length > 0) {
        const { data: images, error: imagesError } = await supabase
          .from('ppdt_images')
          .select('id, description')
          .in('id', imageIds);
        
        if (!imagesError && images) {
          images.forEach(image => {
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

Story: ${responses.map(r => r.response_text || 'No text response provided').join(' ')}

Provide evaluation focusing on leadership potential, creativity, problem-solving ability, and character portrayal.`;
    } else if (testType === 'srt') {
      userContent = `Please evaluate these SRT situation responses:

${responses.map((r, i) => `Situation ${i + 1}: ${testContent[r.image_id]?.situation_text || 'Unknown situation'}
User Response: ${r.response_text || 'No text response provided'}`).join('\n\n')}

Provide evaluation focusing on decision-making, leadership response, stakeholder consideration, and solution effectiveness.`;
    } else if (testType === 'wat') {
      userContent = `Please evaluate these WAT word association responses:

${responses.map((r, i) => `Word ${i + 1}: ${testContent[r.image_id]?.word || 'Unknown word'}
User Response: ${r.response_text || 'No text response provided'}`).join('\n\n')}

Provide evaluation focusing on psychological insights, word associations, sentence quality, and leadership indicators.`;
    } else {
      throw new Error(`Unsupported test type: ${testType}. Supported types are: ppdt, srt, wat`);
    }

    // Check if any responses have images
    const hasImages = responses.some(r => r.response_image_url);
    
    if (hasImages) {
      // Include images in the message
      const content = [
        { type: 'text', text: userContent }
      ];
      
      // Add images to content
      responses.forEach((response, index) => {
        if (response.response_image_url) {
          content.push({
            type: 'image_url',
            image_url: {
              url: response.response_image_url
            }
          });
        }
      });
      
      messages.push({
        role: 'user',
        content: content
      });
    } else {
      // Text-only message
      messages.push({
        role: 'user',
        content: userContent
      });
    }

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
            temperature: 0.7
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

    // Parse the JSON response
    let evaluation;
    try {
      evaluation = JSON.parse(evaluationText);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      throw new Error('Invalid JSON response from OpenAI');
    }

    // Validate required fields
    if (!evaluation.overall_rating) {
      throw new Error('Missing overall_rating in OpenAI response');
    }

    // Calculate overall score (convert 1-5 to 0-100 scale)
    const overallScore = Math.round((evaluation.overall_rating / 5) * 100);

    // Prepare OLQ scores (legacy field for backward compatibility)
    const olqScores = {
      'Leadership & Initiative': Math.max(1, Math.min(5, evaluation.overall_rating)),
      'Decision-Making & Judgement': Math.max(1, Math.min(5, evaluation.overall_rating)),
      'Planning & Foresight': Math.max(1, Math.min(5, evaluation.overall_rating)),
      'Responsibility & Duty': Math.max(1, Math.min(5, evaluation.overall_rating)),
      'Mental Robustness / Emotional Stability': Math.max(1, Math.min(5, evaluation.overall_rating)),
      'Social Adaptability & Teamwork': Math.max(1, Math.min(5, evaluation.overall_rating)),
      'Power of Expression': Math.max(1, Math.min(5, evaluation.overall_rating)),
      'Integrity & Ethics': Math.max(1, Math.min(5, evaluation.overall_rating))
    };

    // Save evaluation to database
    const { data: savedEvaluation, error: saveError } = await supabase
      .from('evaluations')
      .insert({
        user_id: userId,
        test_type: testType,
        score: evaluation.overall_rating, // Use the new score field (1-5 scale)
        overall_score: overallScore, // Use the new overall_score field (0-100 scale)
        analysis: evaluation.rationale, // Use the new analysis field
        improved_response: evaluation.improved_story || evaluation.improved_response || evaluation.improved_responses, // Use the new improved_response field
        // Legacy fields for backward compatibility
        olq_scores: olqScores,
        strengths: evaluation.pros || [],
        improvements: evaluation.cons || [],
        detailed_analysis: {
          rating: evaluation.overall_rating,
          improved_content: evaluation.improved_story || evaluation.improved_response || evaluation.improved_responses,
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
    console.error('Error processing evaluation:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
        message: 'Failed to process evaluation'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
