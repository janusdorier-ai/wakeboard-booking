'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { getStoredToken } from '@/lib/party/client'

interface Prediction { id: string; prompt: string; unit: string | null }

export default function PredictPage() {
  const token = useRef(getStoredToken())
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [myGuess, setMyGuess] = useState<number | null>(null)
  const [guessInput, setGuessInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function poll() {
      const t = token.current
      const res = await fetch(`/api/party/predictions/current${t ? `?token=${encodeURIComponent(t)}` : ''}`)
      const data = await res.json()
      if (cancelled) return
      setPrediction(data.prediction)
      setMyGuess(data.myGuess)
      setLoading(false)
    }
    poll()
    const id = setInterval(poll, 3000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!prediction || !token.current || !guessInput) return
    setSubmitting(true)
    await fetch('/api/party/predictions/guess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.current, predictionId: prediction.id, guess: Number(guessInput) }),
    })
    setMyGuess(Number(guessInput))
    setSubmitting(false)
  }

  return (
    <div className="space-y-6">
      <Link href="/party/play" className="inline-block text-sm font-semibold text-white/90">← Back</Link>
      <h1 className="text-center text-2xl font-black text-white drop-shadow">🔮 Predictions</h1>

      <div className="rounded-3xl bg-white/95 p-6 shadow-xl">
        {loading && <p className="text-center text-slate-500">Loading…</p>}

        {!loading && !prediction && (
          <>
            <p className="text-center text-lg font-semibold text-slate-700">No prediction open right now 🔍</p>
            <p className="mt-1 text-center text-sm text-slate-500">The host will drop a new one soon — closest guess wins the most points.</p>
          </>
        )}

        {prediction && myGuess === null && (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-lg font-bold text-slate-900">{prediction.prompt}</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="any"
                required
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value)}
                placeholder="Your guess"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg outline-none focus:border-fuchsia-500"
              />
              {prediction.unit && <span className="whitespace-nowrap text-slate-500">{prediction.unit}</span>}
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-fuchsia-600 py-3 text-lg font-bold text-white shadow-lg hover:bg-fuchsia-700 disabled:opacity-60"
            >
              Lock in guess
            </button>
          </form>
        )}

        {prediction && myGuess !== null && (
          <>
            <p className="text-lg font-bold text-slate-900">{prediction.prompt}</p>
            <p className="mt-3 text-center text-sm font-medium text-slate-500">Your guess</p>
            <p className="text-center text-4xl font-black text-fuchsia-600">
              {myGuess}{prediction.unit ? ` ${prediction.unit}` : ''}
            </p>
            <p className="mt-3 text-center text-sm text-slate-500">Locked in — results reveal when the host closes this round.</p>
          </>
        )}
      </div>
    </div>
  )
}
