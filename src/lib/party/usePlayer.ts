'use client'

import { useEffect, useState, useCallback } from 'react'
import { getStoredToken, clearToken } from './client'
import type { Player } from './types'

interface PlayerState {
  loading: boolean
  token: string | null
  player: Player | null
  rank: number | null
  totalPlayers: number
}

// Polls /api/party/me so the score/rank shown on a guest's phone stays live
// without needing websockets — fine at ~250 concurrent players.
export function usePlayer(pollMs = 6000) {
  const [state, setState] = useState<PlayerState>({
    loading: true, token: null, player: null, rank: null, totalPlayers: 0,
  })

  const refresh = useCallback(async () => {
    const token = getStoredToken()
    if (!token) {
      setState((s) => ({ ...s, loading: false, token: null, player: null }))
      return
    }
    try {
      const res = await fetch(`/api/party/me?token=${encodeURIComponent(token)}`)
      if (res.status === 404) {
        clearToken()
        setState((s) => ({ ...s, loading: false, token: null, player: null }))
        return
      }
      const data = await res.json()
      setState({ loading: false, token, player: data.player, rank: data.rank, totalPlayers: data.totalPlayers })
    } catch {
      setState((s) => ({ ...s, loading: false }))
    }
  }, [])

  useEffect(() => {
    refresh()
    if (!pollMs) return
    const id = setInterval(refresh, pollMs)
    return () => clearInterval(id)
  }, [refresh, pollMs])

  return { ...state, refresh }
}
