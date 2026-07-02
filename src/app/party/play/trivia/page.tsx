'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { getStoredToken } from '@/lib/party/client'
import { GuestShell } from '@/components/party/GuestShell'
import { CLIENT_THEME } from '@/lib/party/client-config'

interface Question {
  id: string
  question: string
  options: string[]
  time_limit_seconds: number
  opened_at: string
}
interface MyAnswer { selected_index: number; correct: boolean; points: number }

export default function TriviaPage() {
  const token = useRef(getStoredToken())
  const [question, setQuestion] = useState<Question | null>(null)
  const [myAnswer, setMyAnswer] = useState<MyAnswer | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [remaining, setRemaining] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function poll() {
      const t = token.current
      const res = await fetch(`/api/party/trivia/current${t ? `?token=${encodeURIComponent(t)}` : ''}`)
      const data = await res.json()
      if (cancelled) return
      setQuestion((prev) => {
        if (data.question?.id !== prev?.id) setSelected(null)
        return data.question
      })
      setMyAnswer(data.myAnswer)
      setLoading(false)
    }
    poll()
    const id = setInterval(poll, 3000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  useEffect(() => {
    if (!question) return
    const tick = () => {
      const elapsed = (Date.now() - new Date(question.opened_at).getTime()) / 1000
      setRemaining(Math.max(0, Math.ceil(question.time_limit_seconds - elapsed)))
    }
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [question])

  async function submit(index: number) {
    if (!question || !token.current || submitting || myAnswer) return
    setSelected(index)
    setSubmitting(true)
    const res = await fetch('/api/party/trivia/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.current, questionId: question.id, selectedIndex: index }),
    })
    const data = await res.json()
    setMyAnswer(data)
    setSubmitting(false)
  }

  return (
    <GuestShell>
    <div className="space-y-6">
      <Link href="/party/play" className="inline-block text-sm font-semibold text-white/90">← Back</Link>
      <h1 className="text-center text-2xl font-black text-white drop-shadow">{CLIENT_THEME.games.trivia.icon} {CLIENT_THEME.games.trivia.title}</h1>

      {loading && <Card><p className="text-center text-slate-500">Loading…</p></Card>}

      {!loading && !question && (
        <Card>
          <p className="text-center text-lg font-semibold text-slate-700">No question live right now 👀</p>
          <p className="mt-1 text-center text-sm text-slate-500">Hang tight — the host will launch the next one soon.</p>
        </Card>
      )}

      {question && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--party-accent)]">Question</span>
            <span className={`text-lg font-black ${remaining <= 5 ? 'text-red-600' : 'text-slate-700'}`}>{remaining}s</span>
          </div>
          <p className="mb-5 text-lg font-bold text-slate-900">{question.question}</p>
          <div className="space-y-2">
            {question.options.map((opt, i) => {
              const isMine = myAnswer && myAnswer.selected_index === i
              const showResult = !!myAnswer
              return (
                <button
                  key={i}
                  disabled={!!myAnswer || remaining === 0 || submitting}
                  onClick={() => submit(i)}
                  className={`w-full rounded-xl border-2 px-4 py-3 text-left font-medium transition ${
                    showResult
                      ? isMine
                        ? myAnswer!.correct ? 'border-emerald-500 bg-emerald-50' : 'border-red-500 bg-red-50'
                        : 'border-slate-200 opacity-60'
                      : selected === i
                        ? 'border-[var(--party-accent)] bg-[color-mix(in_srgb,var(--party-accent)_8%,white)]'
                        : 'border-slate-200 hover:border-[color-mix(in_srgb,var(--party-accent)_40%,white)]'
                  }`}
                >
                  {opt}
                </button>
              )
            })}
          </div>
          {myAnswer && (
            <p className="mt-4 text-center text-lg font-bold">
              {myAnswer.correct ? `🎉 Correct! +${myAnswer.points} pts` : '❌ Not quite — 0 pts'}
            </p>
          )}
          {!myAnswer && remaining === 0 && (
            <p className="mt-4 text-center text-lg font-bold text-slate-500">⏱ Time's up!</p>
          )}
        </Card>
      )}
    </div>
    </GuestShell>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-3xl bg-white/95 p-6 shadow-xl">{children}</div>
}
