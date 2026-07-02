import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/party/admin-client'
import { computeReflexPoints } from '@/lib/party/scoring'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const { token, taps } = body ?? {}
  if (!token || typeof taps !== 'number' || taps < 0) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: player } = await supabase
    .from('party_players').select('id').eq('token', token).maybeSingle()
  if (!player) return NextResponse.json({ error: 'invalid_token' }, { status: 401 })

  const points = computeReflexPoints(taps)

  const { data: existing } = await supabase
    .from('party_reflex_scores').select('taps, points').eq('player_id', player.id).maybeSingle()

  if (!existing) {
    await supabase.from('party_reflex_scores').insert({ player_id: player.id, taps, points })
    if (points > 0) await supabase.rpc('increment_party_score', { p_player_id: player.id, p_delta: points })
    return NextResponse.json({ points, taps, best: true })
  }

  if (points > existing.points) {
    await supabase.from('party_reflex_scores').update({ taps, points }).eq('player_id', player.id)
    const delta = points - existing.points
    if (delta > 0) await supabase.rpc('increment_party_score', { p_player_id: player.id, p_delta: delta })
    return NextResponse.json({ points, taps, best: true })
  }

  return NextResponse.json({ points: existing.points, taps: existing.taps, best: false })
}
