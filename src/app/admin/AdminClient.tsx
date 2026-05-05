'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CnvMark } from '@/components/CnvMark'
import type { Booking, ClubConfig } from '@/lib/booking/types'

interface DayOverride { date: string; am_open: boolean; pm_open: boolean; note: string | null }
interface PrivateConfig {
  notify_email: string | null
  resend_api_key: string | null
  notify_from_email: string
  digest_enabled: boolean
  events_enabled: boolean
}
interface MemberProfile {
  id: string
  full_name: string
  role: string
  created_at: string
}
type MembersByBooking = Record<string, { user_id: string; full_name: string | null }[]>

const inputCls = 'w-full bg-white border border-slate-300 px-2 py-1.5 text-cnv-navy focus:outline-none focus:border-cnv-navy font-mono text-sm'

interface Props {
  config: ClubConfig
  privateConfig: PrivateConfig | null
  bookings: Booking[]
  overrides: DayOverride[]
  membersByBooking: MembersByBooking
  profiles: MemberProfile[]
  todayDate: string
  tomorrowDate: string
}

export function AdminClient({
  config, privateConfig, bookings, overrides, membersByBooking, profiles, todayDate, tomorrowDate,
}: Props) {
  const supabase = createClient()
  const router   = useRouter()

  const [cfg, setCfg] = useState(config)
  const [pcfg, setPcfg] = useState<PrivateConfig>(privateConfig ?? {
    notify_email: '', resend_api_key: '', notify_from_email: '',
    digest_enabled: true, events_enabled: true,
  })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [busy, setBusy]   = useState(false)
  const [msg,  setMsg]    = useState<string | null>(null)
  const [pBusy, setPBusy] = useState(false)
  const [pMsg,  setPMsg]  = useState<string | null>(null)

  // ── Config save ──────────────────────────────────────────────
  async function saveConfig() {
    setBusy(true); setMsg(null)
    const { error } = await supabase.from('club_config').update({
      name: cfg.name,
      am_start: cfg.am_start, am_end: cfg.am_end,
      pm_start: cfg.pm_start, pm_end: cfg.pm_end,
      cluster_gap_minutes:  cfg.cluster_gap_minutes,
      cluster_lockin_hours: cfg.cluster_lockin_hours,
      solo_timeout_hours:   cfg.solo_timeout_hours,
      slot_step_minutes:    cfg.slot_step_minutes,
      duration_2_minutes:   cfg.duration_2_minutes,
      duration_3_minutes:   cfg.duration_3_minutes,
      duration_4_minutes:   cfg.duration_4_minutes,
    }).eq('id', 1)
    setBusy(false)
    if (error) setMsg(error.message); else { setMsg('Saved!'); router.refresh() }
  }

  // ── Notifications save (upsert — row may not exist yet) ──────
  async function savePrivateConfig() {
    setPBusy(true); setPMsg(null)
    const { error } = await supabase.from('private_config').upsert({
      id: 1,
      notify_email:       pcfg.notify_email,
      resend_api_key:     pcfg.resend_api_key,
      notify_from_email:  pcfg.notify_from_email,
      digest_enabled:     pcfg.digest_enabled,
      events_enabled:     pcfg.events_enabled,
      updated_at: new Date().toISOString(),
    })
    setPBusy(false)
    if (error) setPMsg(error.message); else { setPMsg('Saved!'); router.refresh() }
  }

  async function sendTestDigest() {
    setPBusy(true); setPMsg('Sending…')
    const { error } = await supabase.rpc('admin_send_daily_digest')
    setPBusy(false)
    setPMsg(error ? `Error: ${error.message}` : 'Sent — check your inbox')
  }

  // ── Bookings ─────────────────────────────────────────────────
  async function cancelBooking(id: string) {
    if (!confirm('Cancel this booking? Riders will be notified.')) return
    const { error } = await supabase.rpc('admin_cancel_booking', { p_booking_id: id })
    if (error) alert(error.message); else router.refresh()
  }

  // ── Day overrides ─────────────────────────────────────────────
  async function saveOverride(date: string, am_open: boolean, pm_open: boolean, note?: string) {
    const { error } = await supabase.from('day_overrides').upsert({ date, am_open, pm_open, note: note ?? null })
    if (error) alert(error.message); else router.refresh()
  }

  async function removeOverride(date: string) {
    const { error } = await supabase.from('day_overrides').delete().eq('date', date)
    if (error) alert(error.message); else router.refresh()
  }

  const todayBookings    = bookings.filter(b => b.date === todayDate)
  const tomorrowBookings = bookings.filter(b => b.date === tomorrowDate)
  const futureBookings   = bookings.filter(b => b.date > tomorrowDate)

  return (
    <main className="min-h-screen bg-slate-50 text-cnv-navy relative overflow-hidden" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
      <div className="absolute inset-0 cnv-grid pointer-events-none" />
      <div className="absolute inset-0 cnv-grid-lines pointer-events-none" />

      <div className="relative max-w-2xl mx-auto p-5">

        {/* ── Header ── */}
        <header className="flex items-center justify-between border-b border-slate-200 pb-4">
          <Link href="/" className="flex items-center gap-3">
            <CnvMark className="h-12 w-auto" />
            <div>
              <div className="font-mono text-[10px] tracking-[0.3em] text-cnv-navy/70">SKI ▸ WAKEBOARD ▸ ADMIN</div>
              <h1 className="text-lg font-bold mt-0.5">Club panel</h1>
            </div>
          </Link>
          <Link href="/book" className="font-mono text-[10px] tracking-widest text-slate-500 hover:text-cnv-navy">
            Booking grid →
          </Link>
        </header>

        {/* ── Today ── */}
        <DaySection
          title="Today"
          subtitle={fmtDate(todayDate)}
          bookings={todayBookings}
          membersByBooking={membersByBooking}
          onCancel={cancelBooking}
        />

        {/* ── Tomorrow ── */}
        <DaySection
          title="Tomorrow"
          subtitle={fmtDate(tomorrowDate)}
          bookings={tomorrowBookings}
          membersByBooking={membersByBooking}
          onCancel={cancelBooking}
        />

        {/* ── Next 14 days ── */}
        <section className="mt-6 border border-slate-200 bg-white p-5">
          <h2 className="font-mono text-xs tracking-widest text-cnv-navy flex items-baseline gap-2">
            ▸ UPCOMING — NEXT 14 DAYS
            {futureBookings.length > 0 && (
              <span className="text-slate-500">({futureBookings.length})</span>
            )}
          </h2>
          {futureBookings.length === 0
            ? <p className="mt-3 text-sm text-slate-500 font-mono">No bookings yet.</p>
            : (
              <ul className="mt-3 divide-y divide-slate-100">
                {futureBookings.map(b => (
                  <BookingRow key={b.id} b={b} membersByBooking={membersByBooking} onCancel={cancelBooking} showDate />
                ))}
              </ul>
            )
          }
        </section>

        {/* ── Block a day ── */}
        <section className="mt-6 border border-slate-200 bg-white p-5">
          <h2 className="font-mono text-xs tracking-widest text-cnv-navy">▸ BLOCK A DAY</h2>
          <p className="mt-1 text-xs text-slate-500 font-mono">
            Close morning and/or afternoon for weather, a competition, etc.
          </p>

          <BlockDayForm onSubmit={saveOverride} />

          {overrides.length > 0 && (
            <div className="mt-5">
              <div className="font-mono text-[10px] tracking-[0.2em] text-slate-400 mb-2">ACTIVE CLOSURES</div>
              <ul className="divide-y divide-slate-100 text-xs font-mono">
                {overrides.map(o => (
                  <li key={o.date} className="py-2.5 flex items-center gap-3 flex-wrap">
                    <span className="tabular-nums font-bold">{fmtDate(o.date)}</span>
                    <span className={o.am_open ? 'text-slate-400' : 'text-red-700 font-bold'}>
                      Morning: {o.am_open ? 'open' : 'closed'}
                    </span>
                    <span className={o.pm_open ? 'text-slate-400' : 'text-red-700 font-bold'}>
                      Afternoon: {o.pm_open ? 'open' : 'closed'}
                    </span>
                    {o.note && <span className="text-slate-500 italic">"{o.note}"</span>}
                    <button
                      onClick={() => removeOverride(o.date)}
                      className="ml-auto text-[10px] tracking-widest text-slate-400 hover:text-red-700 border border-slate-200 hover:border-red-300 px-2 py-0.5 transition">
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* ── Email notifications ── */}
        <section className="mt-6 border border-slate-200 bg-white p-5">
          <h2 className="font-mono text-xs tracking-widest text-cnv-navy">▸ EMAIL NOTIFICATIONS</h2>
          <p className="mt-1 text-xs text-slate-500 font-mono">
            Get notified when sessions confirm, fill up, or are cancelled. Plus a daily briefing at 6 pm.
          </p>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <Field label="Your email">
              <input value={pcfg.notify_email ?? ''}
                onChange={e => setPcfg({ ...pcfg, notify_email: e.target.value })}
                placeholder="jenny@cnv.ch" className={inputCls} />
            </Field>
            <Field label="Send from (shown in inbox)">
              <input value={pcfg.notify_from_email}
                onChange={e => setPcfg({ ...pcfg, notify_from_email: e.target.value })}
                placeholder="noreply@yourclub.ch" className={inputCls} />
            </Field>
            <div className="col-span-2">
              <Field label="Resend API key (set once — stays hidden after save)">
                <input type="password" value={pcfg.resend_api_key ?? ''}
                  onChange={e => setPcfg({ ...pcfg, resend_api_key: e.target.value })}
                  placeholder="re_…" className={inputCls} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-xs font-mono text-slate-600 cursor-pointer">
              <input type="checkbox" checked={pcfg.events_enabled}
                onChange={e => setPcfg({ ...pcfg, events_enabled: e.target.checked })}
                className="accent-cnv-navy" />
              Email me when bookings change
            </label>
            <label className="flex items-center gap-2 text-xs font-mono text-slate-600 cursor-pointer">
              <input type="checkbox" checked={pcfg.digest_enabled}
                onChange={e => setPcfg({ ...pcfg, digest_enabled: e.target.checked })}
                className="accent-cnv-navy" />
              Daily briefing at 6 pm
            </label>
          </div>
          <div className="mt-5 flex items-center gap-3 flex-wrap">
            <button disabled={pBusy} onClick={savePrivateConfig}
              className="bg-cnv-navy text-white px-5 py-2.5 font-mono font-bold tracking-widest text-xs hover:bg-cnv-navy-3 disabled:opacity-40">
              {pBusy ? 'Saving…' : 'Save'}
            </button>
            <button
              disabled={pBusy || !pcfg.notify_email || !pcfg.resend_api_key}
              onClick={sendTestDigest}
              className="border border-slate-300 px-4 py-2.5 font-mono text-xs hover:border-cnv-navy/50 disabled:opacity-40">
              Send test digest
            </button>
            {pMsg && <span className="text-xs font-mono text-slate-500">{pMsg}</span>}
          </div>
        </section>

        {/* ── Session settings ── */}
        <section className="mt-6 border border-slate-200 bg-white p-5">
          <h2 className="font-mono text-xs tracking-widest text-cnv-navy">▸ SESSION SETTINGS</h2>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="col-span-2">
              <Field label="Club name">
                <input value={cfg.name} onChange={e => setCfg({ ...cfg, name: e.target.value })} className={inputCls} />
              </Field>
            </div>
            <Field label="Morning starts">
              <input type="time" value={cfg.am_start.slice(0,5)}
                onChange={e => setCfg({ ...cfg, am_start: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Morning ends">
              <input type="time" value={cfg.am_end.slice(0,5)}
                onChange={e => setCfg({ ...cfg, am_end: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Afternoon starts">
              <input type="time" value={cfg.pm_start.slice(0,5)}
                onChange={e => setCfg({ ...cfg, pm_start: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Afternoon ends">
              <input type="time" value={cfg.pm_end.slice(0,5)}
                onChange={e => setCfg({ ...cfg, pm_end: e.target.value })} className={inputCls} />
            </Field>
          </div>

          {/* Advanced (hidden by default — Jenny rarely needs this) */}
          <button
            onClick={() => setShowAdvanced(v => !v)}
            className="mt-4 font-mono text-[10px] tracking-widest text-slate-400 hover:text-cnv-navy flex items-center gap-1.5 transition">
            {showAdvanced ? '▾' : '▸'} Advanced settings
          </button>
          {showAdvanced && (
            <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100">
              <Field label="Session block gap (min)">
                <input type="number" value={cfg.cluster_gap_minutes}
                  onChange={e => setCfg({ ...cfg, cluster_gap_minutes: +e.target.value })} className={inputCls} />
              </Field>
              <Field label="Cluster lock-in (hours before session)">
                <input type="number" value={cfg.cluster_lockin_hours}
                  onChange={e => setCfg({ ...cfg, cluster_lockin_hours: +e.target.value })} className={inputCls} />
              </Field>
              <Field label="Solo hold expires after (hours)">
                <input type="number" value={cfg.solo_timeout_hours}
                  onChange={e => setCfg({ ...cfg, solo_timeout_hours: +e.target.value })} className={inputCls} />
              </Field>
              <Field label="Time grid step (min)">
                <input type="number" value={cfg.slot_step_minutes}
                  onChange={e => setCfg({ ...cfg, slot_step_minutes: +e.target.value })} className={inputCls} />
              </Field>
              <Field label="2-rider session length (min)">
                <input type="number" value={cfg.duration_2_minutes}
                  onChange={e => setCfg({ ...cfg, duration_2_minutes: +e.target.value })} className={inputCls} />
              </Field>
              <Field label="3-rider session length (min)">
                <input type="number" value={cfg.duration_3_minutes}
                  onChange={e => setCfg({ ...cfg, duration_3_minutes: +e.target.value })} className={inputCls} />
              </Field>
              <Field label="4-rider session length (min)">
                <input type="number" value={cfg.duration_4_minutes}
                  onChange={e => setCfg({ ...cfg, duration_4_minutes: +e.target.value })} className={inputCls} />
              </Field>
            </div>
          )}

          <div className="mt-5 flex items-center gap-3">
            <button disabled={busy} onClick={saveConfig}
              className="bg-cnv-navy text-white px-5 py-2.5 font-mono font-bold tracking-widest text-xs hover:bg-cnv-navy-3 disabled:opacity-40">
              {busy ? 'Saving…' : 'Save settings'}
            </button>
            {msg && <span className="text-xs font-mono text-slate-500">{msg}</span>}
          </div>
        </section>

        {/* ── Members ── */}
        <section className="mt-6 border border-slate-200 bg-white p-5">
          <h2 className="font-mono text-xs tracking-widest text-cnv-navy flex items-baseline gap-2">
            ▸ MEMBERS
            <span className="text-slate-500">({profiles.length})</span>
          </h2>
          {profiles.length === 0
            ? <p className="mt-3 text-sm text-slate-500 font-mono">No members yet.</p>
            : (
              <ul className="mt-3 divide-y divide-slate-100 text-xs font-mono">
                {profiles.map(p => (
                  <li key={p.id} className="py-2.5 flex items-center gap-3">
                    <span className="font-bold text-cnv-navy">{p.full_name}</span>
                    {p.role === 'admin' && (
                      <span className="text-[9px] tracking-widest border border-cnv-navy/40 text-cnv-navy/70 px-1.5 py-0.5">
                        ADMIN
                      </span>
                    )}
                    <span className="ml-auto text-slate-400 tabular-nums">
                      since {fmtDate(p.created_at.slice(0, 10))}
                    </span>
                  </li>
                ))}
              </ul>
            )
          }
        </section>

      </div>
    </main>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DaySection({ title, subtitle, bookings, membersByBooking, onCancel }: {
  title: string
  subtitle: string
  bookings: Booking[]
  membersByBooking: MembersByBooking
  onCancel: (id: string) => void
}) {
  return (
    <section className="mt-6 border border-slate-200 bg-white p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-mono text-xs tracking-widest text-cnv-navy">▸ {title.toUpperCase()}</h2>
        <span className="font-mono text-[10px] tracking-widest text-slate-500">{subtitle}</span>
      </div>
      {bookings.length === 0
        ? <p className="mt-3 text-sm text-slate-500 font-mono">No sessions booked.</p>
        : (
          <ul className="mt-3 divide-y divide-slate-100">
            {bookings.map(b => (
              <BookingRow key={b.id} b={b} membersByBooking={membersByBooking} onCancel={onCancel} />
            ))}
          </ul>
        )
      }
    </section>
  )
}

function BookingRow({ b, membersByBooking, onCancel, showDate }: {
  b: Booking
  membersByBooking: MembersByBooking
  onCancel: (id: string) => void
  showDate?: boolean
}) {
  const names = (membersByBooking[b.id] ?? []).map(m => m.full_name ?? '?').join(', ')
  const statusCls = (
    b.status === 'pending'   ? 'border-orange-400 text-orange-700 bg-orange-50' :
    b.status === 'confirmed' ? 'border-emerald-500 text-emerald-700 bg-emerald-50' :
    b.status === 'full'      ? 'border-purple-400 text-purple-700 bg-purple-50' :
                               'border-slate-300 text-slate-500'
  )
  const statusLabel = (
    b.status === 'pending'   ? 'Needs buddy' :
    b.status === 'confirmed' ? 'Confirmed' :
    b.status === 'full'      ? 'Full crew' :
                               b.status
  )

  return (
    <li className="flex items-center gap-3 py-2.5 text-xs font-mono flex-wrap">
      {showDate && <span className="tabular-nums font-bold">{fmtDate(b.date)}</span>}
      <span className="text-cnv-navy font-bold">
        {b.period === 'AM' ? 'Morning' : 'Afternoon'}
      </span>
      <span className="tabular-nums text-slate-600">
        {b.start_time.slice(0,5)}–{b.end_time.slice(0,5)}
      </span>
      <span className="text-slate-500">{b.member_count}/4</span>
      <span className="text-slate-700 truncate max-w-[200px]" title={names}>
        {names || '—'}
      </span>
      <span className={`border px-2 py-0.5 text-[10px] tracking-wide ${statusCls}`}>
        {statusLabel}
      </span>
      <button
        onClick={() => onCancel(b.id)}
        className="ml-auto text-[10px] tracking-widest text-slate-400 hover:text-red-700 border border-slate-200 hover:border-red-300 px-2 py-0.5 transition">
        Cancel
      </button>
    </li>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-mono tracking-wide text-slate-500">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  )
}

function BlockDayForm({ onSubmit }: {
  onSubmit: (date: string, am: boolean, pm: boolean, note?: string) => void
}) {
  const [date, setDate] = useState('')
  const [closeMorning, setCloseMorning]     = useState(false)
  const [closeAfternoon, setCloseAfternoon] = useState(false)
  const [note, setNote] = useState('')

  function handleSubmit() {
    if (!date) return
    onSubmit(date, !closeMorning, !closeAfternoon, note || undefined)
    setDate(''); setNote(''); setCloseMorning(false); setCloseAfternoon(false)
  }

  return (
    <div className="grid grid-cols-2 gap-2 mt-3 text-xs font-mono">
      <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
      <input value={note} onChange={e => setNote(e.target.value)} placeholder="Reason (optional)" className={inputCls} />
      <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
        <input type="checkbox" checked={closeMorning} onChange={e => setCloseMorning(e.target.checked)} className="accent-cnv-navy" />
        Close morning
      </label>
      <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
        <input type="checkbox" checked={closeAfternoon} onChange={e => setCloseAfternoon(e.target.checked)} className="accent-cnv-navy" />
        Close afternoon
      </label>
      <button
        disabled={!date || (!closeMorning && !closeAfternoon)}
        onClick={handleSubmit}
        className="col-span-2 bg-cnv-navy text-white py-2.5 font-bold tracking-widest hover:bg-cnv-navy-3 disabled:opacity-40 disabled:cursor-not-allowed">
        Save closure
      </button>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}
