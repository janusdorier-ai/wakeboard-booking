# Party Game — Setup (Making Waves)

A live gamification layer for MCI Group's Geneva summer party: guests join
from their own phone via QR code, play four rounds, and watch their score and
rank climb. No accounts, no app install. It reuses the same Supabase project
as the wakeboard booking app but is otherwise fully independent (separate
tables, separate `/party` routes).

## Re-skinning for a different client

Everything client-specific — name, event, tagline, colors, avatar emoji, and
even the four game titles — lives in one file:
`src/lib/party/client-config.ts`. To reuse this for another client's event,
edit that file only; no other file needs to change. Colors are hex values
consumed as CSS variables (`--party-accent`, `--party-grad-from`, etc.) by
every themed page, so a new brand palette shows up everywhere immediately.

## 1. Run the migration

In **Supabase → SQL Editor**, run:

```
supabase/migrations/007_party_game.sql
```

This creates the `party_*` tables and a public `party-photos` storage bucket.
Guests never talk to Supabase directly — every read/write goes through this
app's `/api/party/*` routes using the service-role key, so no RLS policies or
storage policies are needed beyond what the migration sets up.

## 2. Set the admin passcode

Add to your env (`.env.local` for local, or your Vercel project's env vars):

```
PARTY_ADMIN_PASSCODE=pick-something-fun
```

This is a single shared passcode for `/party/admin` — the MC running the
party doesn't need a Supabase account, just this code.

## 3. Deploy

Same as the main app (see `SETUP.md` §7) — push this branch, deploy on
Vercel with the same Supabase env vars plus `PARTY_ADMIN_PASSCODE`.

## 4. Before doors open

1. Visit `https://your-deployment/party/admin`, enter the passcode.
2. Add a few trivia questions, at least one prediction prompt, and one photo
   mission — all via the forms on that page. Nothing is pre-seeded.
3. The admin page shows a QR code pointing at `/party` — display it on a
   screen at the entrance, or print/share it.

## 5. Running it live

- **Trivia**: hit "Go live" on a question when you want it to start counting
  down for everyone; "Close" it before opening the next one (opening a new
  one auto-closes whatever was live).
- **Reflex tap**: always open, guests can play anytime — no admin control
  needed, only their best 5-second run counts.
- **Predictions**: open a prompt, let guesses come in, then type the real
  answer into "Resolve & score" once you know it — points are awarded by how
  close each guess was (top 3 get a big bonus, top 10 a smaller one, everyone
  else who guessed gets a few points just for playing).
- **Photo missions**: open a mission, guests submit one photo each and can
  like others' submissions (not their own). Use the moderation grid to hide
  anything inappropriate.
- Guests see their own score and rank on their phone — there's no shared
  big-screen scoreboard by design.

## Scoring reference

| Game | Points |
|---|---|
| Trivia (correct) | 70 base + up to 30 speed bonus |
| Trivia (wrong / too late) | 0 |
| Reflex tap | 3 × taps (best attempt kept) |
| Prediction | 150 / 100 / 75 for closest 3, 30 for top 10, 10 for playing |
| Photo submission | 25 |
| Photo like received | 10 |

Tune these in `src/lib/party/scoring.ts` if you want different stakes.
