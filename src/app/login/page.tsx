'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CnvMark } from '@/components/CnvMark'

export default function LoginPage() {
  return (
    <Suspense fallback={<Shell><div className="animate-pulse font-mono text-[10px] tracking-widest text-slate-500">Loading…</div></Shell>}>
      <AuthForm />
    </Suspense>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen relative overflow-hidden flex items-center">
      <div className="absolute inset-0 cnv-bg pointer-events-none" />
      <div className="absolute inset-0 cnv-grid-lines pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cnv-yellow/15 to-transparent" />

      <div className="relative w-full max-w-sm mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <CnvMark className="h-9 w-auto opacity-90 group-hover:opacity-100 transition" />
          <div>
            <div className="font-mono text-[9px] tracking-[0.4em] text-cnv-yellow/70">CNV · VERSOIX</div>
            <div className="font-mono text-[9px] tracking-[0.25em] text-slate-500 mt-0.5">WAKEBOARD BOOKING</div>
          </div>
        </Link>
        <div className="mt-10">{children}</div>
      </div>
    </main>
  )
}

function AuthForm() {
  const supabase = createClient()
  const params   = useSearchParams()
  const next     = params.get('next') ?? '/book'
  const [mode, setMode] = useState<'signin' | 'signup'>(
    params.get('mode') === 'signup' ? 'signup' : 'signin'
  )
  const [email, setEmail] = useState('')
  const [name,  setName]  = useState('')
  const [sent,  setSent]  = useState(false)
  const [err,   setErr]   = useState<string | null>(null)
  const [busy,  setBusy]  = useState(false)

  const isSignup = mode === 'signup'

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSignup && !name.trim()) { setErr('Please enter your name.'); return }
    setBusy(true); setErr(null)
    const origin = window.location.origin
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        data: isSignup && name.trim() ? { full_name: name.trim() } : undefined,
      },
    })
    setBusy(false)
    if (error) setErr(error.message); else setSent(true)
  }

  const switchMode = (m: 'signin' | 'signup') => {
    setMode(m); setErr(null); setSent(false)
  }

  return (
    <Shell>
      {/* ── Mode toggle ── */}
      <div className="grid grid-cols-2 border border-white/[0.08] mb-8">
        <button
          onClick={() => switchMode('signin')}
          className={`py-3 text-xs font-mono font-bold tracking-widest transition ${
            !isSignup
              ? 'bg-cnv-yellow text-cnv-navy-4'
              : 'text-slate-500 hover:text-slate-300'
          }`}>
          Sign in
        </button>
        <button
          onClick={() => switchMode('signup')}
          className={`py-3 text-xs font-mono font-bold tracking-widest transition ${
            isSignup
              ? 'bg-cnv-yellow text-cnv-navy-4'
              : 'text-slate-500 hover:text-slate-300'
          }`}>
          Join the club
        </button>
      </div>

      {/* ── Heading ── */}
      {isSignup ? (
        <>
          <h1 className="font-display text-3xl font-black text-white">New here?</h1>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            Drop your name and email. We'll send you a one-click link — no password ever.
          </p>
        </>
      ) : (
        <>
          <h1 className="font-display text-3xl font-black text-white">Welcome back.</h1>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            Enter your email and we'll send you a sign-in link. One tap, you're in.
          </p>
        </>
      )}

      {/* ── Success state ── */}
      {sent ? (
        <div className="mt-7 border border-emerald-400/30 bg-emerald-400/10 p-5">
          <div className="text-emerald-300 font-bold text-sm">Check your inbox.</div>
          <div className="text-emerald-400/80 text-xs mt-1.5 leading-relaxed">
            We sent a link to <span className="font-bold text-emerald-300">{email}</span>.
            {' '}Tap it to {isSignup ? 'activate your account' : 'sign in'}.
          </div>
          <p className="mt-3 text-[10px] font-mono text-slate-500">
            Check spam if it doesn't show up in 60 seconds.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-7 flex flex-col gap-4">
          {isSignup && (
            <div>
              <label className="block font-mono text-[10px] tracking-[0.25em] text-slate-500 mb-1.5">
                YOUR NAME
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
                placeholder="Alex Rider"
                className="w-full bg-white/[0.05] border border-white/[0.12] px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-cnv-yellow/60 focus:bg-white/[0.08] font-mono text-sm transition"
              />
            </div>
          )}
          <div>
            <label className="block font-mono text-[10px] tracking-[0.25em] text-slate-500 mb-1.5">
              EMAIL ADDRESS
            </label>
            <input
              required
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus={!isSignup}
              placeholder="you@example.com"
              className="w-full bg-white/[0.05] border border-white/[0.12] px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-cnv-yellow/60 focus:bg-white/[0.08] font-mono text-sm transition"
            />
          </div>

          <button
            disabled={busy}
            className="mt-1 py-4 bg-cnv-yellow text-cnv-navy-4 font-mono font-bold tracking-widest text-sm hover:shadow-glow-yellow-sm transition disabled:opacity-40 active:scale-[0.99]">
            {busy
              ? '▸ Sending…'
              : isSignup
                ? '▸ Create my account'
                : '▸ Send sign-in link'}
          </button>

          {err && (
            <p className="text-red-400 text-xs font-mono flex items-center gap-2">
              <span className="text-red-500">▸</span> {err}
            </p>
          )}

          <p className="text-center font-mono text-[10px] text-slate-600 tracking-[0.2em]">
            Magic link · No password · Free
          </p>
        </form>
      )}
    </Shell>
  )
}
