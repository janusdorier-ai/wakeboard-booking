import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/party/admin-client'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('party_players')
    .select('id, name, team, avatar, score')
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(10)

  if (error) return NextResponse.json({ error: 'load_failed' }, { status: 500 })

  const { count: totalPlayers } = await supabase
    .from('party_players')
    .select('id', { count: 'exact', head: true })

  let myId: string | null = null
  if (token) {
    const { data: player } = await supabase
      .from('party_players').select('id').eq('token', token).maybeSingle()
    myId = player?.id ?? null
  }

  const top = (data ?? []).map(({ id, ...rest }) => ({ ...rest, is_me: id === myId }))

  return NextResponse.json({ top, totalPlayers: totalPlayers ?? 0 })
}
