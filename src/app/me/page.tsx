import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { CnvMark } from '@/components/CnvMark'

export default async function MyBookingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today = format(new Date(), 'yyyy-MM-dd')
  const { data: rows } = await supabase
    .from('booking_members')
    .select('booking_id, bookings(*)')
    .eq('user_id', user.id)

  const upcoming = (rows ?? [])
    .map((r: any) => r.bookings)
    .filter((b: any) => b && b.status !== 'cancelled' && b.date >= today)
    .sort((a: any, b: any) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))

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
              <h1 className="text-lg font-bold mt-0.5">My Bookings</h1>
            </div>
          </Link>
          <Link href="/book" className="font-mono text-[10px] tracking-widest text-slate-500 hover:text-cnv-navy">
            [BOOK_MORE]
          </Link>
        </header>

        {upcoming.length === 0 && (
          <div className="mt-8 border border-slate-200 bg-white p-6 text-center font-mono text-sm text-slate-500">
            ▸ NO_UPCOMING_SLOTS
            <Link href="/book" className="block mt-3 text-cnv-navy tracking-widest font-bold">[PICK_ONE_→]</Link>
          </div>
        )}

        <ul className="mt-5 flex flex-col gap-2">
          {upcoming.map((b: any) => (
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
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
