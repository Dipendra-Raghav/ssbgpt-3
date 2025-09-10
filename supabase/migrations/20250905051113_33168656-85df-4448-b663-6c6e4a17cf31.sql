-- Enable Google Auth Provider
UPDATE auth.providers 
SET enabled = true 
WHERE name = 'google';