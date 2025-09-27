-- Fix security issues by setting proper search_path for functions

-- Fix the generate_piq_summary function
CREATE OR REPLACE FUNCTION generate_piq_summary(piq_data jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  summary_text text := '';
  sibling jsonb;
  education jsonb;
BEGIN
  -- Personal Information
  summary_text := 'PERSONAL INFORMATION QUESTIONNAIRE SUMMARY' || E'\n\n';
  
  summary_text := summary_text || 'PERSONAL DETAILS:' || E'\n';
  summary_text := summary_text || '• Full Name: ' || COALESCE(piq_data->>'full_name', 'Not provided') || E'\n';
  summary_text := summary_text || '• Father''s Name: ' || COALESCE(piq_data->>'father_name', 'Not provided') || E'\n';
  summary_text := summary_text || '• Date of Birth: ' || COALESCE(piq_data->>'date_of_birth', 'Not provided') || E'\n';
  summary_text := summary_text || '• Age: ' || COALESCE(piq_data->>'age_years', 'Not provided') || ' years, ' || COALESCE(piq_data->>'age_months', 'Not provided') || ' months' || E'\n';
  summary_text := summary_text || '• Height: ' || COALESCE(piq_data->>'height', 'Not provided') || E'\n';
  summary_text := summary_text || '• Weight: ' || COALESCE(piq_data->>'weight', 'Not provided') || E'\n';
  summary_text := summary_text || '• Religion: ' || COALESCE(piq_data->>'religion', 'Not provided') || E'\n';
  summary_text := summary_text || '• Caste Category: ' || COALESCE(piq_data->>'caste_category', 'Not provided') || E'\n';
  summary_text := summary_text || '• Mother Tongue: ' || COALESCE(piq_data->>'mother_tongue', 'Not provided') || E'\n';
  summary_text := summary_text || '• Marital Status: ' || COALESCE(piq_data->>'marital_status', 'Not provided') || E'\n';
  summary_text := summary_text || '• State & District: ' || COALESCE(piq_data->>'state_and_district', 'Not provided') || E'\n\n';
  
  -- Residence Information
  summary_text := summary_text || 'RESIDENCE INFORMATION:' || E'\n';
  summary_text := summary_text || '• Max Residence: ' || COALESCE(piq_data->>'max_residence_place', 'Not provided') || ', ' || COALESCE(piq_data->>'max_residence_district', 'Not provided') || ', ' || COALESCE(piq_data->>'max_residence_state', 'Not provided') || E'\n';
  summary_text := summary_text || '• Present Residence: ' || COALESCE(piq_data->>'present_residence_place', 'Not provided') || ', ' || COALESCE(piq_data->>'present_residence_district', 'Not provided') || ', ' || COALESCE(piq_data->>'present_residence_state', 'Not provided') || E'\n';
  summary_text := summary_text || '• Permanent Residence: ' || COALESCE(piq_data->>'permanent_residence_place', 'Not provided') || ', ' || COALESCE(piq_data->>'permanent_residence_district', 'Not provided') || ', ' || COALESCE(piq_data->>'permanent_residence_state', 'Not provided') || E'\n';
  summary_text := summary_text || '• District HQ: ' || COALESCE(piq_data->>'is_district_hq', 'Not provided') || E'\n\n';
  
  -- Family Background
  summary_text := summary_text || 'FAMILY BACKGROUND:' || E'\n';
  summary_text := summary_text || '• Parents Alive: ' || COALESCE(piq_data->>'parents_alive', 'Not provided') || E'\n';
  summary_text := summary_text || '• Father - Education: ' || COALESCE(piq_data->>'father_education', 'Not provided') || ', Occupation: ' || COALESCE(piq_data->>'father_occupation', 'Not provided') || ', Income: ' || COALESCE(piq_data->>'father_income', 'Not provided') || E'\n';
  summary_text := summary_text || '• Mother - Education: ' || COALESCE(piq_data->>'mother_education', 'Not provided') || ', Occupation: ' || COALESCE(piq_data->>'mother_occupation', 'Not provided') || ', Income: ' || COALESCE(piq_data->>'mother_income', 'Not provided') || E'\n';
  
  -- Current Status
  summary_text := summary_text || E'\n' || 'CURRENT STATUS:' || E'\n';
  summary_text := summary_text || '• Present Occupation: ' || COALESCE(piq_data->>'present_occupation', 'Not provided') || E'\n';
  summary_text := summary_text || '• Personal Income: ' || COALESCE(piq_data->>'personal_income', 'Not provided') || E'\n\n';
  
  -- Activities & Interests
  summary_text := summary_text || 'ACTIVITIES & INTERESTS:' || E'\n';
  summary_text := summary_text || '• Games & Sports: ' || COALESCE(piq_data->>'games_and_sports', 'Not provided') || E'\n';
  summary_text := summary_text || '• Hobbies: ' || COALESCE(piq_data->>'hobbies', 'Not provided') || E'\n';
  summary_text := summary_text || '• Extra-curricular Activities: ' || COALESCE(piq_data->>'extra_curricular_activities', 'Not provided') || E'\n';
  summary_text := summary_text || '• Positions of Responsibility: ' || COALESCE(piq_data->>'positions_of_responsibility', 'Not provided') || E'\n';
  summary_text := summary_text || '• NCC Training: ' || COALESCE(piq_data->>'ncc_training', 'Not provided') || E'\n';
  summary_text := summary_text || '• NCC Details: ' || COALESCE(piq_data->>'ncc_details', 'Not provided') || E'\n\n';
  
  -- Service Preferences
  summary_text := summary_text || 'SERVICE PREFERENCES:' || E'\n';
  summary_text := summary_text || '• Commission Nature: ' || COALESCE(piq_data->>'commission_nature', 'Not provided') || E'\n';
  summary_text := summary_text || '• Service Choice: ' || COALESCE(piq_data->>'service_choice', 'Not provided') || E'\n';
  summary_text := summary_text || '• Previous Attempts: ' || COALESCE(piq_data->>'previous_attempts', 'Not provided') || E'\n';
  summary_text := summary_text || '• Previous SSB Details: ' || COALESCE(piq_data->>'previous_ssb_details', 'Not provided') || E'\n';
  
  RETURN summary_text;
END;
$$;

-- Fix the update_piq_summary function
CREATE OR REPLACE FUNCTION update_piq_summary()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Convert the row to JSONB for the summary function
  NEW.piq_summary := generate_piq_summary(to_jsonb(NEW));
  RETURN NEW;
END;
$$;