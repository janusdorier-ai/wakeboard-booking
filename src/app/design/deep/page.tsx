'use client'
import Link from 'next/link'
import { useState } from 'react'
import { generateSlots } from '@/lib/booking/slots'
import { mockBookings, mockConfig, mockDays, mockMembers } from '../mockData'
import { CnvMark } from '@/components/CnvMark'
import type { Period } from '@/lib/booking/types'

const stateStyle: Record<string, string> = {
  pending:   'bg-orange-50 border-orange-400 text-orange-700',
  confirmed: 'bg-emerald-50 border-emerald-500 text-emerald-700',
  full:      'bg-purple-50 border-purple-400 text-purple-700',
  available: 'bg-white border-slate-200 text-slate-600 hover:border-cnv-navy/40',
  adjacent:  'bg-cyan-50 border-cyan-400 text-cyan-700',
  hidden:    'hidden',
}

const stateLabel: Record<string, string> = {
  pending: 'NEEDS_BUDDY', confirmed: 'OPEN_SPOTS', full: 'CAPACITY',
  available: 'OPEN', adjacent: 'CLUSTER_OK', hidden: '',
}

export default function DeepMockup() {
  const [period, setPeriod] = useState<Period>('AM')
  const [active, setActive] = useState('2026-05-02')
  const slots = generateSlots({
    config: mockConfig, period, date: active,
    bookings: mockBookings.filter(b => b.period === period),
    membersByBooking: mockMembers as any,
    now: new Date('2026-05-02T07:00:00Z'),
  })

  const visible = slots.filter(s => s.state !== 'hidden')
  const filled = visible.filter(s => s.booking).length
  const totalRiders = mockBookings.reduce((acc, b) => acc + b.member_count, 0)

  return (
    <main className="min-h-screen bg-slate-50 text-cnv-navy relative overflow-hidden">
      <div className="absolute inset-0 cnv-grid pointer-events-none" />
      <div className="absolute inset-0 cnv-grid-lines pointer-events-none" />

      <div className="relative max-w-md mx-auto p-5">
        <DesignSwitcher current="deep" />

        <header className="mt-6 flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <CnvMark className="h-12 w-auto" />
            <div>
              <div className="font-mono text-[10px] tracking-[0.3em] text-cnv-navy/70">SKI ▸ WAKEBOARD</div>
              <h1 className="text-lg font-bold mt-0.5">Booking Console</h1>
            </div>
          </div>
          <div className="font-mono text-[10px] text-right text-slate-500">
            <div>UTC+02:00</div>
            <div className="text-emerald-600">●  LIVE</div>
          </div>
        </header>

        <div className="grid grid-cols-3 gap-2 mt-5 font-mono">
          <Stat label="ACTIVE" value={String(filled).padStart(2,'0')} />
          <Stat label="RIDERS" value={String(totalRiders).padStart(2,'0')} />
          <Stat label="OPEN"   value={String(visible.length - filled).padStart(2,'0')} />
        </div>

        <div className="mt-5 flex gap-1 overflow-x-auto pb-2 -mx-5 px-5">
          {mockDays.map(d => (
            <button key={d.date} onClick={() => setActive(d.date)}
              className={`shrink-0 px-3 py-2 text-xs font-mono uppercase border transition ${
                d.date === active
                  ? 'bg-cnv-navy text-white border-cnv-navy font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-cnv-navy/40'
              }`}>
              {d.label}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 border border-slate-200 bg-white">
          {(['AM','PM'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`py-2 text-xs font-mono font-bold tracking-widest transition ${
                period === p ? 'bg-cnv-navy/5 text-cnv-navy' : 'text-slate-500 hover:text-cnv-navy'
              }`}>
              [{p}]
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-1.5">
          {visible.map(s => (
            <button key={s.start_time}
              className={`p-3 text-left font-mono border transition ${stateStyle[s.state]}`}>
              <div className="text-xl font-bold tabular-nums leading-none">{s.start_time}</div>
              <div className="text-[9px] opacity-80 mt-1.5 tracking-widest">{stateLabel[s.state]}</div>
              {s.booking && (
                <div className="mt-2 flex gap-0.5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className={`h-1.5 w-full ${i < s.booking!.member_count ? 'bg-current' : 'bg-current/20'}`} />
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>

        <button className="mt-6 w-full bg-cnv-navy text-white py-3.5 font-mono font-bold text-sm tracking-widest hover:bg-cnv-navy-3 transition">
          ▸ HOLD_SLOT
        </button>

        <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-600">
          <Legend cls="bg-orange-400"  label="NEEDS_BUDDY" />
          <Legend cls="bg-emerald-500" label="OPEN_SPOTS" />
          <Legend cls="bg-purple-400"  label="CAPACITY" />
          <Legend cls="bg-cyan-400"    label="CLUSTER_OK" />
        </div>
      </div>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate-200 bg-white p-3">
      <div className="text-[9px] tracking-widest text-slate-500">{label}</div>
      <div className="text-3xl font-bold text-cnv-navy tabular-nums leading-none mt-1">{value}</div>
    </div>
  )
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return <div className="flex items-center gap-2"><span className={`inline-block h-2 w-2 ${cls}`} />{label}</div>
}

function DesignSwitcher({ current }: { current: string }) {
  return (
    <div className="flex gap-1 text-xs font-mono">
      <Link href="/design" className="px-3 py-1 border border-slate-200 bg-white text-slate-500">[ALL]</Link>
      <Link href="/design/glass"  className={`px-3 py-1 border ${current==='glass'  ? 'bg-cnv-navy text-white border-cnv-navy font-bold' : 'border-slate-200 bg-white text-slate-500'}`}>[A·GLASS]</Link>
      <Link href="/design/sunset" className={`px-3 py-1 border ${current==='sunset' ? 'bg-cnv-navy text-white border-cnv-navy font-bold' : 'border-slate-200 bg-white text-slate-500'}`}>[B·SUNSET]</Link>
      <Link href="/design/deep"   className={`px-3 py-1 border ${current==='deep'   ? 'bg-cnv-navy text-white border-cnv-navy font-bold' : 'border-slate-200 bg-white text-slate-500'}`}>[C·DEEP]</Link>
    </div>
  )
}
