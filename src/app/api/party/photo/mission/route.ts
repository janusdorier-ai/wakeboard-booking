import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/party/admin-client'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const supabase = createAdminClient()

  const { data: mission } = await supabase
    .from('party_photo_missions')
    .select('id, prompt')
    .eq('status', 'live')
    .order('order_index', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!mission) return NextResponse.json({ mission: null, photos: [] })

  let playerId: string | null = null
  if (token) {
    const { data: player } = await supabase
      .from('party_players').select('id').eq('token', token).maybeSingle()
    playerId = player?.id ?? null
  }

  const { data: photos } = await supabase
    .from('party_photos')
    .select('id, storage_path, vote_count, player_id, party_players(name)')
    .eq('mission_id', mission.id)
    .eq('approved', true)
    .order('vote_count', { ascending: false })

  let myVotes = new Set<string>()
  if (playerId && photos?.length) {
    const { data: votes } = await supabase
      .from('party_photo_votes')
      .select('photo_id')
      .eq('voter_id', playerId)
      .in('photo_id', photos.map((p) => p.id))
    myVotes = new Set((votes ?? []).map((v) => v.photo_id))
  }

  const enriched = (photos ?? []).map((p: any) => ({
    id: p.id,
    url: supabase.storage.from('party-photos').getPublicUrl(p.storage_path).data.publicUrl,
    vote_count: p.vote_count,
    player_name: p.party_players?.name ?? 'Guest',
    is_own: p.player_id === playerId,
    has_voted: myVotes.has(p.id),
  }))

  const myPhoto = enriched.find((p) => p.is_own) ?? null

  return NextResponse.json({ mission, photos: enriched, myPhoto })
}
