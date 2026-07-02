'use client'

import { useCallback, useEffect, useState } from 'react'
import QRCode from 'qrcode'

interface TriviaQ {
  id: string; question: string; options: string[]; correct_index: number
  time_limit_seconds: number; status: 'draft' | 'live' | 'closed'
}
interface Prediction {
  id: string; prompt: string; unit: string | null; status: 'draft' | 'live' | 'closed'; actual_value: number | null
}
interface Mission { id: string; prompt: string; status: 'draft' | 'live' | 'closed' }
interface AdminPhoto { id: string; mission_id: string; url: string; vote_count: number; approved: boolean; player_name: string }
interface Overview {
  totalPlayers: number
  leaderboard: { name: string; team: string | null; avatar: string; score: number }[]
  triviaQuestions: TriviaQ[]
  predictions: Prediction[]
  photoMissions: Mission[]
  photos: AdminPhoto[]
}

export default function PartyAdminPage() {
  const [passcode, setPasscode] = useState<string | null>(null)
  const [passInput, setPassInput] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('party_admin_passcode')
    if (stored) setPasscode(stored)
  }, [])

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/party/admin/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode: passInput }),
    })
    if (res.ok) {
      sessionStorage.setItem('party_admin_passcode', passInput)
      setPasscode(passInput)
    } else {
      setAuthError('Wrong passcode')
    }
  }

  if (!passcode) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
        <form onSubmit={verify} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow">
          <h1 className="text-xl font-bold">Party admin</h1>
          <input
            type="password"
            value={passInput}
            onChange={(e) => setPassInput(e.target.value)}
            placeholder="Admin passcode"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
          {authError && <p className="text-sm text-red-600">{authError}</p>}
          <button className="w-full rounded-lg bg-slate-900 py-2 font-semibold text-white">Enter</button>
        </form>
      </div>
    )
  }

  return <AdminConsole passcode={passcode} />
}

function AdminConsole({ passcode }: { passcode: string }) {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [joinUrl, setJoinUrl] = useState('')

  const refresh = useCallback(async () => {
    const res = await fetch('/api/party/admin/overview', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode }),
    })
    if (res.ok) setOverview(await res.json())
  }, [passcode])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [refresh])

  useEffect(() => {
    const url = `${window.location.origin}/party`
    setJoinUrl(url)
    QRCode.toDataURL(url, { width: 320, margin: 1 }).then(setQr)
  }, [])

  if (!overview) return <div className="p-6">Loading…</div>

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-black">🎉 Party admin console</h1>
        <p className="text-sm text-slate-500">{overview.totalPlayers} players joined</p>
      </header>

      <section className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
          <p className="mb-2 font-semibold">Scan to join</p>
          {qr && <img src={qr} alt="Join QR code" className="mx-auto" />}
          <p className="mt-2 break-all text-xs text-slate-500">{joinUrl}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-2 font-semibold">Live leaderboard (top 5)</p>
          <ol className="space-y-1 text-sm">
            {overview.leaderboard.slice(0, 5).map((r, i) => (
              <li key={i} className="flex justify-between">
                <span>{i + 1}. {r.avatar} {r.name}{r.team ? ` · ${r.team}` : ''}</span>
                <span className="font-bold">{r.score}</span>
              </li>
            ))}
            {overview.leaderboard.length === 0 && <li className="text-slate-400">No scores yet</li>}
          </ol>
        </div>
      </section>

      <TriviaSection passcode={passcode} questions={overview.triviaQuestions} onChange={refresh} />
      <PredictionSection passcode={passcode} predictions={overview.predictions} onChange={refresh} />
      <PhotoSection passcode={passcode} missions={overview.photoMissions} photos={overview.photos} onChange={refresh} />
    </div>
  )
}

