'use client'

import Link from 'next/link'
import type { Player } from '@/lib/party/types'

export function PlayerHeader({ player, rank, totalPlayers }: {
  player: Player | null
  rank: number | null
  totalPlayers: number
}) {
  if (!player) return null
  return (
    <Link
      href="/party/play/leaderboard"
      className="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3 shadow-md backdrop-blur"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{player.avatar}</span>
        <div>
          <p className="text-sm font-semibold leading-tight">{player.name}</p>
          {player.team && <p className="text-xs text-slate-500 leading-tight">{player.team}</p>}
        </div>
      </div>
      <div className="text-right">
        <p className="text-lg font-extrabold leading-tight text-[var(--party-accent)]">{player.score} pts</p>
        {rank && <p className="text-xs text-slate-500 leading-tight">#{rank} of {totalPlayers}</p>}
      </div>
    </Link>
  )
}
