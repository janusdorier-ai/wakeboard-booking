import Link from 'next/link'
import { CnvMark } from '@/components/CnvMark'

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-cnv-navy relative overflow-hidden flex items-center">
      <div className="absolute inset-0 cnv-grid pointer-events-none" />
      <div className="absolute inset-0 cnv-grid-lines pointer-events-none" />

      <div className="relative mx-auto max-w-md p-6 w-full">
        <CnvMark className="h-20 w-auto" />
        <div className="font-mono text-[10px] tracking-[0.3em] text-cnv-navy/70 mt-6">SKI ▸ WAKEBOARD ▸ V1</div>
        <h1 className="text-4xl font-bold mt-2">Slot Console</h1>
        <p className="mt-3 text-slate-600 text-sm">
          Spread your availability. Slots confirm at <span className="text-cnv-navy font-mono font-bold">2+</span> riders,
          extend at <span className="text-cnv-navy font-mono font-bold">3</span> and <span className="text-cnv-navy font-mono font-bold">4</span>,
          and cluster around taken times within <span className="text-cnv-navy font-mono font-bold">24h</span> of the session.
        </p>

        <div className="mt-8 flex flex-col gap-2">
          <Link href="/book"
            className="bg-cnv-navy text-white py-3.5 text-center font-mono font-bold tracking-widest hover:bg-cnv-navy-3">
            ▸ BOOK_A_SLOT
          </Link>
          <Link href="/login"
            className="border border-slate-300 bg-white py-3.5 text-center font-mono text-slate-600 tracking-widest hover:text-cnv-navy hover:border-cnv-navy/40">
            [SIGN_IN]
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-3 gap-2 font-mono text-[10px] text-slate-500">
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
