import { createClient } from '@/lib/supabase/server'
import { AdminClient } from './AdminClient'
import { format, addDays } from 'date-fns'

export default async function AdminPage() {
  const supabase = createClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const horizon = format(addDays(new Date(), 14), 'yyyy-MM-dd')

  const [{ data: config }, { data: bookings }, { data: overrides }] = await Promise.all([
    supabase.from('club_config').select('*').eq('id', 1).single(),
    supabase.from('bookings').select('*').gte('date', today).lte('date', horizon)
      .neq('status', 'cancelled').order('date').order('start_time'),
    supabase.from('day_overrides').select('*').gte('date', today),
  ])

  return <AdminClient config={config!} bookings={bookings ?? []} overrides={overrides ?? []} />
}
