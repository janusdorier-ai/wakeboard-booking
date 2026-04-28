'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CnvMark } from '@/components/CnvMark'
import type { Booking, ClubConfig } from '@/lib/booking/types'

interface DayOverride { date: string; am_open: boolean; pm_open: boolean; note: string | null }

const inputCls = 'w-full bg-white border border-slate-300 px-2 py-1.5 text-cnv-navy focus:outline-none focus:border-cnv-navy font-mono text-sm'

export function AdminClient({ config, bookings, overrides }: {
  config: ClubConfig; bookings: Booking[]; overrides: DayOverride[]
}) {
  const supabase = createClient()
  const router = useRouter()
  const [cfg, setCfg] = useState(config)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg]   = useState<string | null>(null)

  async function saveConfig() {
    setBusy(true); setMsg(null)
    const { error } = await supabase.from('club_config').update({
      name: cfg.name,
      am_start: cfg.am_start, am_end: cfg.am_end,
      pm_start: cfg.pm_start, pm_end: cfg.pm_end,
      cluster_gap_minutes: cfg.cluster_gap_minutes,
      cluster_lockin_hours: cfg.cluster_lockin_hours,
      solo_timeout_hours: cfg.solo_timeout_hours,
      slot_step_minutes: cfg.slot_step_minutes,
      duration_2_minutes: cfg.duration_2_minutes,
      duration_3_minutes: cfg.duration_3_minutes,
      duration_4_minutes: cfg.duration_4_minutes,
    }).eq('id', 1)
    setBusy(false)
    if (error) setMsg(error.message); else { setMsg('SAVED'); router.refresh() }
  }

  async function cancelBooking(id: string) {
    if (!confirm('Cancel this booking?')) return
    const { error } = await supabase.rpc('admin_cancel_booking', { p_booking_id: id })
    if (error) alert(error.message); else router.refresh()
  }

  async function setOverride(date: string, am_open: boolean, pm_open: boolean, note?: string) {
    const { error } = await supabase.from('day_overrides').upsert({ date, am_open, pm_open, note: note ?? null })
    if (error) alert(error.message); else router.refresh()
  }

  return (
    <main className="min-h-screen bg-slate-50 text-cnv-navy relative overflow-hidden">
      <div className="absolute inset-0 cnv-grid pointer-events-none" />
      <div className="absolute inset-0 cnv-grid-lines pointer-events-none" />

      <div className="relative max-w-2xl mx-auto p-5">
        <header className="flex items-center justify-between border-b border-slate-200 pb-4">
          <Link href="/" className="flex items-center gap-3">
            <CnvMark className="h-12 w-auto" />
            <div>
              <div className="font-mono text-[10px] tracking-[0.3em] text-cnv-navy/70">SKI ▸ WAKEBOARD ▸ ADMIN</div>
              <h1 className="text-lg font-bold mt-0.5">Control Panel</h1>
            </div>
          </Link>
          <Link href="/book" className="font-mono text-[10px] tracking-widest text-slate-500 hover:text-cnv-navy">
            [VIEW_AS_WAKER]
          </Link>
        </header>

        <section className="mt-6 border border-slate-200 bg-white p-5">
          <h2 className="font-mono text-xs tracking-widest text-cnv-navy">▸ CLUB_CONFIG</h2>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <Field label="CLUB_NAME">
              <input value={cfg.name} onChange={e => setCfg({ ...cfg, name: e.target.value })} className={inputCls} />
            </Field>
            <div />
            <Field label="AM_START"><input type="time" value={cfg.am_start.slice(0,5)} onChange={e => setCfg({ ...cfg, am_start: e.target.value })} className={inputCls} /></Field>
            <Field label="AM_END">  <input type="time" value={cfg.am_end.slice(0,5)}   onChange={e => setCfg({ ...cfg, am_end: e.target.value })}   className={inputCls} /></Field>
            <Field label="PM_START"><input type="time" value={cfg.pm_start.slice(0,5)} onChange={e => setCfg({ ...cfg, pm_start: e.target.value })} className={inputCls} /></Field>
            <Field label="PM_END">  <input type="time" value={cfg.pm_end.slice(0,5)}   onChange={e => setCfg({ ...cfg, pm_end: e.target.value })}   className={inputCls} /></Field>
            <Field label="CLUSTER_GAP_MIN"><input type="number" value={cfg.cluster_gap_minutes} onChange={e => setCfg({ ...cfg, cluster_gap_minutes: +e.target.value })} className={inputCls} /></Field>
            <Field label="CLUSTER_LOCKIN_H"><input type="number" value={cfg.cluster_lockin_hours} onChange={e => setCfg({ ...cfg, cluster_lockin_hours: +e.target.value })} className={inputCls} /></Field>
            <Field label="SOLO_TIMEOUT_H"><input type="number" value={cfg.solo_timeout_hours} onChange={e => setCfg({ ...cfg, solo_timeout_hours: +e.target.value })} className={inputCls} /></Field>
            <Field label="SLOT_STEP_MIN"><input type="number" value={cfg.slot_step_minutes} onChange={e => setCfg({ ...cfg, slot_step_minutes: +e.target.value })} className={inputCls} /></Field>
            <Field label="DURATION_2_MIN"><input type="number" value={cfg.duration_2_minutes} onChange={e => setCfg({ ...cfg, duration_2_minutes: +e.target.value })} className={inputCls} /></Field>
            <Field label="DURATION_3_MIN"><input type="number" value={cfg.duration_3_minutes} onChange={e => setCfg({ ...cfg, duration_3_minutes: +e.target.value })} className={inputCls} /></Field>
            <Field label="DURATION_4_MIN"><input type="number" value={cfg.duration_4_minutes} onChange={e => setCfg({ ...cfg, duration_4_minutes: +e.target.value })} className={inputCls} /></Field>
          </div>
          <button disabled={busy} onClick={saveConfig}
            className="mt-5 bg-cnv-navy text-white px-5 py-2.5 font-mono font-bold tracking-widest text-xs hover:bg-cnv-navy-3 disabled:opacity-40">
            {busy ? '▸ SAVING…' : '▸ SAVE_CONFIG'}
          </button>
          {msg && <span className="ml-3 text-xs font-mono text-slate-500">{msg}</span>}
        </section>

        <section className="mt-6 border border-slate-200 bg-white p-5">
          <h2 className="font-mono text-xs tracking-widest text-cnv-navy">▸ UPCOMING_BOOKINGS [14d]</h2>
          {bookings.length === 0 && <p className="mt-3 text-sm text-slate-500 font-mono">▸ NO_BOOKINGS</p>}
          <ul className="mt-3 divide-y divide-slate-100">
            {bookings.map(b => (
              <li key={b.id} className="flex items-center gap-3 py-2 text-xs font-mono">
                <span className="tabular-nums">{b.date}</span>
                <span className="font-bold text-cnv-navy">[{b.period}]</span>
                <span className="tabular-nums">{b.start_time.slice(0,5)}–{b.end_time.slice(0,5)}</span>
                <span className="text-slate-500 tabular-nums">{b.member_count}/4</span>
                <span className={`ml-auto border px-2 py-0.5 text-[10px] tracking-widest uppercase ${
                  b.status === 'pending'   ? 'border-orange-400 text-orange-700 bg-orange-50' :
                  b.status === 'confirmed' ? 'border-emerald-500 text-emerald-700 bg-emerald-50' :
                                             'border-purple-400 text-purple-700 bg-purple-50'
                }`}>{b.status}</span>
                <button onClick={() => cancelBooking(b.id)}
                  className="text-slate-500 hover:text-red-700 text-[10px] tracking-widest">[CANCEL]</button>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6 border border-slate-200 bg-white p-5">
          <h2 className="font-mono text-xs tracking-widest text-cnv-navy">▸ CLOSE_DAY</h2>
          <p className="mt-1 text-xs text-slate-500 font-mono">Disable AM and/or PM for weather, events, etc.</p>
          <CloseDayForm onSubmit={setOverride} />
          <ul className="mt-4 divide-y divide-slate-100 text-xs font-mono">
            {overrides.map(o => (
              <li key={o.date} className="py-2 flex items-center gap-3">
                <span className="tabular-nums">{o.date}</span>
                <span className={o.am_open ? 'text-slate-500' : 'text-red-700'}>AM:{o.am_open ? 'open' : 'CLOSED'}</span>
                <span className={o.pm_open ? 'text-slate-500' : 'text-red-700'}>PM:{o.pm_open ? 'open' : 'CLOSED'}</span>
                {o.note && <span className="text-slate-500 italic">"{o.note}"</span>}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-[10px] font-mono tracking-widest text-slate-500">{label}<div className="mt-1">{children}</div></label>
}

function CloseDayForm({ onSubmit }: { onSubmit: (date: string, am: boolean, pm: boolean, note?: string) => void }) {
  const [date, setDate] = useState('')
  const [am, setAm]     = useState(true)
  const [pm, setPm]     = useState(true)
  const [note, setNote] = useState('')
  return (
    <div className="grid grid-cols-2 gap-2 mt-3 text-xs font-mono">
      <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
      <input value={note} onChange={e => setNote(e.target.value)} placeholder="note (optional)" className={inputCls} />
      <label className="flex items-center gap-2 text-slate-500"><input type="checkbox" checked={am} onChange={e => setAm(e.target.checked)} className="accent-cnv-navy" /> AM_OPEN</label>
      <label className="flex items-center gap-2 text-slate-500"><input type="checkbox" checked={pm} onChange={e => setPm(e.target.checked)} className="accent-cnv-navy" /> PM_OPEN</label>
      <button onClick={() => date && onSubmit(date, am, pm, note)}
        className="col-span-2 bg-cnv-navy text-white py-2.5 font-bold tracking-widest hover:bg-cnv-navy-3">
        ▸ SAVE_DAY
      </button>
    </div>
  )
}
