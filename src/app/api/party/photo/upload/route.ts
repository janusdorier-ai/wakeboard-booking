import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createAdminClient } from '@/lib/party/admin-client'
import { PHOTO_SUBMIT_POINTS } from '@/lib/party/scoring'

const MAX_BYTES = 8 * 1024 * 1024

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'invalid_request' }, { status: 400 })

  const token = form.get('token')
  const missionId = form.get('missionId')
  const file = form.get('file')

  if (typeof token !== 'string' || typeof missionId !== 'string' || !(file instanceof File)) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'not_an_image' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'file_too_large' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: player } = await supabase
    .from('party_players').select('id').eq('token', token).maybeSingle()
  if (!player) return NextResponse.json({ error: 'invalid_token' }, { status: 401 })

  const { data: mission } = await supabase
    .from('party_photo_missions').select('status').eq('id', missionId).maybeSingle()
  if (!mission || mission.status !== 'live') {
    return NextResponse.json({ error: 'mission_not_live' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('party_photos').select('id').eq('mission_id', missionId).eq('player_id', player.id).maybeSingle()
  if (existing) return NextResponse.json({ error: 'already_submitted' }, { status: 409 })

  const ext = (file.type.split('/')[1] || 'jpg').replace(/[^a-z0-9]/gi, '')
  const path = `${missionId}/${player.id}-${randomUUID()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('party-photos')
    .upload(path, buffer, { contentType: file.type, upsert: false })
  if (uploadError) return NextResponse.json({ error: 'upload_failed' }, { status: 500 })

  const { data: photo, error: insertError } = await supabase
    .from('party_photos')
    .insert({ mission_id: missionId, player_id: player.id, storage_path: path })
    .select('id')
    .single()
  if (insertError) return NextResponse.json({ error: 'save_failed' }, { status: 500 })

  await supabase.rpc('increment_party_score', { p_player_id: player.id, p_delta: PHOTO_SUBMIT_POINTS })

  return NextResponse.json({ photoId: photo.id, points: PHOTO_SUBMIT_POINTS })
}
