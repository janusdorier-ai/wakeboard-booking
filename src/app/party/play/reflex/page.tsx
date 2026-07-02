'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { getStoredToken } from '@/lib/party/client'

type Phase = 'idle' | 'countdown' | 'active' | 'submitting' | 'result'

const ROUND_SECONDS = 5

export default function ReflexPage() {
  const token = useRef(getStoredToken())
  const [phase, setPhase] = useState<Phase>('idle')
  const [countdown, setCountdown] = useState(3)
  const [taps, setTaps] = useState(0)
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS)
  const [result, setResult] = useState<{ points: number; taps: number; best: boolean } | null>(null)

  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown === 0) { setPhase('active'); return }
    const id = setTimeout(() => setCountdown((c) => c - 1), 700)
    return () => clearTimeout(id)
  }, [phase, countdown])

  useEffect(() => {
    if (phase !== 'active') return
    if (timeLeft <= 0) {
      submit()
      return
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 0.1), 100)
    return () => clearTimeout(id)
  }, [phase, timeLeft])

  function start() {
    setTaps(0)
    setCountdown(3)
    setTimeLeft(ROUND_SECONDS)
    setResult(null)
    setPhase('countdown')
  }

  async function submit() {
    setPhase('submitting')
    const res = await fetch('/api/party/reflex/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.current, taps }),
    })
    const data = await res.json()
    setResult(data)
    setPhase('result')
  }

  return (
    <div className="space-y-6">
      <Link href="/party/play" className="inline-block text-sm font-semibold text-white/90">← Back</Link>
      <h1 className="text-center text-2xl font-black text-white drop-shadow">⚡ Reflex Tap</h1>

      <div className="rounded-3xl bg-white/95 p-6 text-center shadow-xl">
        {phase === 'idle' && (
          <>
            <p className="mb-4 text-slate-600">Tap as fast as you can for {ROUND_SECONDS} seconds. Ready?</p>
            <button
              onClick={start}
              className="rounded-xl bg-fuchsia-600 px-8 py-4 text-lg font-bold text-white shadow-lg hover:bg-fuchsia-700"
            >
              Start
            </button>
          </>
        )}

        {phase === 'countdown' && (
          <p className="text-6xl font-black text-fuchsia-600">{countdown === 0 ? 'GO!' : countdown}</p>
        )}

        {phase === 'active' && (
          <>
            <p className="mb-2 text-sm font-bold text-slate-500">{timeLeft.toFixed(1)}s left</p>
            <button
              onClick={() => setTaps((t) => t + 1)}
              className="h-48 w-48 select-none rounded-full bg-gradient-to-br from-fuchsia-500 to-orange-400 text-3xl font-black text-white shadow-2xl active:scale-95"
            >
              TAP!
            </button>
            <p className="mt-4 text-4xl font-black text-slate-900">{taps}</p>
          </>
        )}

        {phase === 'submitting' && <p className="text-lg font-semibold text-slate-500">Saving your score…</p>}

        {phase === 'result' && result && (
          <>
            <p className="text-5xl font-black text-slate-900">{result.taps}</p>
            <p className="text-sm text-slate-500">taps</p>
            <p className="mt-3 text-2xl font-bold text-fuchsia-600">+{result.points} pts</p>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {result.best ? '🎉 New best!' : 'That run wasn\'t better than your best — score kept.'}
            </p>
            <button
              onClick={start}
              className="mt-5 rounded-xl bg-slate-900 px-6 py-3 font-bold text-white shadow-lg hover:bg-slate-800"
            >
              Play again
            </button>
          </>
        )}
      </div>
    </div>
  )
}
