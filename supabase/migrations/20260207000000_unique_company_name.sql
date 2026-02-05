-- Enforce unique company names (case-insensitive, trimmed) so no duplicate companies can exist.
-- If you already have duplicate names, fix them (rename or merge) before running this, or the index creation will fail.

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_name_lower_unique
  ON public.companies (LOWER(TRIM(name)));
