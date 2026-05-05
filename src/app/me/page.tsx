import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { format, parseISO } from 'date-fns'
import { CnvMark } from '@/components/CnvMark'
import { SignOutButton } from '@/components/SignOutButton'
import { LeaveSlotButton } from '@/components/LeaveSlotButton'

export default async function MyBookingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today = format(new Date(), 'yyyy-MM-dd')

  const [{ data: rows }, { data: profile }] = await Promise.all([
    supabase
      .from('booking_members')
      .select('booking_id, bookings(*)')
      .eq('user_id', user.id),
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
  ])

  const displayName = (profile as { full_name?: string } | null)?.full_name ?? null
  const firstName   = displayName ? displayName.split(' ')[0] : null

  const upcoming = (rows ?? [])
    .map((r: any) => r.bookings)
    .filter((b: any) => b && b.status !== 'cancelled' && b.date >= today)
    .sort((a: any, b: any) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))

  // Two-step member lookup
  const bookingIds = upcoming.map((b: any) => b.id)
  const { data: memberRows } = bookingIds.length > 0
    ? await supabase
        .from('booking_members')
        .select('booking_id, user_id')
        .in('booking_id', bookingIds)
    : { data: [] }

  const membersByBooking: Record<string, { user_id: string; full_name?: string }[]> = {}
  if (memberRows && memberRows.length > 0) {
    const userIds = [...new Set((memberRows as any[]).map((r: any) => r.user_id))]
    const { data: profileRows } = await supabase
      .from('profiles').select('id, full_name').in('id', userIds)
    const nameMap: Record<string, string> = {}
    for (const p of (profileRows ?? []) as any[]) nameMap[p.id] = p.full_name
    for (const row of memberRows as any[]) {
      ;(membersByBooking[row.booking_id] ??= []).push({
        user_id:   row.user_id,
        full_name: nameMap[row.user_id],
      })
    }
  }

  const statusStyle = (s: string) => ({
    pending:   'border-amber-400/40 text-amber-300 bg-amber-400/10',
    confirmed: 'border-emerald-400/40 text-emerald-300 bg-emerald-400/10',
    full:      'border-violet-400/40 text-violet-300 bg-violet-400/10',
  } as Record<string, string>)[s] ?? 'border-white/20 text-slate-400'

  const statusLabel = (s: string) => ({
    pending:   'Needs a buddy',
    confirmed: 'Session on!',
    full:      'Full crew',
  } as Record<string, string>)[s] ?? s

  return (
    <main className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 cnv-bg pointer-events-none" />
      <div className="absolute inset-0 cnv-grid-lines pointer-events-none" />

      <div className="relative max-w-md mx-auto px-4 py-5 pb-10">

        {/* ── Header ── */}
        <header className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <Link href="/book" className="flex items-center gap-3 group">
            <CnvMark className="h-10 w-auto opacity-80 group-hover:opacity-100 transition" />
            <div>
              <div className="font-mono text-[9px] tracking-[0.35em] text-cnv-yellow/60">
                CNV · VERSOIX
              </div>
              <h1 className="font-display text-base font-bold text-white mt-0.5">
                {firstName ? `${firstName}'s slots` : 'My bookings'}
              </h1>
            </div>
          </Link>
          <div className="flex flex-col items-end gap-1.5">
            <Link href="/book" className="font-mono text-[10px] tracking-widest text-slate-500 hover:text-cnv-yellow transition">
              Book a slot
            </Link>
            <SignOutButton />
          </div>
        </header>

        {/* ── Account info chip ── */}
        {displayName && (
          <div className="mt-4 border border-white/[0.08] bg-white/[0.03] px-4 py-3 flex items-center justify-between">
            <div>
              <div className="font-mono text-[9px] tracking-[0.25em] text-slate-500 mb-0.5">SIGNED IN AS</div>
              <div className="font-bold text-white text-sm">{displayName}</div>
            </div>
            <div className="font-mono text-[9px] text-slate-500 truncate max-w-[140px] text-right">
              {user.email}
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {upcoming.length === 0 && (
          <div className="mt-10 border border-dashed border-white/[0.10] bg-white/[0.02] p-8 text-center font-mono">
            <div className="text-[10px] tracking-[0.3em] text-slate-500">No upcoming slots</div>
            <Link
              href="/book"
              className="inline-block mt-4 px-5 py-2.5 bg-cnv-yellow text-cnv-navy-4 text-xs font-bold tracking-widest hover:shadow-glow-yellow-sm transition">
              Browse the grid →
            </Link>
          </div>
        )}

        {/* ── Booking cards ── */}
        <ul className="mt-5 flex flex-col gap-3">
          {upcoming.map((b: any) => {
            const crew      = membersByBooking[b.id] ?? []
            const humanDate = format(parseISO(b.date), 'EEE d MMM')
            return (
              <li
                key={b.id}
                className="border border-white/[0.08] bg-white/[0.03] p-4 font-mono">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-display text-lg font-bold text-white leading-tight">
                      {humanDate}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 tabular-nums">
                      {b.period === 'AM' ? 'Morning' : 'Afternoon'}
                      {' · '}
                      {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}
                      {' · '}
                      {b.member_count}/4 riders
                    </div>
                  </div>
                  <LeaveSlotButton bookingId={b.id} />
                </div>

                {/* Status badge */}
                <div className={`mt-3 inline-block border px-2.5 py-1 text-[10px] tracking-wide ${statusStyle(b.status)}`}>
                  {statusLabel(b.status)}
                </div>

                {/* Crew chips */}
                {crew.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {crew.map((m: any) => (
                      <span
                        key={m.user_id}
                        className={`text-[10px] font-bold tracking-wide px-2 py-1 border ${
                          m.user_id === user.id
                            ? 'bg-cnv-yellow/15 border-cnv-yellow/50 text-cnv-yellow'
                            : 'bg-white/[0.05] border-white/[0.10] text-slate-300'
                        }`}>
                        {m.full_name?.split(' ')[0] ?? '?'}
                        {m.user_id === user.id && ' · you'}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </main>
  )
}
