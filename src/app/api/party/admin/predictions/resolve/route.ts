import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/party/admin-client'
import { isValidAdminPasscode } from '@/lib/party/server-helpers'
import { computePredictionPoints } from '@/lib/party/scoring'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!isValidAdminPasscode(body?.passcode)) return NextResponse.json({ error: 'forbidden' }, { status: 401 })

  const { predictionId, actual } = body ?? {}
  if (!predictionId || typeof actual !== 'number') {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: guesses } = await supabase
    .from('party_prediction_guesses')
    .select('id, player_id, guess')
    .eq('prediction_id', predictionId)

  const pointsById = computePredictionPoints(guesses ?? [], actual)

  await Promise.all(
    (guesses ?? []).map(async (g) => {
      const points = pointsById.get(g.id) ?? 0
      await supabase.from('party_prediction_guesses').update({ points }).eq('id', g.id)
      if (points > 0) await supabase.rpc('increment_party_score', { p_player_id: g.player_id, p_delta: points })
    }),
  )

  await supabase.from('party_predictions').update({ actual_value: actual, status: 'closed' }).eq('id', predictionId)

  return NextResponse.json({ ok: true, resolvedCount: guesses?.length ?? 0 })
}
