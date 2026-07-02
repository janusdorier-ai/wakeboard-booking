'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePlayer } from '@/lib/party/usePlayer'
import { PlayerHeader } from '@/components/party/PlayerHeader'

const GAMES = [
  { href: '/party/play/trivia', icon: '🧠', title: 'Speed Trivia', blurb: 'Answer fast, score big' },
  { href: '/party/play/reflex', icon: '⚡', title: 'Reflex Tap', blurb: '5 seconds, tap like mad' },
  { href: '/party/play/predict', icon: '🔮', title: 'Predictions', blurb: 'Guess closest, win points' },
  { href: '/party/play/photo', icon: '📸', title: 'Photo Mission', blurb: 'Snap it, get votes' },
]

export default function PartyHubPage() {
  const router = useRouter()
  const { loading, token, player, rank, totalPlayers } = usePlayer()

  useEffect(() => {
    if (!loading && !token) router.replace('/party')
  }, [loading, token, router])

  if (loading || !player) {
    return <div className="flex min-h-[60vh] items-center justify-center text-white text-lg font-semibold">Loading…</div>
  }

  return (
    <div className="space-y-6">
      <PlayerHeader player={player} rank={rank} totalPlayers={totalPlayers} />

      <div className="text-center text-white drop-shadow">
        <h1 className="text-2xl font-black">Pick a game 🎮</h1>
        <p className="text-sm text-white/90">New rounds pop up throughout the party — check back often!</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {GAMES.map((g) => (
          <Link
            key={g.href}
            href={g.href}
            className="flex flex-col items-center gap-2 rounded-2xl bg-white/90 p-5 text-center shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            <span className="text-4xl">{g.icon}</span>
            <span className="font-bold text-slate-800">{g.title}</span>
            <span className="text-xs text-slate-500">{g.blurb}</span>
          </Link>
        ))}
      </div>

      <Link
        href="/party/play/leaderboard"
        className="block rounded-2xl bg-slate-900 py-4 text-center text-lg font-bold text-white shadow-lg transition hover:bg-slate-800"
      >
        🏆 View leaderboard
      </Link>
    </div>
  )
}