// ------------------------------------------------------------
function SectionShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-bold">{title}</h2>
      {children}
    </section>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600', live: 'bg-emerald-100 text-emerald-700', closed: 'bg-slate-200 text-slate-500',
  }
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${colors[status]}`}>{status}</span>
}

// ------------------------------------------------------------
function TriviaSection({ passcode, questions, onChange }: {
  passcode: string; questions: TriviaQ[]; onChange: () => void
}) {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', '', '', ''])
  const [correctIndex, setCorrectIndex] = useState(0)
  const [timeLimit, setTimeLimit] = useState(20)
  const [saving, setSaving] = useState(false)

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!question.trim() || options.some((o) => !o.trim())) return
    setSaving(true)
    await fetch('/api/party/admin/trivia', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode, question, options, correctIndex, timeLimitSeconds: timeLimit, orderIndex: questions.length }),
    })
    setQuestion(''); setOptions(['', '', '', '']); setCorrectIndex(0); setSaving(false)
    onChange()
  }

  async function setStatus(id: string, status: string) {
    await fetch('/api/party/admin/trivia/status', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode, questionId: id, status }),
    })
    onChange()
  }

  return (
    <SectionShell title="🧠 Trivia">
      <ul className="mb-4 space-y-2">
        {questions.map((q) => (
          <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 p-3">
            <div>
              <p className="font-medium">{q.question}</p>
              <StatusBadge status={q.status} />
            </div>
            <div className="flex gap-2">
              {q.status !== 'live' && <button onClick={() => setStatus(q.id, 'live')} className="rounded-lg bg-emerald-600 px-3 py-1 text-sm font-semibold text-white">Go live</button>}
              {q.status === 'live' && <button onClick={() => setStatus(q.id, 'closed')} className="rounded-lg bg-slate-600 px-3 py-1 text-sm font-semibold text-white">Close</button>}
            </div>
          </li>
        ))}
        {questions.length === 0 && <p className="text-sm text-slate-400">No questions yet — add one below.</p>}
      </ul>

      <form onSubmit={create} className="space-y-2 border-t border-slate-100 pt-4">
        <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Question"
          className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        {options.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="radio" checked={correctIndex === i} onChange={() => setCorrectIndex(i)} />
            <input
              value={o}
              onChange={(e) => setOptions((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
              placeholder={`Option ${i + 1}`}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
        ))}
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500">Time limit (s)</label>
          <input type="number" value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))}
            className="w-20 rounded-lg border border-slate-300 px-2 py-1" />
        </div>
        <button disabled={saving} className="rounded-lg bg-fuchsia-600 px-4 py-2 font-semibold text-white disabled:opacity-60">
          Add question
        </button>
      </form>
    </SectionShell>
  )
}

// ------------------------------------------------------------
function PredictionSection({ passcode, predictions, onChange }: {
  passcode: string; predictions: Prediction[]; onChange: () => void
}) {
  const [prompt, setPrompt] = useState('')
  const [unit, setUnit] = useState('')
  const [actualInputs, setActualInputs] = useState<Record<string, string>>({})

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!prompt.trim()) return
    await fetch('/api/party/admin/predictions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode, prompt, unit, orderIndex: predictions.length }),
    })
    setPrompt(''); setUnit(''); onChange()
  }

  async function setStatus(id: string, status: string) {
    await fetch('/api/party/admin/predictions/status', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode, predictionId: id, status }),
    })
    onChange()
  }

  async function resolve(id: string) {
    const actual = Number(actualInputs[id])
    if (Number.isNaN(actual)) return
    await fetch('/api/party/admin/predictions/resolve', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode, predictionId: id, actual }),
    })
    onChange()
  }

  return (
    <SectionShell title="🔮 Predictions">
      <ul className="mb-4 space-y-2">
        {predictions.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 p-3">
            <div>
              <p className="font-medium">{p.prompt}{p.unit ? ` (${p.unit})` : ''}</p>
              <StatusBadge status={p.status} />
              {p.actual_value !== null && <span className="ml-2 text-xs text-slate-500">Actual: {p.actual_value}</span>}
            </div>
            <div className="flex items-center gap-2">
              {p.status === 'draft' && <button onClick={() => setStatus(p.id, 'live')} className="rounded-lg bg-emerald-600 px-3 py-1 text-sm font-semibold text-white">Go live</button>}
              {p.status === 'live' && (
                <>
                  <input
                    type="number" step="any" placeholder="Actual value"
                    value={actualInputs[p.id] ?? ''}
                    onChange={(e) => setActualInputs((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    className="w-28 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                  />
                  <button onClick={() => resolve(p.id)} className="rounded-lg bg-fuchsia-600 px-3 py-1 text-sm font-semibold text-white">Resolve & score</button>
                </>
              )}
            </div>
          </li>
        ))}
        {predictions.length === 0 && <p className="text-sm text-slate-400">No predictions yet — add one below.</p>}
      </ul>

      <form onSubmit={create} className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Prompt, e.g. How many guests by 11pm?"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2" />
        <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit (optional)"
          className="w-32 rounded-lg border border-slate-300 px-3 py-2" />
        <button className="rounded-lg bg-fuchsia-600 px-4 py-2 font-semibold text-white">Add</button>
      </form>
    </SectionShell>
  )
}

// ------------------------------------------------------------
function PhotoSection({ passcode, missions, photos, onChange }: {
  passcode: string; missions: Mission[]; photos: AdminPhoto[]; onChange: () => void
}) {
  const [prompt, setPrompt] = useState('')

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!prompt.trim()) return
    await fetch('/api/party/admin/photo-missions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode, prompt, orderIndex: missions.length }),
    })
    setPrompt(''); onChange()
  }

  async function setStatus(id: string, status: string) {
    await fetch('/api/party/admin/photo-missions/status', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode, missionId: id, status }),
    })
    onChange()
  }

  async function moderate(id: string, approved: boolean) {
    await fetch('/api/party/admin/photos/moderate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode, photoId: id, approved }),
    })
    onChange()
  }

  return (
    <SectionShell title="📸 Photo missions">
      <ul className="mb-4 space-y-2">
        {missions.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 p-3">
            <div>
              <p className="font-medium">{m.prompt}</p>
              <StatusBadge status={m.status} />
            </div>
            <div className="flex gap-2">
              {m.status !== 'live' && <button onClick={() => setStatus(m.id, 'live')} className="rounded-lg bg-emerald-600 px-3 py-1 text-sm font-semibold text-white">Go live</button>}
              {m.status === 'live' && <button onClick={() => setStatus(m.id, 'closed')} className="rounded-lg bg-slate-600 px-3 py-1 text-sm font-semibold text-white">Close</button>}
            </div>
          </li>
        ))}
        {missions.length === 0 && <p className="text-sm text-slate-400">No missions yet — add one below.</p>}
      </ul>

      <form onSubmit={create} className="mb-6 flex gap-2 border-t border-slate-100 pt-4">
        <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Mission, e.g. Best sunset pose"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2" />
        <button className="rounded-lg bg-fuchsia-600 px-4 py-2 font-semibold text-white">Add</button>
      </form>

      {photos.length > 0 && (
        <div>
          <p className="mb-2 font-semibold">Moderation ({photos.length} photos)</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {photos.map((p) => (
              <div key={p.id} className="overflow-hidden rounded-xl border border-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="aspect-square w-full object-cover" />
                <div className="p-2 text-xs">
                  <p className="truncate font-medium">{p.player_name}</p>
                  <p className="text-slate-500">❤️ {p.vote_count}</p>
                  <button
                    onClick={() => moderate(p.id, !p.approved)}
                    className={`mt-1 w-full rounded px-2 py-1 font-semibold ${p.approved ? 'bg-slate-100 text-slate-600' : 'bg-red-100 text-red-700'}`}
                  >
                    {p.approved ? 'Hide' : 'Hidden — restore'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </SectionShell>
  )
}
