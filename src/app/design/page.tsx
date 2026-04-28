import Link from 'next/link'

export default function DesignIndex() {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-3xl font-bold mb-2">Design directions</h1>
      <p className="text-slate-600 mb-8">Same content, three visual languages. Open each in a new tab and compare.</p>

      <div className="grid gap-4 md:grid-cols-3">
        <Card href="/design/glass" title="A · Lake Glass" tag="Refined" gradient="from-sky-100 via-cyan-100 to-blue-200" copy="Glassmorphism, soft shadows, premium-app energy. Reads as established, refined." />
        <Card href="/design/sunset" title="B · Sunset Session" tag="Social" gradient="from-amber-200 via-pink-300 to-purple-400" copy="Warm gradient, chunky cards, retro wave-rider vibe. Fun, social, Instagrammy." />
        <Card href="/design/deep" title="C · Deep Dive" tag="Technical" gradient="from-slate-900 via-slate-800 to-cyan-900" copy="Dark mode, neon accents, mono numerics. GoPro-edited serious-rider feel." />
      </div>

      <p className="mt-10 text-xs text-slate-500">
        Mockup pages — no auth required, sample data only. Open <Link href="/book" className="underline">/book</Link> for the live app.
      </p>
    </main>
  )
}

function Card({ href, title, tag, gradient, copy }: { href: string; title: string; tag: string; gradient: string; copy: string }) {
  return (
    <Link href={href} className="group block rounded-2xl border border-slate-200 bg-white overflow-hidden hover:shadow-lg transition">
      <div className={`h-32 bg-gradient-to-br ${gradient}`} />
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">{title}</h2>
          <span className="text-xs text-slate-500 font-medium">{tag}</span>
        </div>
        <p className="mt-2 text-sm text-slate-600">{copy}</p>
        <div className="mt-3 text-sm font-semibold text-sky-600 group-hover:translate-x-0.5 transition">Preview →</div>
      </div>
    </Link>
  )
}
