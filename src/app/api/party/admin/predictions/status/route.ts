import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/party/admin-client'
import { isValidAdminPasscode } from '@/lib/party/server-helpers'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!isValidAdminPasscode(body?.passcode)) return NextResponse.json({ error: 'forbidden' }, { status: 401 })

  const { predictionId, status } = body ?? {}
  if (!predictionId || !['draft', 'live', 'closed'].includes(status)) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const supabase = createAdminClient()
  if (status === 'live') {
    await supabase.from('party_predictions').update({ status: 'closed' }).eq('status', 'live')
  }
  await supabase.from('party_predictions').update({ status }).eq('id', predictionId)

  return NextResponse.json({ ok: true })
}
