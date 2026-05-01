'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CnvMark } from '@/components/CnvMark'

export default function LoginPage() {
  return (
    <Suspense fallback={<Shell><div className="text-slate-500 font-mono text-xs">▸ LOADING</div></Shell>}>
      <AuthForm />
    </Suspense>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50 text-cnv-navy relative overflow-hidden flex items-center">
      <div className="absolute inset-0 cnv-grid pointer-events-none" />
      <div className="absolute inset-0 cnv-grid-lines pointer-events-none" />
      <div className="relative mx-auto max-w-md p-6 w-full">
        <Link href="/" className="inline-flex items-center gap-3">
          <CnvMark className="h-12 w-auto" />
          <div>
            <div className="font-mono text-[10px] tracking-[0.3em] text-cnv-navy/70">SKI ▸ WAKEBOARD</div>
            <div className="text-sm font-bold">Booking Console</div>
          </div>
        </Link>
        <div className="mt-8">{children}</div>
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
  const [name, setName]   = useState('')
  const [sent, setSent]   = useState(false)
  const [err, setErr]     = useState<string | null>(null)
  const [busy, setBusy]   = useState(false)

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
      {/* Mode toggle */}
      <div className="grid grid-cols-2 border border-slate-200 bg-white mb-6">
        <button onClick={() => switchMode('signin')}
          className={`py-2.5 text-xs font-mono font-bold tracking-widest transition ${
            !isSignup ? 'bg-cnv-navy text-white' : 'text-slate-500 hover:text-cnv-navy'
          }`}>
          SIGN IN
        </button>
        <button onClick={() => switchMode('signup')}
          className={`py-2.5 text-xs font-mono font-bold tracking-widest transition ${
            isSignup ? 'bg-cnv-navy text-white' : 'text-slate-500 hover:text-cnv-navy'
          }`}>
          CREATE ACCOUNT
        </button>
      </div>

      {isSignup ? (
        <>
          <h1 className="text-2xl font-bold">New here?</h1>
          <p className="text-sm text-slate-600 mt-1">
            Enter your name and email. We'll send you a link — click it and your account is ready.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold">Welcome back.</h1>
          <p className="text-sm text-slate-600 mt-1">
            Enter your email and we'll send you a one-click sign-in link. No password needed.
          </p>
        </>
      )}

      {sent ? (
        <div className="mt-6 border border-emerald-400 bg-emerald-50 p-4 font-mono text-emerald-800">
          <div className="text-sm font-bold">Check your inbox.</div>
          <div className="text-xs mt-1 text-emerald-700">
            We sent a link to <span className="font-bold">{email}</span>. Tap it to {isSignup ? 'activate your account' : 'sign in'}.
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3">
          {isSignup && (
            <label className="text-[10px] font-mono tracking-widest text-slate-500">
              YOUR NAME
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
                className="mt-1 w-full bg-white border border-slate-300 px-3 py-2.5 text-cnv-navy placeholder-slate-400 focus:outline-none focus:border-cnv-navy font-mono text-sm"
                placeholder="Alex Waker"
              />
            </label>
          )}
          <label className="text-[10px] font-mono tracking-widest text-slate-500">
            EMAIL ADDRESS
            <input
              required type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus={!isSignup}
              className="mt-1 w-full bg-white border border-slate-300 px-3 py-2.5 text-cnv-navy placeholder-slate-400 focus:outline-none focus:border-cnv-navy font-mono text-sm"
              placeholder="you@example.com"
            />
          </label>

          <button disabled={busy}
            className="mt-2 bg-cnv-navy text-white py-3 font-mono font-bold tracking-widest hover:bg-cnv-navy-3 disabled:opacity-40">
            {busy
              ? '▸ SENDING…'
              : isSignup
                ? '▸ CREATE MY ACCOUNT'
                : '▸ SEND SIGN-IN LINK'}
          </button>

          {err && <p className="text-red-700 text-xs font-mono mt-1">▸ {err}</p>}

          <p className="text-center text-[10px] font-mono text-slate-400 tracking-widest mt-1">
            NO PASSWORD · MAGIC LINK · FREE
          </p>
        </form>
      )}
    </Shell>
  )
}
