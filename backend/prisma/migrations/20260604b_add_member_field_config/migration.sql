-- Add memberFieldConfig column to Distance table
ALTER TABLE "Distance" ADD COLUMN IF NOT EXISTS "memberFieldConfig" JSONB;
