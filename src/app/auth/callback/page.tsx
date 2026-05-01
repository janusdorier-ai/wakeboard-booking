'use client'
import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <CallbackHandler />
    </Suspense>
  )
}

function CallbackHandler() {
  const router  = useRouter()
  const params  = useSearchParams()

  useEffect(() => {
    const supabase = createClient()
    const code     = params.get('code')
    const next     = params.get('next') ?? '/book'

    async function finish() {
      if (code) {
        // PKCE flow — exchange the one-time code for a session
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          router.replace('/login?error=auth')
          return
        }
      }
      // Implicit flow: createBrowserClient automatically picks up
      // access_token / refresh_token from the URL hash — no extra work needed.
      // Either way, wait a tick then check we actually have a session.
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace(next)
      } else {
        router.replace('/login?error=auth')
      }
    }

    finish()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <Spinner />
}

function Spinner() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center font-mono text-cnv-navy">
      <div className="text-center">
        <div className="text-[10px] tracking-[0.3em] text-cnv-navy/60 animate-pulse">▸ SIGNING_IN…</div>
      </div>
    </div>
  )
}
