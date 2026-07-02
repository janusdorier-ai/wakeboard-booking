import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/party/admin-client'
import { PHOTO_VOTE_POINTS } from '@/lib/party/scoring'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const { token, photoId } = body ?? {}
  if (!token || !photoId) return NextResponse.json({ error: 'invalid_request' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: voter } = await supabase
    .from('party_players').select('id').eq('token', token).maybeSingle()
  if (!voter) return NextResponse.json({ error: 'invalid_token' }, { status: 401 })

  const { data: photo } = await supabase
    .from('party_photos').select('id, player_id').eq('id', photoId).maybeSingle()
  if (!photo) return NextResponse.json({ error: 'photo_not_found' }, { status: 404 })
  if (photo.player_id === voter.id) {
    return NextResponse.json({ error: 'cannot_vote_own_photo' }, { status: 400 })
  }

  const { error } = await supabase
    .from('party_photo_votes')
    .insert({ photo_id: photoId, voter_id: voter.id })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ ok: true, alreadyVoted: true })
    return NextResponse.json({ error: 'vote_failed' }, { status: 500 })
  }

  await supabase.rpc('increment_party_score', { p_player_id: photo.player_id, p_delta: PHOTO_VOTE_POINTS })
  await supabase.rpc('increment_party_photo_votes', { p_photo_id: photoId })

  return NextResponse.json({ ok: true, alreadyVoted: false })
}
