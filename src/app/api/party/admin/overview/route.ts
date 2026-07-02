import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/party/admin-client'
import { isValidAdminPasscode } from '@/lib/party/server-helpers'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!isValidAdminPasscode(body?.passcode)) return NextResponse.json({ error: 'forbidden' }, { status: 401 })

  const supabase = createAdminClient()

  const [
    { count: totalPlayers },
    { data: top },
    { data: triviaQuestions },
    { data: predictions },
    { data: photoMissions },
    { data: photos },
  ] = await Promise.all([
    supabase.from('party_players').select('id', { count: 'exact', head: true }),
    supabase.from('party_players').select('name, team, avatar, score')
      .order('score', { ascending: false }).order('created_at', { ascending: true }).limit(10),
    supabase.from('party_trivia_questions').select('*').order('order_index', { ascending: true }),
    supabase.from('party_predictions').select('*').order('order_index', { ascending: true }),
    supabase.from('party_photo_missions').select('*').order('order_index', { ascending: true }),
    supabase.from('party_photos')
      .select('id, mission_id, storage_path, vote_count, approved, party_players(name)')
      .order('created_at', { ascending: false }),
  ])

  const photosOut = (photos ?? []).map((p: any) => ({
    id: p.id,
    mission_id: p.mission_id,
    url: supabase.storage.from('party-photos').getPublicUrl(p.storage_path).data.publicUrl,
    vote_count: p.vote_count,
    approved: p.approved,
    player_name: p.party_players?.name ?? 'Guest',
  }))

  return NextResponse.json({
    totalPlayers: totalPlayers ?? 0,
    leaderboard: top ?? [],
    triviaQuestions: triviaQuestions ?? [],
    predictions: predictions ?? [],
    photoMissions: photoMissions ?? [],
    photos: photosOut,
  })
}
