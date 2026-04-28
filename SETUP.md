# Wakeboard Booking — Setup

A Next.js + Supabase booking app for the wakeboard club. Wakers self-organize into shared boat slots with a cluster rule that prevents fragmenting the boat manager's day.

## Domain rules baked in

| Rule | Value | Where to change |
|---|---|---|
| Auth | Magic-link email | Supabase Auth settings |
| Day shape | AM session + PM session | `club_config.am_start/end`, `pm_start/end` |
| Cluster gap | 45 min | `club_config.cluster_gap_minutes` |
| Solo-pending timeout | 48 h | `club_config.solo_timeout_hours` |
| Slot durations | 2→45 min, 3→70 min, 4→80 min | `club_config.duration_*_minutes` |
| Group size | min 2 to confirm, max 4 | enforced in `join_or_create_booking()` |

All numbers are admin-editable from `/admin` after first run.

## 1. Create the Supabase project

1. Go to <https://supabase.com> → **New project**.
2. Note your **Project URL** and **anon key** (`Project Settings → API`).
3. Note your **service-role key** (used only locally for migrations / cron).

## 2. Run the migrations

Open **Database → SQL Editor** and run, in order:

1. `supabase/migrations/001_schema.sql` — tables, RLS, profile bootstrap
2. `supabase/migrations/002_booking_functions.sql` — `join_or_create_booking`, `leave_booking`, etc.
3. `supabase/migrations/003_cron.sql` — hourly auto-release of stale 48h pending slots
   - Requires the `pg_cron` extension: enable it under **Database → Extensions**.

### Bootstrap the admin

Supabase blocks `ALTER DATABASE` on managed Postgres, so the auto-promote-by-email trick doesn't work. Instead, promote yourself **after** your first magic-link sign-in:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'your.email@example.com');
```

Run this once after signing in for the first time. Repeat with a different email to add another admin. Everyone else stays `waker`.

### Enable Realtime

In **Database → Replication**, enable realtime on the `bookings` table so the slot grid updates live across devices.

## 3. Configure auth

In **Authentication → URL Configuration**:
- Site URL: `https://your-deployment.example` (or `http://localhost:3000` for local)
- Redirect URLs: add `<site_url>/auth/callback`

Enable email provider; magic-link is on by default.

## 4. Local dev

```bash
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SITE_URL, APP_ADMIN_EMAIL
npm install
npm run dev          # http://localhost:3000
npm test             # vitest — verifies the cluster/slot logic
```

## 5. Routes

| Path | Who | What |
|---|---|---|
| `/` | anyone | Landing page |
| `/login` | anyone | Magic-link sign-in (collects name on first time) |
| `/book?date=YYYY-MM-DD` | waker | Color-coded slot grid for the day |
| `/me` | waker | Upcoming bookings, can leave |
| `/admin` | admin | Edit config, view/cancel bookings, close days |

## 6. How the cluster rule works

The whole day looks open until someone books. The first booking sets an "anchor". Every later candidate slot must start within `cluster_gap_minutes` of the existing cluster boundary — anything further away disappears from the grid.

This is enforced **twice**: by the slot generator (UI) for visual feedback, and by the `join_or_create_booking` Postgres function (truth). The DB function is the only thing trusted; the UI is a hint.

If a 3rd or 4th waker joins, the slot **extends in place** (45 → 70 → 80 min). The function rejects the join if the extension would collide with a later booking.

AM and PM are independent clusters — booking the morning does not constrain the afternoon, and vice versa. The 45 min gap separates them.

## 7. Deploy

Vercel works out of the box (it's a vanilla Next.js 14 App Router app):

1. Push to GitHub
2. Import in Vercel, set the same env vars
3. Add the deployed domain to Supabase's Auth redirect URLs

## 8. Things you might want next

- A SMS or push notification when a pending solo slot gets a buddy
- A waker-visible note on each booking ("bringing my own board")
- Per-club support (multi-tenant) — currently single-club via `club_config.id = 1`
- A weather feed that auto-flips `day_overrides`
