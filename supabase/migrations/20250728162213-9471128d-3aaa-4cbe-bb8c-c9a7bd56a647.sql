-- Insert the Grok API key as a secret
INSERT INTO vault.secrets (name, secret)
VALUES ('GROK_API_KEY', 'xai-cpFJLANZoDtjToEJN7VXZOyDvGMwpUIWImmh1klsLWaFnvFZ9XBoq1bb76zuZVt4o84X2osI2ENjWnQx')
ON CONFLICT (name) DO UPDATE SET secret = EXCLUDED.secret;