'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredToken, storeToken } from '@/lib/party/client'
import { AVATAR_CHOICES } from '@/lib/party/types'

export default function PartyJoinPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [name, setName] = useState('')
  const [team, setTeam] = useState('')
  const [avatar, setAvatar] = useState(AVATAR_CHOICES[0])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = getStoredToken()
    if (!token) { setChecking(false); return }
    fetch(`/api/party/me?token=${encodeURIComponent(token)}`)
      .then((res) => (res.ok ? router.replace('/party/play') : setChecking(false)))
      .catch(() => setChecking(false))
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Enter your name to join!'); return }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/party/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, team, avatar }),
      })
      if (!res.ok) throw new Error()
      const { player } = await res.json()
      storeToken(player.token)
      router.push('/party/play')
    } catch {
      setError('Something went wrong — try again.')
      setSubmitting(false)
    }
  }

  if (checking) {
    return <div className="flex min-h-[60vh] items-center justify-center text-white text-lg font-semibold">Loading…</div>
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8">
      <div className="text-center text-white drop-shadow">
        <p className="text-sm font-bold uppercase tracking-widest">MCI Group · Geneva</p>
        <h1 className="mt-1 text-4xl font-black">☀️ Summer Challenge</h1>
        <p className="mt-2 text-white/90">Join the game, rack up points, top the board.</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full space-y-4 rounded-3xl bg-white/90 p-6 shadow-xl backdrop-blur">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Your name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex"
            maxLength={40}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-fuchsia-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Team / company (optional)</label>
          <input
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            placeholder="MCI Geneva"
            maxLength={40}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-fuchsia-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Pick your avatar</label>
          <div className="grid grid-cols-6 gap-2">
            {AVATAR_CHOICES.map((a) => (
              <button
                type="button"
                key={a}
                onClick={() => setAvatar(a)}
                className={`rounded-xl border-2 py-2 text-xl transition ${
                  avatar === a ? 'border-fuchsia-500 bg-fuchsia-50' : 'border-slate-200'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-fuchsia-600 py-3 text-lg font-bold text-white shadow-lg transition hover:bg-fuchsia-700 disabled:opacity-60"
        >
          {submitting ? 'Joining…' : "Let's go 🎉"}
        </button>
      </form>
    </div>
  )
}
