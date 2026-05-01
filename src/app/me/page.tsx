import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { CnvMark } from '@/components/CnvMark'
import { SignOutButton } from '@/components/SignOutButton'

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

  // Fetch members for all upcoming bookings — two-step because
  // booking_members.user_id → auth.users (no FK to profiles).
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
        user_id: row.user_id,
        full_name: nameMap[row.user_id],
      })
    }
  }

  const statusBadge = (s: string) => ({
    pending:   'bg-orange-50 border-orange-400 text-orange-700',
    confirmed: 'bg-emerald-50 border-emerald-500 text-emerald-700',
    full:      'bg-purple-50 border-purple-400 text-purple-700',
  } as Record<string, string>)[s] ?? 'border-slate-200'

  return (
    <main className="min-h-screen bg-slate-50 text-cnv-navy relative overflow-hidden">
      <div className="absolute inset-0 cnv-grid pointer-events-none" />
      <div className="absolute inset-0 cnv-grid-lines pointer-events-none" />

      <div className="relative max-w-md mx-auto p-5">
        <header className="flex items-center justify-between border-b border-slate-200 pb-4">
          <Link href="/book" className="flex items-center gap-3">
            <CnvMark className="h-12 w-auto" />
            <div>
              <div className="font-mono text-[10px] tracking-[0.3em] text-cnv-navy/70">SKI ▸ WAKEBOARD</div>
              <h1 className="text-lg font-bold mt-0.5">
                {firstName ? `${firstName}'s Slots` : 'My Bookings'}
              </h1>
            </div>
          </Link>
          <div className="flex flex-col items-end gap-1.5">
            <Link href="/book" className="font-mono text-[10px] tracking-widest text-slate-500 hover:text-cnv-navy">
              [BOOK_MORE]
            </Link>
            <SignOutButton />
          </div>
        </header>

        {displayName && (
          <div className="mt-4 border border-slate-200 bg-white p-3 font-mono text-xs flex items-center justify-between">
            <div>
              <div className="text-[9px] tracking-widest text-slate-400">SIGNED_IN_AS</div>
              <div className="font-bold text-cnv-navy mt-0.5">{displayName}</div>
            </div>
            <div className="text-[9px] tracking-widest text-slate-400 truncate max-w-[140px] text-right">
              {user.email}
            </div>
          </div>
        )}

        {upcoming.length === 0 && (
          <div className="mt-8 border border-slate-200 bg-white p-6 text-center font-mono text-sm text-slate-500">
            ▸ NO_UPCOMING_SLOTS
            <Link href="/book" className="block mt-3 text-cnv-navy tracking-widest font-bold">[PICK_ONE_→]</Link>
          </div>
        )}

        <ul className="mt-5 flex flex-col gap-2">
          {upcoming.map((b: any) => {
            const crew = membersByBooking[b.id] ?? []
            return (
              <li key={b.id} className="border border-slate-200 bg-white p-4 font-mono">
                <div className="flex items-baseline justify-between">
                  <div className="text-xl font-bold tabular-nums">{b.date}</div>
                  <div className="text-[10px] tracking-widest text-slate-500">[{b.period}]</div>
                </div>
                <div className="mt-1 text-sm text-slate-500 tabular-nums">
                  {b.start_time.slice(0,5)} – {b.end_time.slice(0,5)} · {b.member_count}/4 wakers
                </div>
                <div className={`mt-2 inline-block border px-2 py-0.5 text-[10px] tracking-widest uppercase ${statusBadge(b.status)}`}>
                  {b.status}
                </div>
                {crew.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {crew.map(m => (
                      <span key={m.user_id}
                        className={`text-[10px] font-bold tracking-wide px-1.5 py-0.5 border ${
                          m.user_id === user.id
                            ? 'bg-cnv-yellow/20 border-cnv-yellow text-cnv-navy'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}>
                        {m.full_name?.split(' ')[0] ?? '?'}
                        {m.user_id === user.id && ' ·YOU'}
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
