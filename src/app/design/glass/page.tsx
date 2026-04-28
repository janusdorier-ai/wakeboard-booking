'use client'
import Link from 'next/link'
import { useState } from 'react'
import { generateSlots } from '@/lib/booking/slots'
import { mockBookings, mockConfig, mockDays, mockMembers } from '../mockData'
import type { Period } from '@/lib/booking/types'

const stateStyle: Record<string, string> = {
  pending:   'bg-amber-100/80 border-amber-300 text-amber-900',
  confirmed: 'bg-emerald-100/80 border-emerald-300 text-emerald-900',
  full:      'bg-sky-200/80 border-sky-400 text-sky-900',
  available: 'bg-white/40 border-white/60 text-slate-700',
  adjacent:  'bg-cyan-100/80 border-cyan-300 text-cyan-900',
  hidden:    'hidden',
}

const stateLabel: Record<string, string> = {
  pending: 'Needs buddy', confirmed: 'Open spots', full: 'Full crew',
  available: 'Open', adjacent: 'Cluster-friendly', hidden: '',
}

export default function GlassMockup() {
  const [period, setPeriod] = useState<Period>('AM')
  const [active, setActive] = useState('2026-05-02')
  const slots = generateSlots({
    config: mockConfig, period, date: active,
    bookings: mockBookings.filter(b => b.period === period),
    membersByBooking: mockMembers as any,
    now: new Date('2026-05-02T07:00:00Z'),
  })

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-cyan-100 to-blue-300" />
      <svg className="absolute inset-x-0 bottom-0 w-full opacity-30" viewBox="0 0 1440 320" preserveAspectRatio="none">
        <path fill="white" d="M0,224L48,213.3C96,203,192,181,288,186.7C384,192,480,224,576,224C672,224,768,192,864,176C960,160,1056,160,1152,170.7C1248,181,1344,203,1392,213.3L1440,224L1440,320L0,320Z" />
      </svg>

      <div className="relative max-w-md mx-auto p-5">
        <DesignSwitcher current="glass" />

        <header className="flex items-center justify-between mt-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-sky-900/70 font-semibold">CNV Wakeboard</p>
            <h1 className="text-3xl font-bold text-slate-900">Book a session</h1>
          </div>
          <button className="rounded-full bg-white/40 backdrop-blur-md p-3 text-slate-700 border border-white/60">👤</button>
        </header>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-2 -mx-5 px-5">
          {mockDays.map(d => (
            <button key={d.date} onClick={() => setActive(d.date)}
              className={`shrink-0 rounded-2xl px-4 py-3 backdrop-blur-md border transition ${
                d.date === active
                  ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                  : 'bg-white/40 border-white/60 text-slate-700 hover:bg-white/60'
              }`}>
              <div className="text-xs opacity-70">{d.label.split(' ')[0]}</div>
              <div className="font-bold text-lg">{d.label.split(' ')[1]}</div>
            </button>
          ))}
        </div>

        <div className="mt-4 flex gap-1 rounded-2xl bg-white/30 backdrop-blur-md border border-white/60 p-1">
          {(['AM','PM'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
                period === p ? 'bg-white text-slate-900 shadow' : 'text-slate-700'
              }`}>
              {p === 'AM' ? '☀️ Morning' : '🌅 Afternoon'}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {slots.filter(s => s.state !== 'hidden').map(s => (
            <button key={s.start_time}
              className={`rounded-2xl p-3 text-left backdrop-blur-md border transition hover:scale-[1.02] ${stateStyle[s.state]}`}>
              <div className="font-bold tabular-nums text-lg">{s.start_time}</div>
              <div className="text-[11px] opacity-90">{stateLabel[s.state]}</div>
              {s.booking && (
                <div className="mt-1 text-[10px] opacity-80 tabular-nums">
                  {s.booking.member_count}/4 · {s.end_time}
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-2xl bg-white/40 backdrop-blur-md border border-white/60 p-4">
          <div className="text-xs font-semibold mb-2 text-slate-900">Slot status</div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
            <Legend cls="bg-amber-300" label="Needs buddy" />
            <Legend cls="bg-emerald-400" label="Open spots" />
            <Legend cls="bg-sky-500" label="Full crew" />
            <Legend cls="bg-cyan-300" label="Cluster-friendly" />
          </div>
        </div>
      </div>
    </main>
  )
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return <div className="flex items-center gap-2"><span className={`inline-block h-3 w-3 rounded-full ${cls}`} />{label}</div>
}

function DesignSwitcher({ current }: { current: string }) {
  return (
    <div className="flex gap-1 text-xs font-semibold">
      <Link href="/design" className="rounded-full px-3 py-1 bg-white/40 backdrop-blur-md border border-white/60 text-slate-700">All</Link>
      <Link href="/design/glass"  className={`rounded-full px-3 py-1 border ${current==='glass'  ? 'bg-slate-900 text-white border-slate-900' : 'bg-white/40 backdrop-blur-md border-white/60 text-slate-700'}`}>A · Glass</Link>
      <Link href="/design/sunset" className={`rounded-full px-3 py-1 border ${current==='sunset' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white/40 backdrop-blur-md border-white/60 text-slate-700'}`}>B · Sunset</Link>
      <Link href="/design/deep"   className={`rounded-full px-3 py-1 border ${current==='deep'   ? 'bg-slate-900 text-white border-slate-900' : 'bg-white/40 backdrop-blur-md border-white/60 text-slate-700'}`}>C · Deep</Link>
    </div>
  )
}
