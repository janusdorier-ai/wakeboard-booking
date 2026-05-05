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
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const supabase = createClient()
    const code     = params.get('code')
    const next     = params.get('next') ?? '/book'

    async function finish() {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          router.replace('/login?error=auth')
          return
        }
      }
      const { data: { session } } = await supabase.auth.getSession()
      if (session) router.replace(next)
      else router.replace('/login?error=auth')
    }

    finish()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <Spinner />
}

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="absolute inset-0 cnv-bg pointer-events-none" />
      <div className="relative text-center font-mono">
        <div className="text-cnv-yellow/80 text-sm font-bold tracking-widest animate-glow">
          ▸
        </div>
        <div className="mt-3 text-[10px] tracking-[0.35em] text-slate-500">
          SIGNING IN
        </div>
      </div>
    </div>
  )
}
