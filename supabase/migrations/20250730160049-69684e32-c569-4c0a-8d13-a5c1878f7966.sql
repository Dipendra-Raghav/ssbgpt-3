-- Fix PIQ Forms table structure to match frontend expectations
-- First, add the missing columns that the frontend expects
ALTER TABLE public.piq_forms 
ADD COLUMN selection_board TEXT,
ADD COLUMN batch_no TEXT,
ADD COLUMN chest_no TEXT,
ADD COLUMN roll_no TEXT,
ADD COLUMN full_name TEXT,
ADD COLUMN father_name TEXT,
ADD COLUMN max_residence_place TEXT,
ADD COLUMN max_residence_district TEXT,
ADD COLUMN max_residence_state TEXT,
ADD COLUMN max_residence_population TEXT,
ADD COLUMN present_residence_place TEXT,
ADD COLUMN present_residence_district TEXT,
ADD COLUMN present_residence_state TEXT,
ADD COLUMN present_residence_population TEXT,
ADD COLUMN permanent_residence_place TEXT,
ADD COLUMN permanent_residence_district TEXT,
ADD COLUMN permanent_residence_state TEXT,
ADD COLUMN permanent_residence_population TEXT,
ADD COLUMN is_district_hq TEXT DEFAULT 'no',
ADD COLUMN parents_alive TEXT DEFAULT 'yes',
ADD COLUMN mother_death_age TEXT,
ADD COLUMN father_death_age TEXT,
ADD COLUMN father_occupation TEXT,
ADD COLUMN father_income TEXT,
ADD COLUMN mother_occupation TEXT,
ADD COLUMN mother_income TEXT,
ADD COLUMN age_years TEXT,
ADD COLUMN age_months TEXT,
ADD COLUMN height TEXT,
ADD COLUMN weight TEXT,
ADD COLUMN present_occupation TEXT,
ADD COLUMN personal_income TEXT,
ADD COLUMN ncc_training TEXT DEFAULT 'no',
ADD COLUMN ncc_details TEXT,
ADD COLUMN games_and_sports TEXT,
ADD COLUMN hobbies TEXT,
ADD COLUMN extra_curricular_activities TEXT,
ADD COLUMN positions_of_responsibility TEXT,
ADD COLUMN commission_nature TEXT,
ADD COLUMN service_choice TEXT DEFAULT 'army',
ADD COLUMN previous_attempts TEXT,
ADD COLUMN previous_ssb_details TEXT;

-- Create profile creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();