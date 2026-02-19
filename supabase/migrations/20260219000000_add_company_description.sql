-- Add optional description column to companies table
-- Allows each company to store and display its own description

ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN public.companies.description IS 'Optional description of the company, displayed in tooltips and profile.';
