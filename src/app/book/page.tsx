import { createClient } from '@/lib/supabase/server'
import { BookingClient } from './BookingClient'
import { format, addDays } from 'date-fns'

interface SearchParams { date?: string }

export default async function BookPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const date  = searchParams.date ?? today

  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: config }, { data: bookings }, { data: override }, { data: profile }] = await Promise.all([
    supabase.from('club_config').select('*').eq('id', 1).single(),
    supabase.from('bookings').select('*').eq('date', date).neq('status', 'cancelled').order('start_time'),
    supabase.from('day_overrides').select('*').eq('date', date).maybeSingle(),
    user
      ? supabase.from('profiles').select('full_name').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
  ])

  // Build a 7-day quick-picker
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = addDays(new Date(), i)
    return { date: format(d, 'yyyy-MM-dd'), label: format(d, 'EEE d') }
  })

  if (!config) {
    return (
      <main className="mx-auto max-w-md p-6 pt-16">
        <h1 className="text-xl font-bold">Club not configured</h1>
        <p className="mt-3 text-slate-600 text-sm">
          The <code>club_config</code> row is missing. In the Supabase SQL editor, run:
        </p>
        <pre className="mt-3 rounded bg-slate-100 p-3 text-xs overflow-x-auto">
INSERT INTO public.club_config (id) VALUES (1) ON CONFLICT DO NOTHING;
        </pre>
      </main>
    )
  }

  return (
    <BookingClient
      key={date}
      currentUserId={user?.id ?? null}
      currentUserName={(profile as { full_name?: string } | null)?.full_name ?? null}
      date={date}
      days={days}
      config={config}
      initialBookings={bookings ?? []}
      override={override ?? null}
    />
  )
}
