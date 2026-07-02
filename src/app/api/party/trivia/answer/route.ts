import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/party/admin-client'
import { computeTriviaPoints } from '@/lib/party/scoring'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const { token, questionId, selectedIndex } = body ?? {}
  if (!token || !questionId || typeof selectedIndex !== 'number') {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: player } = await supabase
    .from('party_players').select('id').eq('token', token).maybeSingle()
  if (!player) return NextResponse.json({ error: 'invalid_token' }, { status: 401 })

  const { data: question } = await supabase
    .from('party_trivia_questions')
    .select('id, correct_index, status, opened_at, time_limit_seconds')
    .eq('id', questionId)
    .maybeSingle()
  if (!question || question.status !== 'live') {
    return NextResponse.json({ error: 'question_not_live' }, { status: 400 })
  }

  const elapsedSeconds = question.opened_at
    ? (Date.now() - new Date(question.opened_at).getTime()) / 1000
    : question.time_limit_seconds
  const correct = selectedIndex === question.correct_index
  const withinGrace = elapsedSeconds <= question.time_limit_seconds + 3 // small allowance for network lag
  const points = withinGrace ? computeTriviaPoints(correct, elapsedSeconds, question.time_limit_seconds) : 0

  const { data: inserted, error: insertError } = await supabase
    .from('party_trivia_answers')
    .insert({ question_id: questionId, player_id: player.id, selected_index: selectedIndex, correct, points })
    .select('correct, points')
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      const { data: existing } = await supabase
        .from('party_trivia_answers')
        .select('correct, points')
        .eq('question_id', questionId)
        .eq('player_id', player.id)
        .single()
      return NextResponse.json({ ...existing, alreadyAnswered: true })
    }
    return NextResponse.json({ error: 'answer_failed' }, { status: 500 })
  }

  if (points > 0) {
    await supabase.rpc('increment_party_score', { p_player_id: player.id, p_delta: points })
  }

  return NextResponse.json({ ...inserted, alreadyAnswered: false })
}
