'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePlayer } from '@/lib/party/usePlayer'
import { PlayerHeader } from '@/components/party/PlayerHeader'
import { GuestShell } from '@/components/party/GuestShell'
import { CLIENT_THEME } from '@/lib/party/client-config'

const GAMES = [
  { href: '/party/play/trivia', ...CLIENT_THEME.games.trivia },
  { href: '/party/play/reflex', ...CLIENT_THEME.games.reflex },
  { href: '/party/play/predict', ...CLIENT_THEME.games.predict },
  { href: '/party/play/photo', ...CLIENT_THEME.games.photo },
]

export default function PartyHubPage() {
  const router = useRouter()
  const { loading, token, player, rank, totalPlayers } = usePlayer()

  useEffect(() => {
    if (!loading && !token) router.replace('/party')
  }, [loading, token, router])

  if (loading || !player) {
    return <GuestShell><div className="flex min-h-[60vh] items-center justify-center text-lg font-semibold text-white">Loading…</div></GuestShell>
  }

  return (
    <GuestShell>
      <div className="space-y-6">
        <PlayerHeader player={player} rank={rank} totalPlayers={totalPlayers} />

        <div className="text-center text-white drop-shadow">
          <h1 className="text-2xl font-black">Pick a game 🌊</h1>
          <p className="text-sm text-white/90">New waves roll in throughout the party — check back often!</p>
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
    </GuestShell>
  )
}
