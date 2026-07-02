'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { getStoredToken } from '@/lib/party/client'

interface Mission { id: string; prompt: string }
interface Photo { id: string; url: string; vote_count: number; player_name: string; is_own: boolean; has_voted: boolean }

export default function PhotoPage() {
  const token = useRef(getStoredToken())
  const fileInput = useRef<HTMLInputElement>(null)
  const [mission, setMission] = useState<Mission | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [myPhoto, setMyPhoto] = useState<Photo | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [votingId, setVotingId] = useState<string | null>(null)

  async function poll() {
    const t = token.current
    const res = await fetch(`/api/party/photo/mission${t ? `?token=${encodeURIComponent(t)}` : ''}`)
    const data = await res.json()
    setMission(data.mission)
    setPhotos(data.photos ?? [])
    setMyPhoto(data.myPhoto ?? null)
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    async function tick() { if (!cancelled) await poll() }
    tick()
    const id = setInterval(tick, 4000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  async function handleUpload() {
    const file = fileInput.current?.files?.[0]
    if (!file || !mission || !token.current) return
    setUploading(true)
    setError(null)
    const form = new FormData()
    form.append('token', token.current)
    form.append('missionId', mission.id)
    form.append('file', file)
    const res = await fetch('/api/party/photo/upload', { method: 'POST', body: form })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error === 'already_submitted' ? 'You already submitted a photo for this mission!' : 'Upload failed — try again.')
      setUploading(false)
      return
    }
    setUploading(false)
    await poll()
  }

  async function vote(photoId: string) {
    if (!token.current) return
    setVotingId(photoId)
    await fetch('/api/party/photo/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.current, photoId }),
    })
    setVotingId(null)
    await poll()
  }

  return (
    <div className="space-y-6">
      <Link href="/party/play" className="inline-block text-sm font-semibold text-white/90">← Back</Link>
      <h1 className="text-center text-2xl font-black text-white drop-shadow">📸 Photo Mission</h1>

      <div className="rounded-3xl bg-white/95 p-6 shadow-xl">
        {loading && <p className="text-center text-slate-500">Loading…</p>}

        {!loading && !mission && (
          <>
            <p className="text-center text-lg font-semibold text-slate-700">No photo mission live right now 📷</p>
            <p className="mt-1 text-center text-sm text-slate-500">The host will launch one soon.</p>
          </>
        )}

        {mission && (
          <>
            <p className="text-lg font-bold text-slate-900">{mission.prompt}</p>

            {!myPhoto && (
              <div className="mt-4 space-y-3">
                <input ref={fileInput} type="file" accept="image/*" capture="environment"
                  className="block w-full text-sm text-slate-600" />
                {error && <p className="text-sm font-medium text-red-600">{error}</p>}
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full rounded-xl bg-fuchsia-600 py-3 text-lg font-bold text-white shadow-lg hover:bg-fuchsia-700 disabled:opacity-60"
                >
                  {uploading ? 'Uploading…' : 'Submit photo (+25 pts)'}
                </button>
              </div>
            )}

            {myPhoto && (
              <div className="mt-4 rounded-2xl border-2 border-fuchsia-400 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-fuchsia-600">Your submission</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={myPhoto.url} alt="Your submission" className="w-full rounded-xl object-cover" />
                <p className="mt-2 text-center text-sm font-semibold text-slate-600">❤️ {myPhoto.vote_count} votes</p>
              </div>
            )}
          </>
        )}
      </div>

      {mission && photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {photos.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-2xl bg-white/95 shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={`Photo by ${p.player_name}`} className="aspect-square w-full object-cover" />
              <div className="flex items-center justify-between px-3 py-2">
                <span className="truncate text-xs font-medium text-slate-500">{p.player_name}</span>
                <button
                  onClick={() => vote(p.id)}
                  disabled={p.is_own || p.has_voted || votingId === p.id}
                  className={`text-sm font-bold ${p.has_voted ? 'text-fuchsia-600' : 'text-slate-400'} disabled:opacity-60`}
                >
                  ❤️ {p.vote_count}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
