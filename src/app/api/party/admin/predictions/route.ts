import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/party/admin-client'
import { isValidAdminPasscode } from '@/lib/party/server-helpers'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!isValidAdminPasscode(body?.passcode)) return NextResponse.json({ error: 'forbidden' }, { status: 401 })

  const { prompt, unit, orderIndex } = body ?? {}
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('party_predictions')
    .insert({
      prompt: prompt.trim(),
      unit: typeof unit === 'string' && unit.trim() ? unit.trim() : null,
      order_index: typeof orderIndex === 'number' ? orderIndex : 0,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: 'create_failed' }, { status: 500 })
  return NextResponse.json({ prediction: data })
}
