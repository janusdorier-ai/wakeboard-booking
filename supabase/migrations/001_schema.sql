-- ============================================================
-- Wakeboard Booking — Initial Schema
-- Run this in Supabase SQL Editor (Database > SQL Editor).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- PROFILES (extends auth.users)
-- ------------------------------------------------------------
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'waker'
                CHECK (role IN ('waker', 'admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    CASE WHEN NEW.email = current_setting('app.admin_email', true) THEN 'admin' ELSE 'waker' END
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------
-- CLUB CONFIG (single-row table — one club per deployment for v1)
-- ------------------------------------------------------------
CREATE TABLE public.club_config (
  id                     INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  name                   TEXT NOT NULL DEFAULT 'Wakeboard Club',
  am_start               TIME NOT NULL DEFAULT '09:00',
  am_end                 TIME NOT NULL DEFAULT '12:30',
  pm_start               TIME NOT NULL DEFAULT '14:00',
  pm_end                 TIME NOT NULL DEFAULT '18:30',
  cluster_gap_minutes    INT  NOT NULL DEFAULT 45,
  cluster_lockin_hours   INT  NOT NULL DEFAULT 24, -- cluster rule kicks in N hours before period start
  solo_timeout_hours     INT  NOT NULL DEFAULT 48,
  slot_step_minutes      INT  NOT NULL DEFAULT 15, -- candidate-slot grid resolution
  duration_2_minutes     INT  NOT NULL DEFAULT 45,
  duration_3_minutes     INT  NOT NULL DEFAULT 70,
  duration_4_minutes     INT  NOT NULL DEFAULT 80,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.club_config (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- DAY OVERRIDES (admin can disable a date, e.g. weather, AM only, PM only)
-- ------------------------------------------------------------
CREATE TABLE public.day_overrides (
  date       DATE PRIMARY KEY,
  am_open    BOOLEAN NOT NULL DEFAULT true,
  pm_open    BOOLEAN NOT NULL DEFAULT true,
  note       TEXT
);

-- ------------------------------------------------------------
-- BOOKINGS — a confirmed/pending slot held by 1..4 wakers
-- ------------------------------------------------------------
CREATE TABLE public.bookings (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date         DATE NOT NULL,
  period       TEXT NOT NULL CHECK (period IN ('AM','PM')),
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  member_count INT  NOT NULL DEFAULT 0 CHECK (member_count BETWEEN 0 AND 4),
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','confirmed','full','cancelled')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (date, period, start_time)
);

CREATE INDEX bookings_date_period_idx ON public.bookings (date, period) WHERE status <> 'cancelled';

-- ------------------------------------------------------------
-- BOOKING MEMBERS — wakers attached to a booking
-- ------------------------------------------------------------
CREATE TABLE public.booking_members (
  booking_id  UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (booking_id, user_id)
);

-- A waker can hold at most one active booking per (date, period).
-- This invariant is enforced by join_or_create_booking() in 002_booking_functions.sql,
-- not by an index (the constraint requires a join across two tables).

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
-- Helper that checks admin without triggering RLS recursion (must be defined
-- before any policy references it).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_config      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_overrides    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_members  ENABLE ROW LEVEL SECURITY;

-- Profiles: users see/update their own; admins see all (admin check via is_admin() — avoids RLS recursion)
CREATE POLICY profiles_self_read ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());
CREATE POLICY profiles_self_update ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Club config: public read (open hours aren't sensitive), only admins write
CREATE POLICY club_config_read ON public.club_config FOR SELECT USING (true);
CREATE POLICY club_config_write ON public.club_config FOR UPDATE USING (public.is_admin());

-- Day overrides: public read, admin write
CREATE POLICY day_overrides_read ON public.day_overrides FOR SELECT USING (true);
CREATE POLICY day_overrides_write ON public.day_overrides FOR ALL USING (public.is_admin());

-- Bookings: public read (poll-style visibility); writes happen only via SECURITY DEFINER functions
CREATE POLICY bookings_read ON public.bookings FOR SELECT USING (true);
CREATE POLICY bookings_admin_write ON public.bookings FOR ALL USING (public.is_admin());

-- Booking members: public read; writes via functions
CREATE POLICY booking_members_read ON public.booking_members FOR SELECT USING (true);
CREATE POLICY booking_members_admin_write ON public.booking_members FOR ALL USING (public.is_admin());
