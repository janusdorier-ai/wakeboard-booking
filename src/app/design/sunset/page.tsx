'use client'
import Link from 'next/link'
import { useState } from 'react'
import { generateSlots } from '@/lib/booking/slots'
import { mockBookings, mockConfig, mockDays, mockMembers } from '../mockData'
import type { Period } from '@/lib/booking/types'

const stateStyle: Record<string, string> = {
  pending:   'bg-yellow-300 text-yellow-950 shadow-yellow-500/40',
  confirmed: 'bg-fuchsia-500 text-white shadow-fuchsia-500/40',
  full:      'bg-purple-700 text-white shadow-purple-700/40',
  available: 'bg-white/90 text-slate-900',
  adjacent:  'bg-orange-400 text-orange-950 shadow-orange-400/40',
  hidden:    'hidden',
}

const stateLabel: Record<string, string> = {
  pending: 'Find a buddy', confirmed: 'Jump in', full: 'Sold out',
  available: 'Open', adjacent: 'Cluster vibe', hidden: '',
}

export default function SunsetMockup() {
  const [period, setPeriod] = useState<Period>('AM')
  const [active, setActive] = useState('2026-05-02')
  const slots = generateSlots({
    config: mockConfig, period, date: active,
    bookings: mockBookings.filter(b => b.period === period),
    membersByBooking: mockMembers as any,
    now: new Date('2026-05-02T07:00:00Z'),
  })

  return (
    <main className="min-h-screen relative overflow-hidden text-white">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-300 via-pink-500 to-purple-700" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.3),_transparent_60%)]" />

      <div className="relative max-w-md mx-auto p-5">
        <DesignSwitcher current="sunset" />

        <header className="mt-6">
          <p className="text-xs uppercase tracking-[0.3em] font-bold opacity-80">CNV / Wakeboard</p>
          <h1 className="text-5xl font-black leading-none mt-1 italic" style={{ textShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
            CATCH<br/>THE<br/><span className="text-yellow-200">WAVE.</span>
          </h1>
        </header>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-2 -mx-5 px-5">
          {mockDays.map(d => (
            <button key={d.date} onClick={() => setActive(d.date)}
              className={`shrink-0 rounded-2xl px-4 py-3 font-bold transition ${
                d.date === active
                  ? 'bg-white text-purple-700 shadow-2xl scale-105'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}>
              <div className="text-[10px] opacity-80 uppercase">{d.label.split(' ')[0]}</div>
              <div className="text-2xl font-black">{d.label.split(' ')[1]}</div>
            </button>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          {(['AM','PM'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`flex-1 rounded-2xl py-3 font-black uppercase tracking-wide transition ${
                period === p ? 'bg-white text-purple-700 shadow-lg' : 'bg-white/20 text-white'
              }`}>
              {p === 'AM' ? '🌞 Morning' : '🌅 Sunset'}
            </button>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2.5">
          {slots.filter(s => s.state !== 'hidden').map(s => (
            <button key={s.start_time}
              className={`rounded-2xl p-3 text-left font-bold shadow-xl transition hover:-translate-y-0.5 ${stateStyle[s.state]}`}>
              <div className="text-2xl font-black tabular-nums leading-none">{s.start_time}</div>
              <div className="text-[10px] opacity-80 mt-1 uppercase font-bold tracking-wider">{stateLabel[s.state]}</div>
              {s.booking && (
                <div className="mt-2 flex -space-x-1.5">
                  {Array.from({ length: s.booking.member_count }).map((_, i) => (
                    <div key={i} className="h-5 w-5 rounded-full bg-white/80 border-2 border-current text-[9px] flex items-center justify-center font-black text-purple-700">
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>

        <button className="mt-6 w-full rounded-2xl bg-white text-purple-700 py-4 font-black text-lg uppercase tracking-wider shadow-2xl active:scale-95">
          🤙 Hold a slot
        </button>
      </div>
    </main>
  )
}

function DesignSwitcher({ current }: { current: string }) {
  return (
    <div className="flex gap-1 text-xs font-bold">
      <Link href="/design" className="rounded-full px-3 py-1 bg-white/20 text-white">All</Link>
      <Link href="/design/glass"  className={`rounded-full px-3 py-1 ${current==='glass'  ? 'bg-white text-purple-700' : 'bg-white/20 text-white'}`}>A · Glass</Link>
      <Link href="/design/sunset" className={`rounded-full px-3 py-1 ${current==='sunset' ? 'bg-white text-purple-700' : 'bg-white/20 text-white'}`}>B · Sunset</Link>
      <Link href="/design/deep"   className={`rounded-full px-3 py-1 ${current==='deep'   ? 'bg-white text-purple-700' : 'bg-white/20 text-white'}`}>C · Deep</Link>
    </div>
  )
}
