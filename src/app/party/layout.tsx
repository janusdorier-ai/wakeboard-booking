import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'MCI Summer Challenge',
  description: 'Live party games — Geneva Summer Party',
}

export default function PartyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-600 via-orange-400 to-amber-300 text-slate-900">
      <div className="mx-auto min-h-screen max-w-md px-4 pb-10 pt-6">{children}</div>
    </div>
  )
}
