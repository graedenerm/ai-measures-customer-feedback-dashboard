-- 007_companies_ecoplanet_customer_id.sql
-- Adds ecoplanet's internal customer ID to the companies table.
-- Already applied directly in Supabase — kept here for version control.

ALTER TABLE companies ADD COLUMN IF NOT EXISTS ecoplanet_customer_id TEXT UNIQUE;
