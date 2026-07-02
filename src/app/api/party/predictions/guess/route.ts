import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/party/admin-client'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const { token, predictionId, guess } = body ?? {}
  if (!token || !predictionId || typeof guess !== 'number') {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: player } = await supabase
    .from('party_players').select('id').eq('token', token).maybeSingle()
  if (!player) return NextResponse.json({ error: 'invalid_token' }, { status: 401 })

  const { data: prediction } = await supabase
    .from('party_predictions').select('status').eq('id', predictionId).maybeSingle()
  if (!prediction || prediction.status !== 'live') {
    return NextResponse.json({ error: 'prediction_not_live' }, { status: 400 })
  }

  const { error } = await supabase
    .from('party_prediction_guesses')
    .insert({ prediction_id: predictionId, player_id: player.id, guess })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ ok: true, alreadyGuessed: true })
    return NextResponse.json({ error: 'guess_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, alreadyGuessed: false })
}
