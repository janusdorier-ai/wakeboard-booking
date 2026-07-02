import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/party/admin-client'
import { isValidAdminPasscode } from '@/lib/party/server-helpers'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!isValidAdminPasscode(body?.passcode)) return NextResponse.json({ error: 'forbidden' }, { status: 401 })

  const { question, options, correctIndex, timeLimitSeconds, orderIndex } = body ?? {}
  if (
    typeof question !== 'string' || !question.trim() ||
    !Array.isArray(options) || options.length < 2 || options.some((o) => typeof o !== 'string' || !o.trim()) ||
    typeof correctIndex !== 'number' || correctIndex < 0 || correctIndex >= options.length
  ) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('party_trivia_questions')
    .insert({
      question: question.trim(),
      options,
      correct_index: correctIndex,
      time_limit_seconds: typeof timeLimitSeconds === 'number' && timeLimitSeconds > 0 ? timeLimitSeconds : 20,
      order_index: typeof orderIndex === 'number' ? orderIndex : 0,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: 'create_failed' }, { status: 500 })
  return NextResponse.json({ question: data })
}
