import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/party/admin-client'
import { generatePlayerToken } from '@/lib/party/server-helpers'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 40) : ''
  const team = typeof body?.team === 'string' ? body.team.trim().slice(0, 40) || null : null
  const avatar = typeof body?.avatar === 'string' ? body.avatar.slice(0, 8) : '🎉'

  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const token = generatePlayerToken()

  const { data, error } = await supabase
    .from('party_players')
    .insert({ token, name, team, avatar })
    .select('id, token, name, team, avatar, score, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: 'join_failed' }, { status: 500 })
  }

  return NextResponse.json({ player: data })
}
