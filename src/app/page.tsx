import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CnvMark } from '@/components/CnvMark'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Logged-in riders go straight to the booking grid
  if (user) redirect('/book')

  return (
    <main className="min-h-screen relative overflow-hidden flex flex-col">
      {/* Background layers */}
      <div className="absolute inset-0 cnv-bg pointer-events-none" />
      <div className="absolute inset-0 cnv-grid-lines pointer-events-none" />

      {/* Decorative water line — horizon effect */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cnv-yellow/20 to-transparent" />

      <div className="relative flex flex-col flex-1 max-w-md mx-auto w-full px-6 py-10">

        {/* ── Logo & Club name ── */}
        <div className="flex items-center gap-3">
          <CnvMark className="h-10 w-auto opacity-90" />
          <div>
            <div className="font-mono text-[9px] tracking-[0.4em] text-cnv-yellow/70 uppercase">
              Club Nautique · Versoix
            </div>
            <div className="font-mono text-[9px] tracking-[0.25em] text-slate-500 mt-0.5">
              Lac Léman · Switzerland
            </div>
          </div>
        </div>

        {/* ── Hero ── */}
        <div className="mt-14 flex-1">
          <div className="font-mono text-[10px] tracking-[0.35em] text-slate-500 mb-5 flex items-center gap-3">
            <span className="inline-block h-px w-8 bg-cnv-yellow/40" />
            WAKEBOARD · SKI · LAKE
          </div>

          <h1 className="font-display text-[clamp(3.2rem,14vw,5rem)] font-black leading-[0.88] tracking-[-0.02em] text-white">
            Find<br />
            your<br />
            <span className="text-cnv-yellow">crew.</span>
          </h1>

          <p className="mt-7 text-slate-400 text-base leading-relaxed max-w-[280px]">
            Drop your slot, see who's riding, and the boat goes out when two wakers line up.
          </p>

          {/* ── CTAs ── */}
          <div className="mt-9 flex flex-col gap-3">
            <Link
              href="/login?mode=signup"
              className="group relative py-4 text-center bg-cnv-yellow text-cnv-navy-4 font-bold tracking-widest font-mono text-sm overflow-hidden transition hover:shadow-glow-yellow-sm active:scale-[0.99]">
              ▸ JOIN THE CLUB
            </Link>
            <Link
              href="/login"
              className="py-4 text-center border border-white/15 text-white font-mono text-sm tracking-widest transition hover:border-white/30 hover:bg-white/[0.04] active:scale-[0.99]">
              Already a member? Sign in
            </Link>
            <p className="text-center font-mono text-[10px] text-slate-600 tracking-[0.25em] mt-1">
              Magic link · No password · Free
            </p>
          </div>

          {/* ── How it works ── */}
          <div className="mt-10 border border-white/[0.08] bg-white/[0.02] p-5">
            <div className="font-mono text-[9px] tracking-[0.35em] text-cnv-yellow/60 mb-4">
              ▸ HOW IT WORKS
            </div>
            <ol className="space-y-3 font-mono text-xs text-slate-400 list-none">
              <li className="flex gap-3">
                <span className="text-cnv-yellow font-bold shrink-0">01</span>
                Sign in, pick a day and Morning / Afternoon.
              </li>
              <li className="flex gap-3">
                <span className="text-cnv-yellow font-bold shrink-0">02</span>
                Tap a time slot to hold it — like a Doodle, you can hold several.
              </li>
              <li className="flex gap-3">
                <span className="text-cnv-yellow font-bold shrink-0">03</span>
                A second waker joins your slot → session confirms, boat goes out.
              </li>
              <li className="flex gap-3">
                <span className="text-cnv-yellow font-bold shrink-0">04</span>
                Within 24h, only slots near existing bookings are shown — keeps the day clustered.
              </li>
            </ol>
          </div>

          {/* ── Slot states legend ── */}
          <div className="mt-3 border border-white/[0.08] bg-white/[0.02] p-5">
            <div className="font-mono text-[9px] tracking-[0.35em] text-cnv-yellow/60 mb-4">
              ▸ SLOT COLOURS
            </div>
            <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 font-mono text-xs text-slate-400">
              <LegendDot color="bg-amber-400"   label="Needs a buddy" sub="1 rider" />
              <LegendDot color="bg-emerald-400" label="Session on!"   sub="2–3 riders" />
              <LegendDot color="bg-violet-400"  label="Full crew"     sub="4 riders" />
              <LegendDot color="bg-cyan-400"    label="Open nearby"   sub="cluster zone" />
            </div>
          </div>

          {/* ── Stats ── */}
          <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[10px] text-slate-500">
            <StatBox num="02" label="Min crew" />
            <StatBox num="04" label="Max crew" />
            <StatBox num="45′" label="Base run" />
          </div>
        </div>
      </div>
    </main>
  )
}

function LegendDot({ color, label, sub }: { color: string; label: string; sub: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`shrink-0 h-2.5 w-2.5 rounded-full ${color}`} />
      <span>
        <span className="text-slate-300 font-medium">{label}</span>
        <span className="text-slate-600"> ({sub})</span>
      </span>
    </div>
  )
}

function StatBox({ num, label }: { num: string; label: string }) {
  return (
    <div className="border border-white/[0.08] bg-white/[0.03] p-3">
      <div className="text-cnv-yellow text-xl font-bold font-mono tabular-nums">{num}</div>
      <div className="tracking-wide mt-0.5 text-slate-500">{label}</div>
    </div>
  )
}
