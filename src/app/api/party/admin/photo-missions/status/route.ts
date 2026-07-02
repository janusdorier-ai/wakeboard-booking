import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/party/admin-client'
import { isValidAdminPasscode } from '@/lib/party/server-helpers'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!isValidAdminPasscode(body?.passcode)) return NextResponse.json({ error: 'forbidden' }, { status: 401 })

  const { missionId, status } = body ?? {}
  if (!missionId || !['draft', 'live', 'closed'].includes(status)) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const supabase = createAdminClient()
  if (status === 'live') {
    await supabase.from('party_photo_missions').update({ status: 'closed' }).eq('status', 'live')
  }
  await supabase.from('party_photo_missions').update({ status }).eq('id', missionId)

  return NextResponse.json({ ok: true })
}
