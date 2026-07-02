import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/party/admin-client'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const supabase = createAdminClient()

  const { data: question } = await supabase
    .from('party_trivia_questions')
    .select('id, question, options, time_limit_seconds, opened_at')
    .eq('status', 'live')
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!question) return NextResponse.json({ question: null })

  let myAnswer = null
  if (token) {
    const { data: player } = await supabase
      .from('party_players').select('id').eq('token', token).maybeSingle()
    if (player) {
      const { data: answer } = await supabase
        .from('party_trivia_answers')
        .select('selected_index, correct, points')
        .eq('question_id', question.id)
        .eq('player_id', player.id)
        .maybeSingle()
      myAnswer = answer ?? null
    }
  }

  return NextResponse.json({ question, myAnswer })
}
