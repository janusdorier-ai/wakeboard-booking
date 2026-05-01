import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CnvMark } from '@/components/CnvMark'

// Always render fresh — page shows auth state
export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let userName: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles').select('full_name').eq('id', user.id).single()
    userName = (profile as { full_name?: string } | null)?.full_name ?? null
  }

  return (
    <main className="min-h-screen bg-slate-50 text-cnv-navy relative overflow-hidden flex items-center">
      <div className="absolute inset-0 cnv-grid pointer-events-none" />
      <div className="absolute inset-0 cnv-grid-lines pointer-events-none" />

      <div className="relative mx-auto max-w-md p-6 w-full">
        <CnvMark className="h-20 w-auto" />
        <div className="font-mono text-[10px] tracking-[0.3em] text-cnv-navy/70 mt-6">SKI ▸ WAKEBOARD ▸ CNV</div>
        <h1 className="text-4xl font-bold mt-2">Find your crew.</h1>
        <p className="mt-3 text-slate-600 text-sm leading-relaxed">
          Drop your availability across AM or PM — slots lock in when two wakers pick the same time.
          See who's already signed up and join their session.
        </p>

        <div className="mt-8 flex flex-col gap-2">
          {user ? (
            <>
              {userName && (
                <div className="font-mono text-xs text-cnv-navy/60 tracking-widest mb-1">
                  ▸ HI, <span className="text-cnv-navy font-bold">{userName.split(' ')[0].toUpperCase()}</span>
                </div>
              )}
              <Link href="/book"
                className="bg-cnv-navy text-white py-3.5 text-center font-mono font-bold tracking-widest hover:bg-cnv-navy-3">
                ▸ OPEN_BOOKING_GRID
              </Link>
              <Link href="/me"
                className="border border-slate-300 bg-white py-3.5 text-center font-mono text-slate-600 tracking-widest hover:text-cnv-navy hover:border-cnv-navy/40">
                [MY_UPCOMING_SLOTS]
              </Link>
            </>
          ) : (
            <>
              <Link href="/login"
                className="bg-cnv-navy text-white py-3.5 text-center font-mono font-bold tracking-widest hover:bg-cnv-navy-3">
                ▸ SIGN_IN_TO_BOOK
              </Link>
              <p className="text-[10px] font-mono text-slate-400 tracking-widest text-center">
                MAGIC_LINK · NO_PASSWORD · FREE
              </p>
            </>
          )}
        </div>

        {/* How it works */}
        <div className="mt-8 border border-slate-200 bg-white p-4">
          <div className="font-mono text-[10px] tracking-[0.3em] text-slate-400 mb-3">▸ HOW_IT_WORKS</div>
          <ol className="space-y-2 text-xs text-slate-600 font-mono list-none">
            <li className="flex gap-2"><span className="text-cnv-navy font-bold">1.</span> Sign in, pick a day and AM / PM session.</li>
            <li className="flex gap-2"><span className="text-cnv-navy font-bold">2.</span> Tap a time slot to hold it — like a Doodle, you can hold several.</li>
            <li className="flex gap-2"><span className="text-cnv-navy font-bold">3.</span> A second waker joins → slot confirms and the boat goes out.</li>
            <li className="flex gap-2"><span className="text-cnv-navy font-bold">4.</span> Within 24h, only slots near existing bookings are shown — keeps sessions clustered.</li>
          </ol>
        </div>

        {/* Color legend */}
        <div className="mt-3 border border-slate-200 bg-white p-4">
          <div className="font-mono text-[10px] tracking-[0.3em] text-slate-400 mb-3">▸ SLOT_STATES</div>
          <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-[10px] font-mono text-slate-600">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 shrink-0 bg-orange-400" />
              <span><b>NEEDS_BUDDY</b> (1/4)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 shrink-0 bg-emerald-500" />
              <span><b>CONFIRMED</b> (2–3/4)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 shrink-0 bg-purple-400" />
              <span><b>FULL</b> (4/4)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 shrink-0 bg-cyan-400" />
              <span><b>CLUSTER_OK</b> (free)</span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 font-mono text-[10px] text-slate-500">
          <div className="border border-slate-200 bg-white p-3">
            <div className="text-cnv-navy text-xl font-bold">02</div>
            <div className="tracking-widest">MIN_CREW</div>
          </div>
          <div className="border border-slate-200 bg-white p-3">
            <div className="text-cnv-navy text-xl font-bold">04</div>
            <div className="tracking-widest">MAX_CREW</div>
          </div>
          <div className="border border-slate-200 bg-white p-3">
            <div className="text-cnv-navy text-xl font-bold">45'</div>
            <div className="tracking-widest">BASE_RUN</div>
          </div>
        </div>
      </div>
    </main>
  )
}
