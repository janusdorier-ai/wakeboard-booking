'use client'

import { useEffect, useRef, useState } from 'react'
import { QUESTIONS } from './questions'

const TIMER_SECONDS = 20
const BASE_POINTS = 100
const STREAK_BONUS = 50   // à partir de 3 bonnes réponses d'affilée

interface ScoreEntry { name: string; score: number }

const RANKS: { min: number; title: string; emoji: string }[] = [
  { min: 2200, title: 'Légende de la Nati',      emoji: '🐐' },
  { min: 1600, title: 'Capitaine du kop',         emoji: '🔴⚪' },
  { min: 1000, title: 'Vrai supporter',           emoji: '🎺' },
  { min: 500,  title: 'Supporter du dimanche',    emoji: '🛋️' },
  { min: 0,    title: 'Touriste à la plage',      emoji: '🏖️' },
]

type Phase = 'start' | 'playing' | 'reveal' | 'done'

export function QuizClient() {
  const [phase, setPhase] = useState<Phase>('start')
  const [playerName, setPlayerName] = useState('')
  const [qIndex, setQIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)   // null = temps écoulé
  const [lastGain, setLastGain] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS)
  const [board, setBoard] = useState<ScoreEntry[]>([])
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const q = QUESTIONS[qIndex]
  const isNewCup = qIndex === 0 || QUESTIONS[qIndex - 1].cup !== q.cup

  useEffect(() => {
    try { setBoard(JSON.parse(localStorage.getItem('nati-quiz-board') ?? '[]')) } catch {}
  }, [])

  useEffect(() => {
    if (phase !== 'playing') return
    tickRef.current = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000)
    return () => { if (tickRef.current) clearInterval(tickRef.current) }
  }, [phase, qIndex])

  // Temps écoulé → réponse vide (hors du callback d'interval pour rester
  // compatible StrictMode : pas de setState imbriqué dans un updater)
  useEffect(() => {
    if (phase === 'playing' && timeLeft === 0) answer(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeft])

  function start() {
    setQIndex(0); setScore(0); setStreak(0); setCorrectCount(0)
    setTimeLeft(TIMER_SECONDS); setPicked(null); setLastGain(0)
    setPhase('playing')
  }

  function answer(choice: number | null) {
    if (tickRef.current) clearInterval(tickRef.current)
    setPicked(choice)

    let gain = 0
    if (choice === q.answer) {
      const newStreak = streak + 1
      gain = BASE_POINTS + timeLeft * 5 + (newStreak >= 3 ? STREAK_BONUS : 0)
      setStreak(newStreak)
      setCorrectCount(c => c + 1)
      setScore(s => s + gain)
    } else {
      setStreak(0)
    }
    setLastGain(gain)
    setPhase('reveal')
  }

  function next() {
    if (qIndex + 1 >= QUESTIONS.length) {
      const entry = { name: playerName.trim() || 'Anonyme', score }
      const newBoard = [...board, entry].sort((a, b) => b.score - a.score).slice(0, 10)
      setBoard(newBoard)
      try { localStorage.setItem('nati-quiz-board', JSON.stringify(newBoard)) } catch {}
      setPhase('done')
      return
    }
    setQIndex(i => i + 1)
    setPicked(null)
    setTimeLeft(TIMER_SECONDS)
    setPhase('playing')
  }

  function nextPlayer() {
    setPlayerName('')
    setPhase('start')
  }

  const rank = RANKS.find(r => score >= r.min) ?? RANKS[RANKS.length - 1]

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#8c0d0d]">
      {/* Fond : dégradé rouge suisse + croix décoratives */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#d81e1e] via-[#a31414] to-[#5c0808] pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none select-none text-white text-7xl leading-none tracking-widest overflow-hidden">
        {'➕ '.repeat(400)}
      </div>

      <div className="relative max-w-md mx-auto px-5 py-8 min-h-screen flex flex-col">

        {/* ═══════════ ÉCRAN D'ACCUEIL ═══════════ */}
        {phase === 'start' && (
          <div className="flex-1 flex flex-col justify-center text-center">
            <div className="text-6xl mb-4">🇨🇭⚽</div>
            <h1 className="font-display text-4xl font-black text-white leading-tight">
              Quiz de la <span className="text-yellow-300">Nati</span>
            </h1>
            <p className="mt-3 text-red-100/90 text-sm leading-relaxed">
              La Suisse aux 4 dernières Coupes du Monde&nbsp;:<br />
              🇿🇦 2010 · 🇧🇷 2014 · 🇷🇺 2018 · 🇶🇦 2022
            </p>
            <p className="mt-2 font-mono text-[11px] text-red-200/70 tracking-wide">
              12 questions · {TIMER_SECONDS}s chrono · bonus vitesse & série
            </p>

            <input
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              maxLength={20}
              placeholder="Ton prénom…"
              className="mt-8 w-full bg-white/10 border-2 border-white/30 rounded-xl px-4 py-3.5 text-center text-lg text-white placeholder:text-red-200/50 focus:border-yellow-300 focus:outline-none"
              onKeyDown={e => { if (e.key === 'Enter' && playerName.trim()) start() }}
            />
            <button
              onClick={start}
              disabled={!playerName.trim()}
              className="mt-3 w-full py-4 bg-yellow-300 text-red-900 rounded-xl font-black text-lg tracking-wide shadow-lg shadow-black/30 transition active:scale-[0.98] disabled:opacity-40">
              HOPP SCHWIIZ ! 🎺
            </button>

            {board.length > 0 && (
              <div className="mt-8 bg-black/25 rounded-2xl p-4 text-left">
                <div className="font-mono text-[10px] tracking-[0.3em] text-yellow-300/80 mb-3 text-center">
                  🏆 CLASSEMENT DE LA TABLE
                </div>
                <ol className="space-y-1.5">
                  {board.map((e, i) => (
                    <li key={i} className="flex justify-between font-mono text-sm text-white/90">
                      <span>{['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`} {e.name}</span>
                      <span className="text-yellow-300 font-bold tabular-nums">{e.score}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {/* ═══════════ QUESTION / RÉVÉLATION ═══════════ */}
        {(phase === 'playing' || phase === 'reveal') && (
          <div className="flex-1 flex flex-col">
            {/* Barre du haut : progression + score */}
            <div className="flex items-center justify-between font-mono text-xs text-white/80">
              <span>Q{qIndex + 1}/{QUESTIONS.length}</span>
              <span className="flex items-center gap-2">
                {streak >= 3 && <span className="text-yellow-300">🔥×{streak}</span>}
                <span className="text-yellow-300 font-bold text-base tabular-nums">{score} pts</span>
              </span>
            </div>

            {/* Manche */}
            <div className={`mt-4 text-center ${isNewCup && phase === 'playing' ? 'animate-pulse' : ''}`}>
              <span className="inline-block bg-black/25 rounded-full px-4 py-1.5 font-mono text-[11px] tracking-[0.2em] text-white">
                {q.flag} {q.cup.toUpperCase()}
              </span>
            </div>

            {/* Chrono */}
            <div className="mt-4 h-2.5 bg-black/25 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                  timeLeft <= 5 ? 'bg-yellow-300' : 'bg-white'
                }`}
                style={{ width: `${(timeLeft / TIMER_SECONDS) * 100}%` }}
              />
            </div>
            {phase === 'playing' && (
              <div className={`mt-1 text-center font-mono text-xs tabular-nums ${timeLeft <= 5 ? 'text-yellow-300 font-bold' : 'text-white/60'}`}>
                {timeLeft}s
              </div>
            )}

            {/* Question */}
            <h2 className="mt-5 font-display text-xl font-bold text-white leading-snug">
              {q.question}
            </h2>

            {/* Choix */}
            <div className="mt-5 flex flex-col gap-2.5">
              {q.choices.map((c, i) => {
                let style = 'bg-white/10 border-white/25 text-white active:scale-[0.98]'
                if (phase === 'reveal') {
                  if (i === q.answer)      style = 'bg-emerald-400/90 border-emerald-300 text-emerald-950 font-bold'
                  else if (i === picked)   style = 'bg-black/40 border-red-300/60 text-red-200 line-through'
                  else                     style = 'bg-white/5 border-white/10 text-white/40'
                }
                return (
                  <button
                    key={i}
                    disabled={phase === 'reveal'}
                    onClick={() => answer(i)}
                    className={`text-left px-4 py-3.5 rounded-xl border-2 text-[15px] leading-snug transition ${style}`}>
                    <span className="font-mono font-bold mr-2 opacity-70">{'ABCD'[i]}</span>
                    {c}
                  </button>
                )
              })}
            </div>

            {/* Révélation : gain + anecdote + suivant */}
            {phase === 'reveal' && (
              <div className="mt-4">
                <div className="text-center font-display text-lg font-black">
                  {picked === q.answer ? (
                    <span className="text-yellow-300">✅ +{lastGain} pts {streak >= 3 && '· EN FEU 🔥'}</span>
                  ) : picked === null ? (
                    <span className="text-white/80">⏰ Temps écoulé !</span>
                  ) : (
                    <span className="text-white/80">❌ Raté !</span>
                  )}
                </div>
                <div className="mt-3 bg-black/25 rounded-2xl p-4">
                  <div className="font-mono text-[10px] tracking-[0.3em] text-yellow-300/80 mb-1.5">
                    💡 LE SAVIEZ-VOUS ?
                  </div>
                  <p className="text-sm text-white/90 leading-relaxed">{q.fact}</p>
                </div>
                <button
                  onClick={next}
                  className="mt-4 w-full py-4 bg-yellow-300 text-red-900 rounded-xl font-black text-base tracking-wide shadow-lg shadow-black/30 transition active:scale-[0.98]">
                  {qIndex + 1 >= QUESTIONS.length ? 'VOIR MON SCORE 🏆' : 'QUESTION SUIVANTE →'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══════════ ÉCRAN FINAL ═══════════ */}
        {phase === 'done' && (
          <div className="flex-1 flex flex-col justify-center text-center">
            <div className="text-6xl">{rank.emoji}</div>
            <div className="mt-3 font-mono text-[11px] tracking-[0.3em] text-red-200/80">
              {playerName.trim().toUpperCase() || 'ANONYME'}, TU ES…
            </div>
            <h2 className="mt-1 font-display text-3xl font-black text-yellow-300">{rank.title}</h2>
            <div className="mt-5 font-display text-6xl font-black text-white tabular-nums">{score}</div>
            <div className="font-mono text-xs text-red-200/80 mt-1">
              points · {correctCount}/{QUESTIONS.length} bonnes réponses
            </div>

            <div className="mt-7 bg-black/25 rounded-2xl p-4 text-left">
              <div className="font-mono text-[10px] tracking-[0.3em] text-yellow-300/80 mb-3 text-center">
                🏆 CLASSEMENT DE LA TABLE
              </div>
              <ol className="space-y-1.5">
                {board.map((e, i) => (
                  <li key={i} className={`flex justify-between font-mono text-sm ${
                    e.name === (playerName.trim() || 'Anonyme') && e.score === score
                      ? 'text-yellow-300 font-bold' : 'text-white/90'
                  }`}>
                    <span>{['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`} {e.name}</span>
                    <span className="tabular-nums">{e.score}</span>
                  </li>
                ))}
              </ol>
            </div>

            <button
              onClick={nextPlayer}
              className="mt-5 w-full py-4 bg-yellow-300 text-red-900 rounded-xl font-black text-base tracking-wide shadow-lg shadow-black/30 transition active:scale-[0.98]">
              JOUEUR SUIVANT 📱→
            </button>
            <button
              onClick={start}
              className="mt-2.5 w-full py-3 border-2 border-white/30 text-white rounded-xl font-bold text-sm transition active:scale-[0.98]">
              Rejouer ({playerName.trim() || 'même joueur'})
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
