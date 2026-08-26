-- ─── Escalation columns migration ────────────────────────────────────────────
-- Run this once in your Supabase SQL Editor to add escalation tracking columns.

-- 1. Add 'escalated' to the maintenance_status enum
ALTER TYPE maintenance_status ADD VALUE IF NOT EXISTS 'escalated';

-- 2. Add follow_up_sent_at — timestamp when the automated follow-up email was sent
ALTER TABLE maintenance_requests
  ADD COLUMN IF NOT EXISTS follow_up_sent_at TIMESTAMP;

-- 3. Add escalated_at — timestamp when the ticket was escalated
ALTER TABLE maintenance_requests
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP;

-- 4. Add timeline — JSONB array of activity events
ALTER TABLE maintenance_requests
  ADD COLUMN IF NOT EXISTS timeline JSONB DEFAULT '[]'::jsonb;
