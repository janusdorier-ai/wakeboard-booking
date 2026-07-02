import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/party/admin-client'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'token_required' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: player, error } = await supabase
    .from('party_players')
    .select('id, token, name, team, avatar, score, created_at')
    .eq('token', token)
    .maybeSingle()

  if (error || !player) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { count: ahead } = await supabase
    .from('party_players')
    .select('id', { count: 'exact', head: true })
    .or(`score.gt.${player.score},and(score.eq.${player.score},created_at.lt.${player.created_at})`)

  const { count: totalPlayers } = await supabase
    .from('party_players')
    .select('id', { count: 'exact', head: true })

  return NextResponse.json({
    player,
    rank: (ahead ?? 0) + 1,
    totalPlayers: totalPlayers ?? 1,
  })
}
