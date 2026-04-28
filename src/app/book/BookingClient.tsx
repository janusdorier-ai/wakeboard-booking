'use client'
import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { generateSlots } from '@/lib/booking/slots'
import { SLOT_BG, SLOT_LABEL } from '@/lib/booking/colors'
import { CnvMark } from '@/components/CnvMark'
import type { Booking, BookingMember, ClubConfig, Period, CandidateSlot } from '@/lib/booking/types'

interface Props {
  currentUserId: string | null
  date: string
  days: { date: string; label: string }[]
  config: ClubConfig
  initialBookings: Booking[]
  override: { am_open: boolean; pm_open: boolean; note: string | null } | null
}

export function BookingClient({ currentUserId, date, days, config, initialBookings, override }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [bookings, setBookings] = useState<Booking[]>(initialBookings)
  const [members, setMembers] = useState<Record<string, BookingMember[]>>({})
  const [period, setPeriod] = useState<Period>('AM')
  const [picked, setPicked] = useState<CandidateSlot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    const ids = bookings.map(b => b.id)
    if (ids.length === 0) { setMembers({}); return }
    supabase
      .from('booking_members')
      .select('booking_id, user_id, profiles(full_name)')
      .in('booking_id', ids)
      .then(({ data }) => {
        const grouped: Record<string, BookingMember[]> = {}
        for (const row of (data ?? []) as any[]) {
          const m: BookingMember = {
            booking_id: row.booking_id,
            user_id: row.user_id,
            full_name: row.profiles?.full_name,
          }
          ;(grouped[m.booking_id] ??= []).push(m)
        }
        setMembers(grouped)
      })
  }, [bookings, supabase])

  useEffect(() => {
    const channel = supabase
      .channel(`bookings:${date}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `date=eq.${date}` },
        () => {
          supabase.from('bookings').select('*').eq('date', date).neq('status', 'cancelled')
            .order('start_time').then(({ data }) => setBookings((data as Booking[]) ?? []))
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [date, supabase])

  const slotsAm = useMemo(() => generateSlots({
    config, period: 'AM', date,
    bookings: bookings.filter(b => b.period === 'AM'),
    membersByBooking: members,
  }), [config, bookings, members, date])

  const slotsPm = useMemo(() => generateSlots({
    config, period: 'PM', date,
    bookings: bookings.filter(b => b.period === 'PM'),
    membersByBooking: members,
  }), [config, bookings, members, date])

  const slots = period === 'AM' ? slotsAm : slotsPm
  const periodOpen = override
    ? (period === 'AM' ? override.am_open : override.pm_open)
    : true

  const visible = slots.filter(s => s.state !== 'hidden')
  const filled  = visible.filter(s => s.booking).length
  const totalRiders = bookings
    .filter(b => b.period === period)
    .reduce((acc, b) => acc + b.member_count, 0)

  async function joinSlot(slot: CandidateSlot) {
    setError(null)
    if (!currentUserId) { router.push(`/login?next=/book?date=${date}`); return }
    const { error } = await supabase.rpc('join_or_create_booking', {
      p_date: date, p_period: period, p_start_time: slot.start_time + ':00',
    })
    if (error) setError(humanError(error.message))
    else setPicked(null)
  }

  async function leaveSlot(bookingId: string) {
    setError(null)
    const { error } = await supabase.rpc('leave_booking', { p_booking_id: bookingId })
    if (error) setError(humanError(error.message))
    else setPicked(null)
  }

  return (
    <main className="min-h-screen bg-slate-50 text-cnv-navy relative overflow-hidden">
      <div className="absolute inset-0 cnv-grid pointer-events-none" />
      <div className="absolute inset-0 cnv-grid-lines pointer-events-none" />

      <div className="relative max-w-md mx-auto p-5">
        <header className="flex items-center justify-between border-b border-slate-200 pb-4">
          <Link href="/" className="flex items-center gap-3">
            <CnvMark className="h-12 w-auto" />
            <div>
              <div className="font-mono text-[10px] tracking-[0.3em] text-cnv-navy/70">SKI ▸ WAKEBOARD</div>
              <h1 className="text-lg font-bold mt-0.5">Booking Console</h1>
            </div>
          </Link>
          <Link href="/me" className="font-mono text-[10px] tracking-widest text-slate-500 hover:text-cnv-navy">
            [MY_BOOKINGS]
          </Link>
        </header>

        <div className="grid grid-cols-3 gap-2 mt-5 font-mono">
          <Stat label="ACTIVE" value={String(filled).padStart(2,'0')} />
          <Stat label="RIDERS" value={String(totalRiders).padStart(2,'0')} />
          <Stat label="OPEN"   value={String(visible.length - filled).padStart(2,'0')} />
        </div>

        <div className="mt-5 flex gap-1 overflow-x-auto pb-2 -mx-5 px-5">
          {days.map(d => (
            <button key={d.date}
              onClick={() => router.push(`/book?date=${d.date}`)}
              className={`shrink-0 px-3 py-2 text-xs font-mono uppercase border transition ${
                d.date === date
                  ? 'bg-cnv-navy text-white border-cnv-navy font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-cnv-navy/40'
              }`}>
              {d.label}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 border border-slate-200 bg-white">
          {(['AM','PM'] as Period[]).map(p => (
            <button key={p}
              onClick={() => setPeriod(p)}
              className={`py-2.5 text-xs font-mono font-bold tracking-widest transition ${
                period === p ? 'bg-cnv-navy/5 text-cnv-navy' : 'text-slate-500 hover:text-cnv-navy'
              }`}>
              [{p}] {p === 'AM' ? config.am_start.slice(0,5) : config.pm_start.slice(0,5)}–{p === 'AM' ? config.am_end.slice(0,5) : config.pm_end.slice(0,5)}
            </button>
          ))}
        </div>

        {!periodOpen && (
          <div className="mt-4 border border-purple-300 bg-purple-50 p-3 text-xs font-mono text-purple-800">
            ▸ {period === 'AM' ? 'MORNING' : 'AFTERNOON'} SESSION CLOSED BY CLUB
            {override?.note && <div className="mt-1 italic opacity-80">"{override.note}"</div>}
          </div>
        )}

        {periodOpen && (
          <div className="mt-4 grid grid-cols-3 gap-1.5">
            {visible.map(s => {
              const isMine = s.booking && s.members?.some(m => m.user_id === currentUserId)
              return (
                <button key={s.start_time}
                  disabled={s.state === 'full' && !isMine}
                  onClick={() => setPicked(s)}
                  className={`p-3 text-left font-mono border transition ${SLOT_BG[s.state]} ${
                    isMine ? 'ring-2 ring-cnv-yellow ring-offset-2 ring-offset-slate-50' : ''
                  }`}>
                  <div className="text-xl font-bold tabular-nums leading-none">{s.start_time}</div>
                  <div className="text-[9px] opacity-80 mt-1.5 tracking-widest">{SLOT_LABEL[s.state]}</div>
                  {s.booking && (
                    <div className="mt-2 flex gap-0.5">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className={`h-1.5 w-full ${i < s.booking!.member_count ? 'bg-current' : 'bg-current/20'}`} />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-600 border border-slate-200 bg-white p-3">
          <Legend cls="bg-orange-400"  label="NEEDS_BUDDY" />
          <Legend cls="bg-emerald-500" label="OPEN_SPOTS" />
          <Legend cls="bg-purple-400"  label="CAPACITY" />
          <Legend cls="bg-cyan-400"    label="CLUSTER_OK" />
        </div>
      </div>

      {/* Bottom sheet */}
      {picked && (
        <div className="fixed inset-0 z-50 flex items-end bg-cnv-navy/40" onClick={() => setPicked(null)}>
          <div className="w-full bg-white border-t-2 border-cnv-yellow p-5 font-mono text-cnv-navy shadow-2xl"
               onClick={e => e.stopPropagation()}>
            <div className="mx-auto h-1 w-10 rounded-full bg-slate-300" />
            <div className="mt-4">
              <div className="text-[10px] tracking-[0.3em] text-cnv-navy/70">▸ SLOT_DETAIL</div>
              <div className="text-2xl font-bold tabular-nums mt-1">
                {date} · {period} · {picked.start_time}
              </div>

              {picked.booking && (
                <div className="mt-3 text-xs">
                  <div className="text-slate-500">CREW · {picked.booking.member_count}/4 · ENDS {picked.booking.end_time.slice(0,5)}</div>
                  <ul className="mt-2 space-y-1">
                    {picked.members?.map(m => (
                      <li key={m.user_id} className="flex items-center gap-2">
                        <span className="inline-block h-1.5 w-1.5 bg-cnv-navy" />
                        {m.full_name ?? m.user_id.slice(0, 6)}
                        {m.user_id === currentUserId && <span className="text-cnv-yellow font-bold">[YOU]</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!picked.booking && (
                <p className="mt-3 text-xs text-slate-600">
                  ▸ FIRST_RIDER. Slot confirms once a second waker joins.
                </p>
              )}

              {error && <p className="mt-3 text-xs text-red-700">▸ ERR: {error}</p>}

              <div className="mt-5 flex gap-2">
                {picked.booking && picked.members?.some(m => m.user_id === currentUserId) ? (
                  <button onClick={() => startTransition(() => { void leaveSlot(picked.booking!.id) })}
                    className="flex-1 border border-red-400 text-red-700 py-3 font-bold text-sm tracking-widest hover:bg-red-50">
                    ▸ LEAVE_SLOT
                  </button>
                ) : (
                  <button
                    disabled={pending || picked.state === 'full' || picked.state === 'hidden'}
                    onClick={() => startTransition(() => { void joinSlot(picked) })}
                    className="flex-1 bg-cnv-navy text-white py-3 font-bold text-sm tracking-widest hover:bg-cnv-navy-3 disabled:opacity-40 disabled:cursor-not-allowed">
                    {picked.booking ? '▸ JOIN_SLOT' : '▸ HOLD_SLOT'}
                  </button>
                )}
                <button onClick={() => setPicked(null)}
                  className="border border-slate-300 text-slate-600 px-4 py-3 text-sm tracking-widest hover:text-cnv-navy">
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate-200 bg-white p-3">
      <div className="text-[9px] tracking-widest text-slate-500 font-mono">{label}</div>
      <div className="text-3xl font-bold text-cnv-navy tabular-nums leading-none mt-1 font-mono">{value}</div>
    </div>
  )
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return <div className="flex items-center gap-2"><span className={`inline-block h-2 w-2 ${cls}`} />{label}</div>
}

function humanError(code: string): string {
  switch (code) {
    case 'already_in_this_slot':      return "You're already in this slot."
    case 'overlaps_your_other_slot':  return 'Time overlaps another slot you hold.'
    case 'slot_full':                 return 'Slot is full (4 wakers).'
    case 'overflows_window':          return 'Would push past session window.'
    case 'extension_conflicts':       return 'Would collide with the next slot.'
    case 'overlaps_existing':         return 'Overlaps existing booking.'
    case 'outside_cluster':           return 'Outside cluster — pick closer to taken slots.'
    case 'period_closed':             return 'Session closed by the club.'
    case 'outside_window':            return 'Outside session hours.'
    default:                          return code
  }
}
