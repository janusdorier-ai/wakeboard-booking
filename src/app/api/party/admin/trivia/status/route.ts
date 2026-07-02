import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/party/admin-client'
import { isValidAdminPasscode } from '@/lib/party/server-helpers'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!isValidAdminPasscode(body?.passcode)) return NextResponse.json({ error: 'forbidden' }, { status: 401 })

  const { questionId, status } = body ?? {}
  if (!questionId || !['draft', 'live', 'closed'].includes(status)) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const supabase = createAdminClient()

  if (status === 'live') {
    await supabase.from('party_trivia_questions').update({ status: 'closed' }).eq('status', 'live')
    await supabase.from('party_trivia_questions')
      .update({ status: 'live', opened_at: new Date().toISOString() })
      .eq('id', questionId)
  } else {
    await supabase.from('party_trivia_questions').update({ status }).eq('id', questionId)
  }

  return NextResponse.json({ ok: true })
}
