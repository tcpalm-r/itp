-- Migration: Add manager assessment support
-- Run this in Supabase SQL Editor

-- 1. Add assessor_id column to track who completed the assessment
ALTER TABLE itp_assessments
ADD COLUMN IF NOT EXISTS assessor_id UUID REFERENCES user_profiles(id);

-- 2. Add assessment_type column to distinguish self vs manager assessments
ALTER TABLE itp_assessments
ADD COLUMN IF NOT EXISTS assessment_type VARCHAR(20) DEFAULT 'self';

-- 3. Add check constraint for assessment_type
ALTER TABLE itp_assessments
ADD CONSTRAINT check_assessment_type CHECK (assessment_type IN ('self', 'manager'));

-- 4. Backfill existing assessments as self-assessments
UPDATE itp_assessments
SET assessor_id = employee_id,
    assessment_type = 'self'
WHERE assessor_id IS NULL;

-- 5. Make assessor_id NOT NULL after backfill
ALTER TABLE itp_assessments
ALTER COLUMN assessor_id SET NOT NULL;

-- 6. Create unique index to prevent duplicate drafts per employee-assessor-type combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_itp_assessments_draft_unique
ON itp_assessments(employee_id, assessor_id, assessment_type)
WHERE status = 'draft';

-- 7. Add index for querying assessments by assessor
CREATE INDEX IF NOT EXISTS idx_itp_assessments_assessor
ON itp_assessments(assessor_id);

-- 8. Add index for querying assessments by type
CREATE INDEX IF NOT EXISTS idx_itp_assessments_type
ON itp_assessments(assessment_type);
