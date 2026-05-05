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

export function BookingClient({
  currentUserId, currentUserName, date, days, config, initialBookings, override,
}: Props) {
  const router   = useRouter()
  const supabase = createClient()

  const [bookings, setBookings] = useState<Booking[]>(initialBookings)
  const [members,  setMembers]  = useState<Record<string, BookingMember[]>>({})
  const [period,   setPeriod]   = useState<Period>('AM')
  const [picked,   setPicked]   = useState<CandidateSlot | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState<string | null>(null)
  const [pending,  startTransition] = useTransition()
  const [showHowTo, setShowHowTo]   = useState(false)

  // ── Two-step member query ─────────────────────────────────────
  useEffect(() => {
    const ids = bookings.map(b => b.id)
    if (ids.length === 0) { setMembers({}); return }

    supabase
      .from('booking_members')
      .select('booking_id, user_id')
      .in('booking_id', ids)
      .then(async ({ data: memberRows }) => {
        if (!memberRows || memberRows.length === 0) { setMembers({}); return }
        const userIds = [...new Set((memberRows as any[]).map(r => r.user_id))]
        const { data: profileRows } = await supabase
          .from('profiles').select('id, full_name').in('id', userIds)
        const nameMap: Record<string, string> = {}
        for (const p of (profileRows ?? []) as any[]) nameMap[p.id] = p.full_name
        const grouped: Record<string, BookingMember[]> = {}
        for (const row of memberRows as any[]) {
          const m: BookingMember = {
            booking_id: row.booking_id,
            user_id:    row.user_id,
            full_name:  nameMap[row.user_id],
          }
          ;(grouped[m.booking_id] ??= []).push(m)
        }
        setMembers(grouped)
      })
  }, [bookings, supabase])

  // ── Realtime subscription ─────────────────────────────────────
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

  // ── Slot generation ───────────────────────────────────────────
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

  const slots      = period === 'AM' ? slotsAm : slotsPm
  const periodOpen = override ? (period === 'AM' ? override.am_open : override.pm_open) : true
  const visible    = slots.filter(s => s.state !== 'hidden')
  const filled     = visible.filter(s => s.booking).length
  const totalRiders = bookings
    .filter(b => b.period === period)
    .reduce((acc, b) => acc + b.member_count, 0)

  // ── Actions ───────────────────────────────────────────────────
  async function joinSlot(slot: CandidateSlot) {
    setError(null)
    if (!currentUserId) { router.push(`/login?next=/book?date=${date}`); return }
    const { error } = await supabase.rpc('join_or_create_booking', {
      p_date: date, p_period: period, p_start_time: slot.start_time + ':00',
    })
    if (error) { setError(humanError(error.message)); return }
    const msg = slot.booking
      ? "You're in! See you on the water 🤙"
      : "Slot held — get someone to join you!"
    setSuccess(msg)
    setTimeout(() => { setPicked(null); setSuccess(null) }, 2200)
  }

  async function leaveSlot(bookingId: string) {
    setError(null)
    const { error } = await supabase.rpc('leave_booking', { p_booking_id: bookingId })
    if (error) { setError(humanError(error.message)); return }
    setSuccess("You've left this slot.")
    setTimeout(() => { setPicked(null); setSuccess(null) }, 1600)
  }

  const displayName = currentUserName ? currentUserName.split(' ')[0] : null

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 cnv-bg pointer-events-none" />
      <div className="absolute inset-0 cnv-grid-lines pointer-events-none" />

      <div className="relative max-w-md mx-auto px-4 pb-8 pt-5">

        {/* ── Header ── */}
        <header className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <Link href="/" className="flex items-center gap-3 group">
            <CnvMark className="h-10 w-auto opacity-80 group-hover:opacity-100 transition" />
            <div>
              <div className="font-mono text-[9px] tracking-[0.35em] text-cnv-yellow/60">
                CNV · VERSOIX
              </div>
              <h1 className="font-display text-base font-bold text-white mt-0.5">
                Booking Grid
              </h1>
            </div>
          </Link>
          <div className="flex flex-col items-end gap-1.5">
            {displayName && (
              <span className="font-mono text-[10px] tracking-widest text-cnv-yellow font-bold">
                {displayName.toUpperCase()}
              </span>
            )}
            <Link href="/me" className="font-mono text-[10px] tracking-widest text-slate-500 hover:text-cnv-yellow transition">
              My slots
            </Link>
          </div>
        </header>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-3 gap-2 mt-5">
          <StatCard label="Sessions" value={String(filled).padStart(2, '0')} />
          <StatCard label="Riders"   value={String(totalRiders).padStart(2, '0')} />
          <StatCard label="Open"     value={String(visible.length - filled).padStart(2, '0')} />
        </div>

        {/* ── Day picker ── */}
        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
          {days.map(d => (
            <button
              key={d.date}
              onClick={() => router.push(`/book?date=${d.date}`)}
              className={`shrink-0 px-3 py-2 text-xs font-mono tracking-wide border transition ${
                d.date === date
                  ? 'bg-cnv-yellow text-cnv-navy-4 border-cnv-yellow font-bold'
                  : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:border-cnv-yellow/40 hover:text-white'
              }`}>
              {d.label}
            </button>
          ))}
        </div>

        {/* ── Morning / Afternoon toggle ── */}
        <div className="mt-3 grid grid-cols-2 border border-white/[0.08] bg-white/[0.02]">
          {(['AM', 'PM'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`py-3 text-center font-mono transition relative ${
                period === p
                  ? 'text-cnv-yellow'
                  : 'text-slate-500 hover:text-slate-300'
              }`}>
              {period === p && (
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-cnv-yellow" />
              )}
              <div className="text-xs font-bold tracking-wide">
                {p === 'AM' ? 'Morning' : 'Afternoon'}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 tabular-nums">
                {p === 'AM' ? config.am_start.slice(0, 5) : config.pm_start.slice(0, 5)}
                –
                {p === 'AM' ? config.am_end.slice(0, 5) : config.pm_end.slice(0, 5)}
              </div>
            </button>
          ))}
        </div>

        {/* ── How to book ── */}
        <div className="mt-3">
          <button
            onClick={() => setShowHowTo(v => !v)}
            className="w-full text-left font-mono text-[10px] tracking-[0.3em] text-slate-500 hover:text-cnv-yellow flex items-center gap-2 py-1.5 transition">
            <span>{showHowTo ? '▾' : '▸'} How to book</span>
          </button>
          {showHowTo && (
            <div className="border border-white/[0.08] bg-white/[0.03] p-4 text-xs font-mono text-slate-400 space-y-2">
              <p>
                <span className="text-cnv-yellow font-bold">Tap any slot</span> to hold it.
                You can hold multiple — like a Doodle.
              </p>
              <p>
                A second waker joins → slot{' '}
                <span className="text-emerald-400 font-bold">confirms</span> and the boat goes out.
              </p>
              <p>
                Within <span className="text-cnv-yellow font-bold">24h</span> of the session,
                only slots near existing bookings are visible — keeps the boat busy in one block.
              </p>
              <div className="pt-2 grid grid-cols-2 gap-y-2 gap-x-4">
                <LegendRow cls="bg-amber-400"   label="Needs a buddy (1)" />
                <LegendRow cls="bg-emerald-400" label="Session on! (2–3)" />
                <LegendRow cls="bg-violet-400"  label="Full crew (4)" />
                <LegendRow cls="bg-cyan-400"    label="Open nearby" />
              </div>
            </div>
          )}
        </div>

        {/* ── Closed notice ── */}
        {!periodOpen && (
          <div className="mt-4 border border-violet-500/30 bg-violet-900/20 px-4 py-3 text-xs font-mono text-violet-300">
            ▸ {period === 'AM' ? 'Morning' : 'Afternoon'} session closed by the club.
            {override?.note && <div className="mt-1 italic opacity-75">"{override.note}"</div>}
          </div>
        )}

        {/* ── Slot grid ── */}
        {periodOpen && (
          visible.length === 0 ? (
            <div className="mt-4 border border-dashed border-white/[0.10] bg-white/[0.02] p-7 text-center font-mono">
              <div className="text-[10px] tracking-[0.3em] text-slate-500">No slots visible</div>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Within 24h of session start, slots cluster around existing bookings.
                Check another day or come back closer to the session.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-1.5">
              {visible.map(s => {
                const isMine = s.booking && s.members?.some(m => m.user_id === currentUserId)
                return (
                  <button
                    key={s.start_time}
                    disabled={s.state === 'full' && !isMine}
                    onClick={() => setPicked(s)}
                    className={`p-3 text-left font-mono border transition ${SLOT_BG[s.state]} ${
                      isMine
                        ? 'ring-2 ring-cnv-yellow ring-offset-1 ring-offset-[#050d23]'
                        : ''
                    }`}>
                    <div className="text-xl font-bold tabular-nums leading-none text-white">
                      {s.start_time}
                    </div>
                    <div className="text-[9px] mt-1 tracking-wide opacity-80">
                      {SLOT_LABEL[s.state]}
                    </div>
                    {s.booking && (
                      <>
                        {/* Capacity bars */}
                        <div className="mt-2 flex gap-0.5">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <div
                              key={i}
                              className={`h-1 w-full rounded-sm ${
                                i < s.booking!.member_count
                                  ? 'bg-current'
                                  : 'bg-current/20'
                              }`}
                            />
                          ))}
                        </div>
                        {/* Rider first names */}
                        {s.members && s.members.length > 0 && (
                          <div className="mt-1.5 text-[9px] tracking-wide leading-tight font-semibold opacity-80">
                            {s.members.map(m => firstName(m.full_name)).join(' · ')}
                          </div>
                        )}
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          )
        )}

        {/* ── Compact legend ── */}
        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] font-mono text-slate-500 border border-white/[0.06] bg-white/[0.02] p-3">
          <LegendRow cls="bg-amber-400"   label="Needs a buddy" />
          <LegendRow cls="bg-emerald-400" label="Session on!" />
          <LegendRow cls="bg-violet-400"  label="Full crew" />
          <LegendRow cls="bg-cyan-400"    label="Open nearby" />
        </div>
      </div>

      {/* ── Bottom sheet ── */}
      {picked && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm"
          onClick={() => { setPicked(null); setError(null); setSuccess(null) }}>
          <div
            className="relative w-full bg-cnv-navy-3 border-t-2 border-cnv-yellow px-5 pt-5 pb-8 font-mono text-white shadow-2xl max-w-md mx-auto"
            onClick={e => e.stopPropagation()}>

            {/* drag handle */}
            <div className="mx-auto h-1 w-10 rounded-full bg-white/20 mb-1" />

            {/* ×-close */}
            <button
              onClick={() => { setPicked(null); setError(null); setSuccess(null) }}
              className="absolute top-4 right-5 text-slate-400 hover:text-white text-xl leading-none transition">
              ×
            </button>

            <div className="mt-3">
              {/* Human date + time */}
              <div className="text-[10px] tracking-[0.25em] text-cnv-yellow/70 uppercase font-mono">
                {period === 'AM' ? 'Morning' : 'Afternoon'} session
              </div>
              <div className="font-display text-2xl font-black text-white mt-0.5">
                {humanDay(date)} · {picked.start_time}
              </div>

              {/* Success banner */}
              {success && (
                <div className="mt-4 border border-emerald-400/30 bg-emerald-900/30 text-emerald-300 text-sm px-4 py-3">
                  {success}
                </div>
              )}

              {/* Crew list OR first-rider copy */}
              {!success && (
                picked.booking ? (
                  <div className="mt-4">
                    <div className="text-[10px] tracking-widest text-slate-500 mb-3">
                      {picked.booking.member_count}/4 riders · ends {picked.booking.end_time.slice(0, 5)}
                    </div>
                    <ul className="space-y-2.5">
                      {picked.members?.map(m => (
                        <li key={m.user_id} className="flex items-center gap-3">
                          <span className="inline-flex h-8 w-8 items-center justify-center bg-white/[0.08] border border-white/[0.12] text-[11px] font-bold shrink-0">
                            {initials(m.full_name)}
                          </span>
                          <span className="font-semibold text-sm text-slate-200">
                            {m.full_name ?? m.user_id.slice(0, 8)}
                          </span>
                          {m.user_id === currentUserId && (
                            <span className="ml-auto text-[9px] tracking-widest text-cnv-yellow font-bold border border-cnv-yellow/60 px-1.5 py-0.5">
                              YOU
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="mt-4 text-sm text-slate-400 leading-relaxed">
                    <p>You'd be the first one in.</p>
                    <p className="mt-1 text-xs text-slate-600">
                      Session confirms once a second rider joins. Holds expire after 48h.
                    </p>
                  </div>
                )
              )}

              {error && (
                <p className="mt-3 text-xs text-red-400 flex items-center gap-2">
                  <span>▸</span> {error}
                </p>
              )}

              {/* Action buttons */}
              {!success && (
                <div className="mt-6 flex gap-2">
                  {picked.booking && picked.members?.some(m => m.user_id === currentUserId) ? (
                    <button
                      disabled={pending}
                      onClick={() => startTransition(() => { void leaveSlot(picked.booking!.id) })}
                      className="flex-1 border border-red-500/40 text-red-400 py-3.5 font-bold text-sm hover:bg-red-900/20 disabled:opacity-40 transition">
                      {pending ? '…' : 'Leave this slot'}
                    </button>
                  ) : (
                    <button
                      disabled={pending || picked.state === 'full' || picked.state === 'hidden'}
                      onClick={() => startTransition(() => { void joinSlot(picked) })}
                      className="flex-1 bg-cnv-yellow text-cnv-navy-4 py-3.5 font-bold text-sm hover:shadow-glow-yellow-sm disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-[0.99]">
                      {pending
                        ? '…'
                        : picked.booking ? 'Join this crew' : 'Hold this slot'}
                    </button>
                  )}
                  <button
                    onClick={() => { setPicked(null); setError(null) }}
                    className="border border-white/[0.10] text-slate-400 px-5 py-3.5 text-sm hover:border-white/20 hover:text-white transition">
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/[0.08] bg-white/[0.03] p-3">
      <div className="text-[9px] tracking-widest text-slate-500 font-mono">{label}</div>
      <div className="text-3xl font-bold text-cnv-yellow tabular-nums leading-none mt-1 font-mono">
        {value}
      </div>
    </div>
  )
}

function LegendRow({ cls, label }: { cls: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${cls}`} />
      {label}
    </div>
  )
}

function firstName(name?: string): string {
  if (!name) return '?'
  const first = name.trim().split(/\s+/)[0]
  return first || '?'
}

function initials(name?: string): string {
  if (!name) return '··'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '··'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function humanDay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function humanError(code: string): string {
  switch (code) {
    case 'already_in_this_slot':     return "You're already in this slot."
    case 'overlaps_your_other_slot': return 'Overlaps another slot you hold.'
    case 'slot_full':                return 'Slot is full (4 riders).'
    case 'overflows_window':         return 'Would push past session window.'
    case 'extension_conflicts':      return 'Would collide with the next slot.'
    case 'overlaps_existing':        return 'Overlaps an existing booking.'
    case 'outside_cluster':          return 'Outside cluster — pick closer to taken slots.'
    case 'period_closed':            return 'Session closed by the club.'
    case 'outside_window':           return 'Outside session hours.'
    default:                         return code
  }
}
