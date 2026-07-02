-- ============================================================
-- Party Game — MCI summer party gamification
-- Run this in Supabase SQL Editor (Database > SQL Editor).
--
-- Design note: unlike the booking tables, guests here never sign in
-- with Supabase Auth — they just hold a random token in localStorage.
-- Every read/write is mediated by our own Next.js API routes using the
-- service-role key, which bypasses RLS. So these tables enable RLS but
-- carry no policies: nothing is reachable directly from the browser.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------
-- PLAYERS
-- ------------------------------------------------------------
CREATE TABLE public.party_players (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  team        TEXT,
  avatar      TEXT NOT NULL DEFAULT '🎉',
  score       INT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX party_players_score_idx ON public.party_players (score DESC, created_at ASC);

-- ------------------------------------------------------------
-- TRIVIA
-- ------------------------------------------------------------
CREATE TABLE public.party_trivia_questions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_index         INT  NOT NULL DEFAULT 0,
  question            TEXT NOT NULL,
  options             JSONB NOT NULL,
  correct_index       INT  NOT NULL,
  time_limit_seconds  INT  NOT NULL DEFAULT 20,
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','live','closed')),
  opened_at           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.party_trivia_answers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id     UUID NOT NULL REFERENCES public.party_trivia_questions(id) ON DELETE CASCADE,
  player_id       UUID NOT NULL REFERENCES public.party_players(id) ON DELETE CASCADE,
  selected_index  INT  NOT NULL,
  correct         BOOLEAN NOT NULL,
  points          INT  NOT NULL DEFAULT 0,
  answered_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (question_id, player_id)
);

-- ------------------------------------------------------------
-- REFLEX (tap challenge — one best attempt kept per player)
-- ------------------------------------------------------------
CREATE TABLE public.party_reflex_scores (
  player_id   UUID PRIMARY KEY REFERENCES public.party_players(id) ON DELETE CASCADE,
  taps        INT NOT NULL,
  points      INT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- PREDICTIONS (closest-guess wins)
-- ------------------------------------------------------------
CREATE TABLE public.party_predictions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_index   INT  NOT NULL DEFAULT 0,
  prompt        TEXT NOT NULL,
  unit          TEXT,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','live','closed')),
  actual_value  NUMERIC,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.party_prediction_guesses (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prediction_id  UUID NOT NULL REFERENCES public.party_predictions(id) ON DELETE CASCADE,
  player_id      UUID NOT NULL REFERENCES public.party_players(id) ON DELETE CASCADE,
  guess          NUMERIC NOT NULL,
  points         INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (prediction_id, player_id)
);

-- ------------------------------------------------------------
-- PHOTO MISSIONS
-- ------------------------------------------------------------
CREATE TABLE public.party_photo_missions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_index  INT  NOT NULL DEFAULT 0,
  prompt       TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','live','closed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.party_photos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mission_id    UUID NOT NULL REFERENCES public.party_photo_missions(id) ON DELETE CASCADE,
  player_id     UUID NOT NULL REFERENCES public.party_players(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,
  vote_count    INT NOT NULL DEFAULT 0,
  approved      BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mission_id, player_id)
);

CREATE TABLE public.party_photo_votes (
  photo_id    UUID NOT NULL REFERENCES public.party_photos(id) ON DELETE CASCADE,
  voter_id    UUID NOT NULL REFERENCES public.party_players(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (photo_id, voter_id)
);

-- ------------------------------------------------------------
-- Public storage bucket for mission photos
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('party-photos', 'party-photos', true)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- Atomic score increment — a single UPDATE is race-safe under concurrent
-- requests (Postgres row locking), unlike a read-then-write from Node.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_party_score(p_player_id UUID, p_delta INT)
RETURNS INT LANGUAGE sql AS $$
  UPDATE public.party_players SET score = score + p_delta
    WHERE id = p_player_id
    RETURNING score;
$$;

CREATE OR REPLACE FUNCTION public.increment_party_photo_votes(p_photo_id UUID)
RETURNS INT LANGUAGE sql AS $$
  UPDATE public.party_photos SET vote_count = vote_count + 1
    WHERE id = p_photo_id
    RETURNING vote_count;
$$;

-- ============================================================
-- ROW LEVEL SECURITY — enabled, no policies (server-only access)
-- ============================================================
ALTER TABLE public.party_players            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_trivia_questions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_trivia_answers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_reflex_scores      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_predictions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_prediction_guesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_photo_missions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_photos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_photo_votes        ENABLE ROW LEVEL SECURITY;
