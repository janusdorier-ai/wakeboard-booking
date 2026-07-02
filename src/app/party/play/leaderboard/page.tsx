'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { getStoredToken } from '@/lib/party/client'
import { usePlayer } from '@/lib/party/usePlayer'
import { PlayerHeader } from '@/components/party/PlayerHeader'

interface Row { name: string; team: string | null; avatar: string; score: number; is_me: boolean }

const MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const token = useRef(getStoredToken())
  const { player, rank, totalPlayers } = usePlayer()
  const [top, setTop] = useState<Row[]>([])

  useEffect(() => {
    let cancelled = false
    async function poll() {
      const t = token.current
      const res = await fetch(`/api/party/leaderboard${t ? `?token=${encodeURIComponent(t)}` : ''}`)
      const data = await res.json()
      if (!cancelled) setTop(data.top ?? [])
    }
    poll()
    const id = setInterval(poll, 5000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  return (
    <div className="space-y-6">
      <Link href="/party/play" className="inline-block text-sm font-semibold text-white/90">← Back</Link>
      <h1 className="text-center text-2xl font-black text-white drop-shadow">🏆 Leaderboard</h1>

      <PlayerHeader player={player} rank={rank} totalPlayers={totalPlayers} />

      <div className="rounded-3xl bg-white/95 p-4 shadow-xl">
        {top.length === 0 && <p className="py-6 text-center text-slate-500">No scores yet — go play!</p>}
        <ol className="space-y-2">
          {top.map((row, i) => (
            <li
              key={i}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 ${row.is_me ? 'bg-fuchsia-50 ring-2 ring-fuchsia-400' : ''}`}
            >
              <span className="w-7 text-center text-lg font-black text-slate-700">{MEDALS[i] ?? i + 1}</span>
              <span className="text-xl">{row.avatar}</span>
              <div className="flex-1 truncate">
                <p className="truncate font-semibold text-slate-900">{row.name}</p>
                {row.team && <p className="truncate text-xs text-slate-500">{row.team}</p>}
              </div>
              <span className="font-black text-fuchsia-600">{row.score}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
