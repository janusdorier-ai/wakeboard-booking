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
  currentUserName: string | null
  date: string
  days: { date: string; label: string }[]
  config: ClubConfig
  initialBookings: Booking[]
  override: { am_open: boolean; pm_open: boolean; note: string | null } | null
}

export function BookingClient({ currentUserId, currentUserName, date, days, config, initialBookings, override }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [bookings, setBookings] = useState<Booking[]>(initialBookings)
  const [members, setMembers] = useState<Record<string, BookingMember[]>>({})
  const [period, setPeriod] = useState<Period>('AM')
  const [picked, setPicked] = useState<CandidateSlot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [showHowTo, setShowHowTo] = useState(false)

  useEffect(() => {
    const ids = bookings.map(b => b.id)
    if (ids.length === 0) { setMembers({}); return }

    // booking_members.user_id → auth.users (no direct FK to profiles),
    // so PostgREST can't do the join inline. Two-step instead.
    supabase
      .from('booking_members')
      .select('booking_id, user_id')
      .in('booking_id', ids)
      .then(async ({ data: memberRows }) => {
        if (!memberRows || memberRows.length === 0) { setMembers({}); return }
        const userIds = [...new Set((memberRows as any[]).map(r => r.user_id))]
        const { data: profileRows } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds)
        const nameMap: Record<string, string> = {}
        for (const p of (profileRows ?? []) as any[]) nameMap[p.id] = p.full_name
        const grouped: Record<string, BookingMember[]> = {}
        for (const row of memberRows as any[]) {
          const m: BookingMember = {
            booking_id: row.booking_id,
            user_id: row.user_id,
            full_name: nameMap[row.user_id],
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

  const displayName = currentUserName ? currentUserName.split(' ')[0] : null

  return (
    <main className="min-h-screen bg-slate-50 text-cnv-navy relative overflow-hidden">
      <div className="absolute inset-0 cnv-grid pointer-events-none" />
      <div className="absolute inset-0 cnv-grid-lines pointer-events-none" />

      <div className="relative max-w-md mx-auto p-5">
        {/* ── Header ── */}
        <header className="flex items-center justify-between border-b border-slate-200 pb-4">
          <Link href="/" className="flex items-center gap-3">
            <CnvMark className="h-12 w-auto" />
            <div>
              <div className="font-mono text-[10px] tracking-[0.3em] text-cnv-navy/70">SKI ▸ WAKEBOARD</div>
              <h1 className="text-lg font-bold mt-0.5">Booking Console</h1>
            </div>
          </Link>
          <div className="flex flex-col items-end gap-1">
            {displayName && (
              <span className="font-mono text-[10px] tracking-widest text-cnv-navy/70 font-bold">
                {displayName.toUpperCase()}
              </span>
            )}
            <Link href="/me" className="font-mono text-[10px] tracking-widest text-slate-500 hover:text-cnv-navy">
              [MY_SLOTS]
            </Link>
          </div>
        </header>

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-2 mt-5 font-mono">
          <Stat label="ACTIVE" value={String(filled).padStart(2,'0')} />
          <Stat label="RIDERS" value={String(totalRiders).padStart(2,'0')} />
          <Stat label="OPEN"   value={String(visible.length - filled).padStart(2,'0')} />
        </div>

        {/* ── Day picker ── */}
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

        {/* ── AM / PM toggle ── */}
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

        {/* ── How to book (collapsible) ── */}
        <div className="mt-3">
          <button
            onClick={() => setShowHowTo(v => !v)}
            className="w-full text-left font-mono text-[10px] tracking-[0.3em] text-slate-400 hover:text-cnv-navy flex items-center gap-2 py-1">
            <span>{showHowTo ? '▾' : '▸'} HOW_TO_BOOK [?]</span>
          </button>
          {showHowTo && (
            <div className="border border-slate-200 bg-white p-4 text-xs font-mono text-slate-600 space-y-2">
              <p><b className="text-cnv-navy">Tap any slot</b> to hold it. You can hold multiple times — like a Doodle.</p>
              <p>A second waker joins your slot → it <b className="text-emerald-600">confirms</b> and the boat goes out.</p>
              <p>Within <b className="text-cnv-navy">24h</b> of the session, only slots near existing bookings are visible — the boat runs one block, not scattered all day.</p>
              <div className="pt-1 grid grid-cols-2 gap-y-1.5 gap-x-3">
                <LegendRow cls="bg-orange-400"  label="NEEDS_BUDDY (1/4)" />
                <LegendRow cls="bg-emerald-500" label="CONFIRMED (2–3/4)" />
                <LegendRow cls="bg-purple-400"  label="FULL (4/4)" />
                <LegendRow cls="bg-cyan-400"    label="CLUSTER_OK (free)" />
              </div>
            </div>
          )}
        </div>

        {/* ── Closed notice ── */}
        {!periodOpen && (
          <div className="mt-4 border border-purple-300 bg-purple-50 p-3 text-xs font-mono text-purple-800">
            ▸ {period === 'AM' ? 'MORNING' : 'AFTERNOON'} SESSION CLOSED BY CLUB
            {override?.note && <div className="mt-1 italic opacity-80">"{override.note}"</div>}
          </div>
        )}

        {/* ── Slot grid ── */}
        {periodOpen && (
          <>
            {visible.length === 0 ? (
              <div className="mt-4 border border-dashed border-slate-300 bg-white p-6 text-center font-mono">
                <div className="text-[10px] tracking-[0.3em] text-slate-400">▸ NO_SLOTS_VISIBLE</div>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                  Within 24h of session start, slots cluster around existing bookings.
                  Check another time or come back when the session is further out.
                </p>
              </div>
            ) : (
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
                      <div className="text-[9px] opacity-70 mt-1 tracking-widest">{SLOT_LABEL[s.state]}</div>
                      {s.booking && (
                        <>
                          {/* Fill bars */}
                          <div className="mt-2 flex gap-0.5">
                            {Array.from({ length: 4 }).map((_, i) => (
                              <div key={i} className={`h-1.5 w-full ${i < s.booking!.member_count ? 'bg-current' : 'bg-current/20'}`} />
                            ))}
                          </div>
                          {/* Rider first names — the key social hook */}
                          {s.members && s.members.length > 0 && (
                            <div className="mt-1.5 text-[9px] tracking-wide leading-tight font-semibold">
                              {s.members.map(m => firstName(m.full_name)).join(' · ')}
                            </div>
                          )}
                        </>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── Compact legend (always visible) ── */}
        <div className="mt-5 grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-500 border border-slate-200 bg-white p-3">
          <LegendRow cls="bg-orange-400"  label="NEEDS_BUDDY" />
          <LegendRow cls="bg-emerald-500" label="CONFIRMED" />
          <LegendRow cls="bg-purple-400"  label="FULL" />
          <LegendRow cls="bg-cyan-400"    label="CLUSTER_OK" />
        </div>
      </div>

      {/* ── Bottom sheet ── */}
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

              {picked.booking ? (
                <div className="mt-3 text-xs">
                  <div className="text-slate-500 tracking-widest">
                    CREW · {picked.booking.member_count}/4 · ENDS {picked.booking.end_time.slice(0,5)}
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {picked.members?.map(m => (
                      <li key={m.user_id} className="flex items-center gap-2">
                        {/* Avatar chip */}
                        <span className="inline-flex h-7 w-7 items-center justify-center bg-cnv-navy text-white text-[10px] font-bold shrink-0">
                          {initials(m.full_name)}
                        </span>
                        <span className="font-semibold text-sm">
                          {m.full_name ?? m.user_id.slice(0, 8)}
                        </span>
                        {m.user_id === currentUserId && (
                          <span className="ml-auto text-[9px] tracking-widest text-cnv-yellow font-bold border border-cnv-yellow px-1.5 py-0.5">YOU</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="mt-3 text-xs text-slate-600 space-y-1 leading-relaxed">
                  <p>▸ <b>FIRST_RIDER</b> — you'll hold this slot.</p>
                  <p className="text-slate-400">Slot confirms once a second waker joins. Solo holds expire after 48h.</p>
                </div>
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
                <button onClick={() => { setPicked(null); setError(null) }}
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate-200 bg-white p-3">
      <div className="text-[9px] tracking-widest text-slate-500 font-mono">{label}</div>
      <div className="text-3xl font-bold text-cnv-navy tabular-nums leading-none mt-1 font-mono">{value}</div>
    </div>
  )
}

function LegendRow({ cls, label }: { cls: string; label: string }) {
  return <div className="flex items-center gap-2"><span className={`inline-block h-2 w-2 shrink-0 ${cls}`} />{label}</div>
}

/** First name only — used on slot cards for quick friend recognition */
function firstName(name?: string): string {
  if (!name) return '?'
  const first = name.trim().split(/\s+/)[0]
  return first ? first : '?'
}

/** Two-letter initials — used in avatar chips in the bottom sheet */
function initials(name?: string): string {
  if (!name) return '··'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '··'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
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
