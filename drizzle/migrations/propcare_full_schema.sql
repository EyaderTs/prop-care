-- ============================================================
-- PropCare – Full Schema (run this in Supabase SQL Editor)
-- ============================================================

-- ─── 1. Enums ────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('tenant', 'manager');

CREATE TYPE maintenance_category AS ENUM (
  'hvac', 'plumbing', 'electrical', 'carpentry', 'appliance', 'general'
);

CREATE TYPE maintenance_urgency AS ENUM (
  'low', 'medium', 'high', 'critical'
);

CREATE TYPE maintenance_status AS ENUM (
  'pending', 'triaged', 'scheduled', 'in_progress', 'completed', 'cancelled'
);

-- ─── 2. public.users (mirrors auth.users) ───────────────────
--
-- Supabase stores authentication in auth.users (hidden schema).
-- We mirror it here so our tables can reference it with a FK.

CREATE TABLE public.users (
  id           UUID PRIMARY KEY,        -- same id as auth.users
  email        TEXT NOT NULL,
  display_name TEXT,
  avatar_url   TEXT,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Trigger function: fires every time a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Attach the trigger to auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- ─── 3. tenant_profiles ─────────────────────────────────────
--
-- One row per registered user (tenant OR property manager).
-- Created by our /register server action right after sign-up.

CREATE TABLE public.tenant_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  phone         TEXT,
  role          user_role NOT NULL DEFAULT 'tenant',
  unit_number   TEXT,                   -- tenants only
  building_name TEXT NOT NULL DEFAULT 'Meklit Tower',
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── 4. maintenance_requests ────────────────────────────────
--
-- Submitted by tenants; triaged by AI; approved & dispatched by manager.

CREATE TABLE public.maintenance_requests (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                  TEXT NOT NULL,
  description            TEXT NOT NULL,
  category               maintenance_category,
  urgency                maintenance_urgency DEFAULT 'medium',
  status                 maintenance_status NOT NULL DEFAULT 'pending',
  unit_number            TEXT,
  building_name          TEXT NOT NULL DEFAULT 'Meklit Tower',
  tenant_id              UUID NOT NULL REFERENCES public.tenant_profiles(id) ON DELETE CASCADE,
  assigned_technician_id UUID,
  scheduled_at           TIMESTAMP,
  resolved_at            TIMESTAMP,
  ai_analysis            JSONB,         -- Gemini triage result
  is_safety_risk         BOOLEAN NOT NULL DEFAULT FALSE,
  manager_notes          TEXT,
  created_at             TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── 5. Indexes (for fast lookups) ──────────────────────────

CREATE INDEX idx_tenant_profiles_user_id      ON public.tenant_profiles(user_id);
CREATE INDEX idx_maintenance_tenant_id        ON public.maintenance_requests(tenant_id);
CREATE INDEX idx_maintenance_status           ON public.maintenance_requests(status);
CREATE INDEX idx_maintenance_created_at       ON public.maintenance_requests(created_at DESC);
