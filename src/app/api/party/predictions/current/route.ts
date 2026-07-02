import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/party/admin-client'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const supabase = createAdminClient()

  const { data: prediction } = await supabase
    .from('party_predictions')
    .select('id, prompt, unit')
    .eq('status', 'live')
    .order('order_index', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!prediction) return NextResponse.json({ prediction: null })

  let myGuess = null
  if (token) {
    const { data: player } = await supabase
      .from('party_players').select('id').eq('token', token).maybeSingle()
    if (player) {
      const { data: guess } = await supabase
        .from('party_prediction_guesses')
        .select('guess')
        .eq('prediction_id', prediction.id)
        .eq('player_id', player.id)
        .maybeSingle()
      myGuess = guess?.guess ?? null
    }
  }

  return NextResponse.json({ prediction, myGuess })
}
